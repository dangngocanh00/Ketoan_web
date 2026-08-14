/**
 * Module 4 (Lịch sử) — Tab 1 "Phiên đối soát". Immutable Closure Snapshot
 * model + Final Result derivation for CLOSED sessions (task §5-36).
 *
 * Deliberately built from ONLY the static generator output
 * (`missingBillCases` / `missingBillRecords` / `sessionDetails`) and the
 * static explanation SEED (`seedCases()`, called fresh here — never the
 * live, runtime-mutable `explanationStore` Context). This is what makes a
 * Closed session's snapshot immutable (§33/62): nothing in this module can
 * ever be perturbed by a later live action. In practice a Closed session
 * can't receive new uploads/explanations anyway (both stores already gate
 * on the session being open), so this is belt-and-suspenders — architecture
 * that can never regress, not just a coincidence of other guards.
 *
 * No new mock dataset (§35): every number here is read straight from the
 * existing shared arrays; nothing is hard-coded per session/CS.
 */
import { sessionsV2, missingBillCases, missingBillRecords, sessionDetails, fmtDate } from '../data/sharedData'
import type { MissingBillCase } from '../data/mock'
import { isSessionClosed } from './sessionLifecycle'
import { seedCases } from './explanationStore'
import type { ExplanationCaseV2 } from './explanationTypes'
import { captureTkqcOwnershipAtClosure } from './tkqcOwnership'
import type { TkqcOwnershipEntry } from './tkqcOwnership'

// Frozen once, at module load — see file header.
const staticExplanationCases: ExplanationCaseV2[] = seedCases()

function acceptedResolution(csId: string, sessionId: string): { ids: ReadonlySet<string>; caseId: string | null } {
  const c = staticExplanationCases.find(c => c.csId === csId && c.sessionId === sessionId)
  const ids = new Set<string>()
  if (!c) return { ids, caseId: null }
  // §31: only ACCEPTED attempts resolve a Bill — a rejected or still-pending
  // attempt (§17/61) never does, even if it's the case's latest attempt.
  for (const a of c.attempts) if (a.decision === 'accepted') a.billIdsSnapshot.forEach(id => ids.add(id))
  return { ids, caseId: c.id }
}

export function getExplanationCaseDetail(caseId: string): ExplanationCaseV2 | undefined {
  return staticExplanationCases.find(c => c.id === caseId)
}

export type BankBillResolutionKind = 'fb_matched' | 'explanation_resolved' | 'chua_xu_ly'

export interface ClosureFbPair {
  fbBillId: string
  fbDate: string
  fbAmount: number
  fbSourceFile: string
  fbUploadTime: string
}

export interface ClosureBankBillRow {
  txnId: string
  tkqcId: string
  bankDate: string
  reference: string
  last4: string
  bankDesc: string
  amount: number
  // The Bank-side reconciliation label ("Trạng thái bank", task §23) — a
  // DIFFERENT axis from `kind` ("Kết quả xử lý"): whether the raw Bank
  // transaction line itself was ever matched, independent of which
  // mechanism (Facebook match or explanation) eventually resolved it.
  bankStatus: 'chua_doi_soat' | 'da_doi_soat'
  kind: BankBillResolutionKind
  // Only present when kind === 'fb_matched' AND a real paired FB record
  // exists. The legacy "resolved via reconciliation" mechanism (Bank Bills
  // that started out missing and were later supplemented) predates Module
  // 3's canonical Facebook Bill model and has no real per-bill pair in this
  // dataset — see report. Never fabricated; the UI shows a plain note
  // instead when this is undefined.
  fbPair?: ClosureFbPair
  // Only present when kind === 'explanation_resolved'.
  explanationCaseId?: string
}

export type FinalResult = 'hoan_tat' | 'con_ngoai_le'

export interface ClosureSnapshot {
  sessionId: string
  sessionDate: string
  // Session-level ownership — "CS + Session" identity, still the primary
  // key History is organized by (task §9: kept as-is, never removed).
  ownerCsIdAtClosure: string
  ownerCsNameAtClosure: string
  teamNameAtClosure: string
  closedAt: string
  totalBankBills: number
  totalBankAmount: number
  fbMatchedCount: number
  explanationResolvedCount: number
  unresolvedCount: number
  finalResult: FinalResult
  rows: ClosureBankBillRow[]
  // TKQC/Card-level ownership, captured at the SAME time as everything
  // else above — prep for "TKQC Chạy Chung" (task §4/11). Today every
  // entry's ownerCsId always equals `ownerCsIdAtClosure` (the only
  // ownership source that exists yet), but the shape already supports a
  // session whose TKQCs belong to different CS once that module resolves
  // real per-TKQC assignment history — see tkqcOwnership.ts.
  tkqcOwnershipAtClosure: TkqcOwnershipEntry[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function buildClosureSnapshot(mbc: MissingBillCase, session: (typeof sessionsV2)[number]): ClosureSnapshot {
  const ownerCsId = mbc.ownerCsId ?? ''
  const records = missingBillRecords.filter(r => r.caseId === mbc.id)
  const resolvedByMatch = new Set(mbc.resolvedBankTxnIds ?? [])
  const { ids: acceptedIds, caseId: explanationCaseId } = acceptedResolution(ownerCsId, mbc.sessionId)

  // Bank Bills matched from the START (kind='matched' at generation time) —
  // these carry a REAL Bank<->FB pair. Scoped to Module 2's own existing CS
  // boundary (never Admin's separate amount-mismatch "exceptions" bucket —
  // task doesn't ask Module 4 to absorb that, and Module 2 never has either).
  const reconciledForCs = (sessionDetails[mbc.sessionId]?.reconciled ?? []).filter(r => r.cs === mbc.cs)

  const matchedRows: ClosureBankBillRow[] = reconciledForCs.map(r => ({
    txnId: r.bankTxnId, tkqcId: r.tkqc, bankDate: r.bankDate, reference: r.reference, last4: r.last4,
    bankDesc: r.bankDesc, amount: r.bankAmount, bankStatus: 'da_doi_soat', kind: 'fb_matched',
    fbPair: { fbBillId: r.fbBillId, fbDate: r.fbDate, fbAmount: r.fbAmount, fbSourceFile: r.fbSourceFile, fbUploadTime: r.fbUploadTime },
  }))

  // §16 invariant: Total = FB matched + Explanation resolved + Unresolved —
  // each originally-missing record falls into EXACTLY one bucket below (the
  // fb_matched check runs first, so a record can never double-count).
  // `bankStatus` ("Trạng thái bank") is a DIFFERENT axis from `kind` ("Kết
  // quả xử lý") — it only reflects whether the raw Bank transaction was
  // ever matched against a Facebook Bill; an explanation-resolved or still-
  // unresolved Bill never was, from the bank ledger's own perspective, even
  // though it's administratively closed out.
  const missingRows: ClosureBankBillRow[] = records.map(r => {
    if (resolvedByMatch.has(r.txnId)) {
      return { txnId: r.txnId, tkqcId: r.tkqcId, bankDate: r.bankDate, reference: r.reference, last4: r.last4, bankDesc: r.bankDesc, amount: r.amount, bankStatus: 'da_doi_soat', kind: 'fb_matched' }
    }
    if (acceptedIds.has(r.txnId)) {
      return { txnId: r.txnId, tkqcId: r.tkqcId, bankDate: r.bankDate, reference: r.reference, last4: r.last4, bankDesc: r.bankDesc, amount: r.amount, bankStatus: 'chua_doi_soat', kind: 'explanation_resolved', explanationCaseId: explanationCaseId ?? undefined }
    }
    return { txnId: r.txnId, tkqcId: r.tkqcId, bankDate: r.bankDate, reference: r.reference, last4: r.last4, bankDesc: r.bankDesc, amount: r.amount, bankStatus: 'chua_doi_soat', kind: 'chua_xu_ly' }
  })

  const rows = [...matchedRows, ...missingRows]
  const fbMatchedCount = rows.filter(r => r.kind === 'fb_matched').length
  const explanationResolvedCount = rows.filter(r => r.kind === 'explanation_resolved').length
  const unresolvedCount = rows.filter(r => r.kind === 'chua_xu_ly').length
  const totalBankAmount = round2(rows.reduce((s, r) => s + r.amount, 0))

  // TKQC/Card ownership, captured from this SAME set of rows, at this same
  // build pass — never a separate live query (task §4/11).
  const tkqcOwnershipAtClosure = captureTkqcOwnershipAtClosure(
    ownerCsId, mbc.cs, mbc.sessionDate,
    rows.map(r => ({ tkqcId: r.tkqcId, last4: r.last4 })),
  )

  return {
    sessionId: mbc.sessionId,
    sessionDate: mbc.sessionDate,
    ownerCsIdAtClosure: ownerCsId,
    ownerCsNameAtClosure: mbc.cs,
    teamNameAtClosure: mbc.team,
    closedAt: fmtDate(session.closedDate || mbc.sessionDate),
    totalBankBills: rows.length,
    totalBankAmount,
    fbMatchedCount,
    explanationResolvedCount,
    unresolvedCount,
    // §13/14/15: derived ONLY from the closure snapshot's own resolution
    // counts — never from operational display statuses (chua_xu_ly/
    // dang_xu_ly/cho_duyet/ton_dong have no meaning for a Closed session).
    finalResult: unresolvedCount === 0 ? 'hoan_tat' : 'con_ngoai_le',
    rows,
    tkqcOwnershipAtClosure,
  }
}

// Frozen once at module load, exactly like `missingBillCases`/`sessionDetails`
// already are — every CLOSED session's snapshot, computed once and never
// recomputed from a live store (§33/62's immutability, made structural).
export const closureSnapshots: ClosureSnapshot[] = missingBillCases
  .map(mbc => ({ mbc, session: sessionsV2.find(s => s.id === mbc.sessionId) }))
  .filter((x): x is { mbc: MissingBillCase; session: (typeof sessionsV2)[number] } => !!x.session && isSessionClosed(x.session.status))
  .map(({ mbc, session }) => buildClosureSnapshot(mbc, session))

export function getClosureSnapshotsForCs(csId: string): ClosureSnapshot[] {
  return closureSnapshots
    .filter(s => s.ownerCsIdAtClosure === csId)
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
}

export function getClosureSnapshot(csId: string, sessionId: string): ClosureSnapshot | undefined {
  return closureSnapshots.find(s => s.ownerCsIdAtClosure === csId && s.sessionId === sessionId)
}
