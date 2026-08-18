import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { allExplanationCasesRaw, missingBillRecords, sessionsV2, sharedUsers, teamById } from '../data/sharedData'
import { findCase, getUnresolvedBankRecords } from './bankBills'
import { isSessionClosed } from './sessionLifecycle'
import { useFacebookUploadStore } from './facebookUploadStore'
import type { EvidenceImage, ExplanationCase } from '../data/mock'
import type { ExplanationAttempt, ExplanationCaseV2, ExplanationReason } from './explanationTypes'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Seeds the Module 2 case+attempt model from the EXISTING demo explanation
// history (Nam pending, Trang rejected, ~15 historical ones) — same csId /
// sessionId identities as the rest of the app, never a duplicate dataset.
// This legacy data predates the Bank-txn-id snapshot model, so its
// billIdsSnapshot is resolved by matching each billList entry's `reference`
// against missingBillRecords (same source txns, same ref strings — the same
// approach Admin's own ApprovalDetailPage already relies on) rather than
// left empty, so Admin/Kế toán's detail view — which now reads straight from
// this store — keeps showing the real Bank Bill snapshot for these too.
function resolveLegacyBillIds(raw: ExplanationCase): string[] {
  return raw.billList
    .map(b => missingBillRecords.find(r => r.reference === b.reference)?.txnId)
    .filter((id): id is string => !!id)
}

// Exported for sessionHistory.ts (Module 4) — a second, independent call
// reads the SAME static seed data and produces a structurally-identical
// array; pure/deterministic, so this never needs to share state with the
// live Context's `cases`.
export function seedCases(): ExplanationCaseV2[] {
  const dateToSessionId = Object.fromEntries(sessionsV2.map(s => [s.date, s.id]))
  const cases: ExplanationCaseV2[] = []
  for (const raw of allExplanationCasesRaw) {
    const user = sharedUsers.find(u => u.full_name === raw.cs)
    const sessionId = dateToSessionId[raw.sessionDate]
    if (!user || !sessionId) continue
    const reasons = raw.reasons.filter((r): r is ExplanationReason => r === 'acc_die' || r === 'no_share' || r === 'back')
    const attempt: ExplanationAttempt = {
      attemptNo: 1,
      createdAt: raw.submittedAt,
      reasons,
      note: raw.otherReason ?? '',
      evidence: raw.evidenceImages,
      billIdsSnapshot: resolveLegacyBillIds(raw),
      billCountSnapshot: raw.bills,
      amountSnapshot: raw.totalAmount,
      decision: raw.status,
      reviewedAt: raw.status !== 'pending' ? raw.submittedAt : undefined,
      reviewedBy: raw.status !== 'pending' ? 'Kế toán' : undefined,
      rejectReason: raw.status === 'rejected' ? 'Bằng chứng chưa thể hiện rõ tài khoản/lý do giải trình.' : undefined,
    }
    cases.push({
      id: `exp-${user.user_id}-${sessionId}`,
      sessionId,
      sessionDate: raw.sessionDate,
      csId: user.user_id,
      csName: user.full_name,
      teamName: teamById[user.team_id]?.team_name ?? raw.team,
      status: attempt.decision,
      attempts: [attempt],
    })
  }
  return cases
}

export interface SubmitExplanationInput {
  csId: string
  csName: string
  teamName: string
  sessionId: string
  sessionDate: string
  reasons: ExplanationReason[]
  note: string
  evidence: EvidenceImage[]
  // Chọn Bill khi giải trình task: the CS's explicit selection (Bank txn
  // ids) for THIS session — never "every unresolved bill of the session".
  // The store still independently intersects this against the CURRENT
  // unresolved set below (defense-in-depth, never trusts the caller alone).
  billIds: string[]
}

export interface ReviewExplanationInput {
  csId: string
  sessionId: string
  decision: 'accepted' | 'rejected'
  reviewedBy: string
  rejectReason?: string
}

export type StoreResult = { ok: true } | { ok: false; error: string }

// What Module 1's csWorkload.ts (store-agnostic, pure) needs from this
// store for one CS+session — bound once per csId by getLookup() below so
// callers don't wire three separate closures by hand.
export interface LiveExplanationLookup {
  isPending: (sessionId: string) => boolean
  hasAnyAttempt: (sessionId: string) => boolean
  getResolvedIds: (sessionId: string) => ReadonlySet<string>
  getPendingSnapshot: (sessionId: string) => { bills: number; amount: number } | null
}

interface ExplanationStoreValue {
  cases: ExplanationCaseV2[]
  getCase: (csId: string, sessionId: string) => ExplanationCaseV2 | undefined
  isLockedForUpload: (csId: string, sessionId: string) => boolean
  getAcceptedResolvedBillIds: (csId: string, sessionId: string) => ReadonlySet<string>
  submit: (input: SubmitExplanationInput) => StoreResult
  review: (input: ReviewExplanationInput) => StoreResult
  getLookup: (csId: string) => LiveExplanationLookup
}

const ExplanationStoreContext = createContext<ExplanationStoreValue | null>(null)

// Mounted once above the whole CS/Leader branch (see App.tsx) — same tree as
// CsScopeProvider — so a submission made from Module 2 is immediately visible
// to Module 1's Dashboard without a page reload.
export function ExplanationStoreProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<ExplanationCaseV2[]>(seedCases)
  // Reopen task §32: explanation is reused AS-IS for Reopen's unresolved
  // Reopen Bank Bills — no separate explanation type. Needs read access to
  // the live Bank↔FB reconciliation state (which owns Reopen Bank Bills —
  // see facebookUploadStore.tsx's header) to (a) know a session currently
  // Reopened is NOT actually closed for explanation purposes, and (b) fold
  // Reopen Bank Bills into the "still unresolved" computation below.
  const fb = useFacebookUploadStore()

  const getCase = useCallback(
    (csId: string, sessionId: string) => cases.find(c => c.csId === csId && c.sessionId === sessionId),
    [cases],
  )

  // §43: pending explanation locks "Bổ sung Bill Facebook" for THAT session
  // only — snapshot under Admin/Kế toán review must not shift mid-flight.
  const isLockedForUpload = useCallback(
    (csId: string, sessionId: string) => getCase(csId, sessionId)?.status === 'pending',
    [getCase],
  )

  const getAcceptedResolvedBillIds = useCallback(
    (csId: string, sessionId: string): ReadonlySet<string> => {
      const c = getCase(csId, sessionId)
      const ids = new Set<string>()
      if (!c) return ids
      for (const a of c.attempts) if (a.decision === 'accepted') a.billIdsSnapshot.forEach(id => ids.add(id))
      return ids
    },
    [getCase],
  )

  const submit = useCallback(
    (input: SubmitExplanationInput): StoreResult => {
      const existing = cases.find(c => c.csId === input.csId && c.sessionId === input.sessionId)
      if (existing?.status === 'pending') {
        return { ok: false, error: 'Đã có giải trình đang chờ duyệt cho phiên này.' }
      }
      const session = sessionsV2.find(s => s.id === input.sessionId)
      // A session Reopened right now is NOT closed for this purpose, even
      // though its underlying static `session.status` is still literally
      // 'closed'/'closed_pending' — see sessionLifecycle.ts's
      // `isSessionOperational` comment.
      if (session && isSessionClosed(session.status) && !fb.isSessionReopened(input.sessionId)) {
        return { ok: false, error: 'Phiên đã đóng. Không thể gửi giải trình mới.' }
      }
      if (input.reasons.length === 0) return { ok: false, error: 'Vui lòng chọn ít nhất 1 lý do.' }
      if (input.evidence.length === 0) return { ok: false, error: 'Vui lòng đính kèm ít nhất 1 ảnh bằng chứng.' }

      const mbc = findCase(input.csId, input.sessionId)
      const acceptedIds = existing
        ? (() => {
            const ids = new Set<string>()
            for (const a of existing.attempts) if (a.decision === 'accepted') a.billIdsSnapshot.forEach(id => ids.add(id))
            return ids
          })()
        : new Set<string>()
      // Always recompute fresh at the moment of submit — the store can never
      // submit a stale snapshot even if the UI's own revalidation (§37) were
      // somehow skipped. Reopen task §27/32: also fold in any Reopen Bank
      // Bills for this CS+session not yet matched via Facebook upload —
      // the SAME explanation flow, never a separate Reopen-specific one.
      const reopenResolvedIds = fb.getResolvedBankTxnIds(input.csId, input.sessionId)
      const reopenUnresolved = fb.getReopenBankBillsForCs(input.csId, input.sessionId).filter(
        r => !acceptedIds.has(r.txnId) && !reopenResolvedIds.has(r.txnId),
      )
      const unresolved = [...getUnresolvedBankRecords(mbc, acceptedIds), ...reopenUnresolved]
      // Chọn Bill khi giải trình task §7/8: the scope of THIS attempt is
      // ONLY `input.billIds` — never "every unresolved bill of the
      // session". Intersected against the freshly-recomputed `unresolved`
      // set above so a bill that stopped being eligible (already matched,
      // or picked up by a since-accepted explanation) between the CS's
      // selection and this call can never sneak into the snapshot, even if
      // the caller's own pre-submit revalidation were somehow skipped.
      const selectedIds = new Set(input.billIds)
      const selected = unresolved.filter(r => selectedIds.has(r.txnId))
      if (selected.length === 0) {
        return { ok: false, error: 'Các Bill đã chọn không còn đủ điều kiện giải trình.' }
      }

      const attempt: ExplanationAttempt = {
        attemptNo: (existing?.attempts.length ?? 0) + 1,
        createdAt: nowStamp(),
        reasons: input.reasons,
        note: input.note,
        evidence: input.evidence,
        billIdsSnapshot: selected.map(r => r.txnId),
        billCountSnapshot: selected.length,
        amountSnapshot: round2(selected.reduce((s, r) => s + r.amount, 0)),
        decision: 'pending',
      }

      setCases(prev => {
        const idx = prev.findIndex(c => c.csId === input.csId && c.sessionId === input.sessionId)
        if (idx === -1) {
          return [
            ...prev,
            {
              id: `exp-${input.csId}-${input.sessionId}`,
              sessionId: input.sessionId,
              sessionDate: input.sessionDate,
              csId: input.csId,
              csName: input.csName,
              teamName: input.teamName,
              status: 'pending',
              attempts: [attempt],
            },
          ]
        }
        const next = [...prev]
        next[idx] = { ...next[idx], status: 'pending', attempts: [...next[idx].attempts, attempt] }
        return next
      })
      return { ok: true }
    },
    [cases, fb],
  )

  const review = useCallback(
    (input: ReviewExplanationInput): StoreResult => {
      // Determine ok/error synchronously from the closure's `cases` (like
      // `submit` does) — setCases' updater callback isn't guaranteed to run
      // before this function returns, so the verdict can never be read back
      // out of it.
      const existing = cases.find(c => c.csId === input.csId && c.sessionId === input.sessionId)
      const lastIdx = (existing?.attempts.length ?? 0) - 1
      if (!existing || lastIdx < 0 || existing.attempts[lastIdx].decision !== 'pending') {
        return { ok: false, error: 'Không tìm thấy giải trình đang chờ duyệt.' }
      }

      setCases(prev => {
        const idx = prev.findIndex(c => c.csId === input.csId && c.sessionId === input.sessionId)
        if (idx === -1) return prev
        const c = prev[idx]
        const li = c.attempts.length - 1
        if (li < 0 || c.attempts[li].decision !== 'pending') return prev
        const attempts = [...c.attempts]
        attempts[li] = {
          ...attempts[li],
          decision: input.decision,
          reviewedAt: nowStamp(),
          reviewedBy: input.reviewedBy,
          rejectReason: input.decision === 'rejected' ? input.rejectReason : undefined,
        }
        const next = [...prev]
        next[idx] = { ...c, status: input.decision, attempts }
        return next
      })
      return { ok: true }
    },
    [cases],
  )

  const getLookup = useCallback(
    (csId: string): LiveExplanationLookup => ({
      isPending: (sessionId: string) => getCase(csId, sessionId)?.status === 'pending',
      hasAnyAttempt: (sessionId: string) => (getCase(csId, sessionId)?.attempts.length ?? 0) > 0,
      getResolvedIds: (sessionId: string) => getAcceptedResolvedBillIds(csId, sessionId),
      getPendingSnapshot: (sessionId: string) => {
        const c = getCase(csId, sessionId)
        const last = c?.attempts[c.attempts.length - 1]
        if (last?.decision === 'pending') return { bills: last.billCountSnapshot, amount: last.amountSnapshot }
        return null
      },
    }),
    [getCase, getAcceptedResolvedBillIds],
  )

  const value = useMemo<ExplanationStoreValue>(
    () => ({ cases, getCase, isLockedForUpload, getAcceptedResolvedBillIds, submit, review, getLookup }),
    [cases, getCase, isLockedForUpload, getAcceptedResolvedBillIds, submit, review, getLookup],
  )

  return <ExplanationStoreContext.Provider value={value}>{children}</ExplanationStoreContext.Provider>
}

export function useExplanationStore(): ExplanationStoreValue {
  const ctx = useContext(ExplanationStoreContext)
  if (!ctx) throw new Error('useExplanationStore must be used within an ExplanationStoreProvider')
  return ctx
}

// ── Admin/Kế toán compatibility adapter ──────────────────────────────────────
//
// Task requirement: CS submit → shared explanation data → Admin/Kế toán's
// EXISTING review UI (src/pages/MissingBills.tsx) must see the SAME case,
// without redesigning that UI. Its components already expect the legacy flat
// `ExplanationCase` shape (mock.ts) — this maps the new case+attempt model
// onto that exact shape from the LATEST attempt, so the existing list/detail
// components can keep consuming it unmodified. `billList` is resolved from
// missingBillRecords via the attempt's real billIdsSnapshot, so Admin's own
// by-reference lookups (see ApprovalDetailPage) resolve to the SAME Bank Bill
// identities the CS actually submitted — no separate/duplicated list.
export function toLegacyExplanationCase(c: ExplanationCaseV2): ExplanationCase {
  const attempt = c.attempts[c.attempts.length - 1]
  const billList = attempt.billIdsSnapshot
    .map(txnId => missingBillRecords.find(r => r.txnId === txnId))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map(r => ({ id: r.id, tkqcId: r.tkqcId, last4: r.last4, reference: r.reference, amount: r.amount }))
  return {
    id: c.id,
    caseId: c.id,
    cs: c.csName,
    team: c.teamName,
    sessionDate: c.sessionDate,
    bills: attempt.billCountSnapshot,
    totalAmount: attempt.amountSnapshot,
    reasons: attempt.reasons,
    otherReason: attempt.note || undefined,
    submittedAt: attempt.createdAt,
    waitingDuration: attempt.decision === 'pending' ? '—' : '',
    evidenceImages: attempt.evidence,
    billList,
  }
}
