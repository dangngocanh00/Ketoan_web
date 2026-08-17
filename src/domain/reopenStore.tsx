/**
 * Reopen Phiên đối soát — Cycle lifecycle + Closure Versions (Reopen task).
 * Replaces the earlier "Phiên bổ sung" (Supplement Session) concept
 * entirely: reopening NEVER creates a new business session — it's the SAME
 * `sessionId`/`businessDate`, just with a live "currently reopened" overlay
 * (task §2). Bank Bill storage + Bank↔Facebook reconciliation for reopen
 * data lives in `facebookUploadStore.tsx` (see that file's header for why);
 * THIS store owns only: Reopen Cycle records (who/when/why/deadline/status)
 * and Closure Versions (v2+ — the immutable snapshot produced each time a
 * Reopen Cycle is closed again).
 *
 * The ORIGINAL Closure Snapshot (`sessionHistory.ts`'s frozen
 * `closureSnapshots`, built once at module load from the static generator)
 * is Version 1 forever and is NEVER read, mutated, or recomputed by this
 * file — this store only ever APPENDS new versions on top, keyed by
 * sessionId, and `sessionHistory.ts` has zero import of this module (task
 * §9/10/20).
 *
 * Mounted at the App root, BELOW `facebookUploadStore`/`explanationStore`
 * (both of whose live state this store reads to compute Close Gate status
 * and Closure Versions) and BELOW `notificationStore`/`accountStore` (both
 * of which it writes to / reads from for Reopen notifications).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { sessionsV2, missingBillCases, missingBillRecords } from '../data/sharedData'
import type { SessionV2 } from '../data/mock'
import { isSessionClosed } from './sessionLifecycle'
import { useFacebookUploadStore } from './facebookUploadStore'
import { useExplanationStore } from './explanationStore'
import { useNotificationStore } from './notificationStore'
import { useAccountStore } from './accountStore'
import type { BankFileParseResult } from './bankSupplementParser'
import { computeDueReminders } from './reopenReminders'
import type { TeamReminderGroup } from './reopenReminders'
import type { ClosureSnapshot, ClosureBankBillRow } from './sessionHistory'
import type { ReopenCycle, EffectiveSessionStatus } from './reopenTypes'
import type { Role } from '../auth/types'

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export type ActionResult<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: string }

interface Actor {
  id: string
  name: string
  role: Role
}

function authorizeReopenActor(role: Role): { ok: true } | { ok: false; error: string } {
  if (role !== 'ADMIN' && role !== 'ACCOUNTANT') {
    return { ok: false, error: 'Chỉ Admin/Kế toán mới có quyền thao tác Mở lại phiên.' }
  }
  return { ok: true }
}

export interface ReopenAuditEvent {
  id: string
  type: 'SESSION_REOPENED' | 'REOPEN_BANK_IMPORTED' | 'SESSION_RECLOSED'
  actorId: string
  actorName: string
  actorRole: Role
  sessionId: string
  businessDate: string
  cycleNumber: number
  reason: string
  timestamp: string
}

export interface CloseGateSummary {
  bankAdded: number
  fbAdded: number
  reconciledAdded: number
  explanationApproved: number
  unresolved: number
  pendingApproval: number
  canClose: boolean
  blockReason?: string
}

// §5/48: eligible sessions for the "Phiên cần mở lại" dropdown, scoped to a
// chosen business month — Closed AND not currently in an open Reopen Cycle.
export function listClosedSessionsInMonth(month: string, openSessionIds: ReadonlySet<string>): SessionV2[] {
  return sessionsV2
    .filter(s => s.date.slice(0, 7) === month && isSessionClosed(s.status) && !openSessionIds.has(s.id))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// §44: ownership for a Reopen Bank Bill is resolved from REAL historical
// data for that same session — which CS's already-recorded Bank Bills used
// this same Last 4 — never fabricated. Falls back to the session's sole
// case owner when there's exactly one (common single-CS business date);
// otherwise left unresolved (caller must reject/flag it) — see report.
export function resolveReopenBankOwner(sessionId: string, last4: string): { csId: string; csName: string } | null {
  const casesForSession = missingBillCases.filter(c => c.sessionId === sessionId && c.ownerCsId)
  const caseById = new Map(casesForSession.map(c => [c.id, c]))
  for (const r of missingBillRecords) {
    if (r.last4 !== last4) continue
    const c = caseById.get(r.caseId)
    if (c?.ownerCsId) return { csId: c.ownerCsId, csName: c.cs }
  }
  if (casesForSession.length === 1 && casesForSession[0].ownerCsId) {
    return { csId: casesForSession[0].ownerCsId!, csName: casesForSession[0].cs }
  }
  return null
}

interface ReopenStoreValue {
  cycles: ReopenCycle[]
  closureVersions: Record<string, ClosureSnapshot[]>
  auditEvents: ReopenAuditEvent[]

  isSessionReopened: (sessionId: string) => boolean
  getEffectiveStatus: (session: SessionV2) => EffectiveSessionStatus
  getOpenCycle: (sessionId: string) => ReopenCycle | undefined
  getCyclesForSession: (sessionId: string) => ReopenCycle[]
  getReopenSessionsForCs: (csId: string) => { sessionId: string; sessionDate: string }[]
  getAllReopenedSessions: () => { sessionId: string; sessionDate: string }[]
  getUnresolvedReopenRecordsForCs: (csId: string, sessionId: string, extraResolvedIds: ReadonlySet<string>) => import('./reopenTypes').ReopenBankBill[]
  getCloseGateSummary: (sessionId: string) => CloseGateSummary

  reopenSession: (input: { sessionId: string; deadline: string; reason: string; actor: Actor }) => ActionResult<{ cycleId: string; cycleNumber: number }>
  importBankFile: (input: { sessionId: string; fileName: string; parsed: BankFileParseResult; actor: Actor }) => ActionResult<{ imported: number; duplicates: number; invalidRows: number; unresolvedOwnership: number }>
  recloseSession: (input: { sessionId: string; actor: Actor }) => ActionResult<{ version: number }>
}

const ReopenStoreContext = createContext<ReopenStoreValue | null>(null)

let cycleSeq = 0
let auditSeq = 0
const REMINDER_TICK_MS = 30_000

export function ReopenStoreProvider({ children }: { children: ReactNode }) {
  const [cycles, setCycles] = useState<ReopenCycle[]>([])
  const [closureVersions, setClosureVersions] = useState<Record<string, ClosureSnapshot[]>>({})
  const [auditEvents, setAuditEvents] = useState<ReopenAuditEvent[]>([])
  const [sentReminderKeys, setSentReminderKeys] = useState<ReadonlySet<string>>(new Set())

  const fb = useFacebookUploadStore()
  const explanation = useExplanationStore()
  const notifications = useNotificationStore()
  const { accounts, teams } = useAccountStore()

  const logAudit = useCallback((event: Omit<ReopenAuditEvent, 'id' | 'timestamp'>) => {
    setAuditEvents(prev => [{ ...event, id: `REOPEN-AUDIT-${++auditSeq}`, timestamp: nowStamp() }, ...prev])
  }, [])

  const getOpenCycle = useCallback(
    (sessionId: string) => cycles.find(c => c.sessionId === sessionId && c.status === 'OPEN'),
    [cycles],
  )

  const isSessionReopened = useCallback((sessionId: string) => !!getOpenCycle(sessionId), [getOpenCycle])

  const getEffectiveStatus = useCallback(
    (session: SessionV2): EffectiveSessionStatus => (isSessionReopened(session.id) ? 'reopened' : session.status),
    [isSessionReopened],
  )

  const getCyclesForSession = useCallback(
    (sessionId: string) => cycles.filter(c => c.sessionId === sessionId).sort((a, b) => a.cycleNumber - b.cycleNumber),
    [cycles],
  )

  // Every CS who either originally owned a case in this session OR now owns
  // at least one Reopen Bank Bill in it — the full stakeholder set for a
  // Reopened session (task §24/26: they should see it operationally even
  // with zero current workload).
  const getStakeholderCsIdsForSession = useCallback(
    (sessionId: string): Set<string> => {
      const ids = new Set<string>()
      for (const c of missingBillCases) if (c.sessionId === sessionId && c.ownerCsId) ids.add(c.ownerCsId)
      for (const b of fb.getReopenBankBillsForSession(sessionId)) ids.add(b.ownerCsId)
      return ids
    },
    [fb],
  )

  const getReopenSessionsForCs = useCallback(
    (csId: string): { sessionId: string; sessionDate: string }[] => {
      const rows: { sessionId: string; sessionDate: string }[] = []
      for (const cycle of cycles) {
        if (cycle.status !== 'OPEN') continue
        if (!getStakeholderCsIdsForSession(cycle.sessionId).has(csId)) continue
        const session = sessionsV2.find(s => s.id === cycle.sessionId)
        if (session) rows.push({ sessionId: session.id, sessionDate: session.date })
      }
      return rows
    },
    [cycles, getStakeholderCsIdsForSession],
  )

  // Team-wide list — the equivalent of `bankBills.ts`'s `listActiveSessions()`
  // but for Reopened sessions, used by the Leader "Toàn Team" scope (task
  // §24/29) which needs every operational session regardless of a single CS.
  const getAllReopenedSessions = useCallback(
    (): { sessionId: string; sessionDate: string }[] =>
      cycles
        .filter(c => c.status === 'OPEN')
        .map(c => sessionsV2.find(s => s.id === c.sessionId))
        .filter((s): s is SessionV2 => !!s)
        .map(s => ({ sessionId: s.id, sessionDate: s.date })),
    [cycles],
  )

  const getUnresolvedReopenRecordsForCs = useCallback(
    (csId: string, sessionId: string, extraResolvedIds: ReadonlySet<string>) => {
      const resolved = new Set<string>([...fb.getResolvedBankTxnIds(csId, sessionId), ...extraResolvedIds])
      return fb.getReopenBankBillsForCs(csId, sessionId).filter(r => !resolved.has(r.txnId))
    },
    [fb],
  )

  const getCloseGateSummary = useCallback(
    (sessionId: string): CloseGateSummary => {
      const rows = fb.getReopenBankBillsForSession(sessionId)
      const bankAdded = rows.length
      let unresolved = 0
      let pendingApproval = 0
      let explanationApproved = 0
      let reconciledAdded = 0
      const seenCs = new Set<string>()
      for (const r of rows) {
        seenCs.add(r.ownerCsId)
        const resolvedIds = fb.getResolvedBankTxnIds(r.ownerCsId, sessionId)
        const acceptedIds = explanation.getAcceptedResolvedBillIds(r.ownerCsId, sessionId)
        if (resolvedIds.has(r.txnId)) { reconciledAdded++; continue }
        if (acceptedIds.has(r.txnId)) { explanationApproved++; continue }
        unresolved++
      }
      for (const csId of seenCs) {
        if (explanation.getCase(csId, sessionId)?.status === 'pending') pendingApproval++
      }
      const fbAdded = 0 // Facebook Bills uploaded during this cycle aren't separately tracked by session here; see report limitation.
      const canClose = unresolved === 0 && pendingApproval === 0
      const blockReason = !canClose
        ? [unresolved > 0 ? `${unresolved} bill chưa xử lý` : null, pendingApproval > 0 ? `${pendingApproval} giải trình chờ duyệt` : null].filter(Boolean).join(', ')
        : undefined
      return { bankAdded, fbAdded, reconciledAdded, explanationApproved, unresolved, pendingApproval, canClose, blockReason }
    },
    [fb, explanation],
  )

  // ── Actions ────────────────────────────────────────────────────────────

  const reopenSession = useCallback(
    (input: { sessionId: string; deadline: string; reason: string; actor: Actor }): ActionResult<{ cycleId: string; cycleNumber: number }> => {
      const auth = authorizeReopenActor(input.actor.role)
      if (!auth.ok) return auth
      const session = sessionsV2.find(s => s.id === input.sessionId)
      if (!session) return { ok: false, error: 'Không tìm thấy phiên.' }
      if (!isSessionClosed(session.status)) return { ok: false, error: 'Chỉ có thể mở lại phiên đã đóng.' }
      if (getOpenCycle(input.sessionId)) return { ok: false, error: 'Phiên này đang có một chu kỳ mở lại chưa đóng.' }
      if (!input.reason.trim()) return { ok: false, error: 'Vui lòng nhập lý do mở lại.' }
      const deadlineMs = new Date(input.deadline).getTime()
      if (Number.isNaN(deadlineMs)) return { ok: false, error: 'Hạn xử lý không hợp lệ.' }
      if (deadlineMs <= Date.now()) return { ok: false, error: 'Hạn xử lý phải sau thời điểm hiện tại.' }

      const cycleNumber = getCyclesForSession(input.sessionId).length + 1
      const cycleId = `reopen-${++cycleSeq}`
      const cycle: ReopenCycle = {
        id: cycleId, sessionId: input.sessionId, cycleNumber,
        reopenedAt: nowStamp(), reopenedByUserId: input.actor.id, reopenedByName: input.actor.name, reopenedByRole: input.actor.role,
        reason: input.reason.trim(), deadline: input.deadline, status: 'OPEN',
      }
      setCycles(prev => [...prev, cycle])
      fb.setReopenState(input.sessionId, { cycleId, cycleNumber })

      logAudit({
        type: 'SESSION_REOPENED', actorId: input.actor.id, actorName: input.actor.name, actorRole: input.actor.role,
        sessionId: input.sessionId, businessDate: session.date, cycleNumber, reason: cycle.reason,
      })

      // §12: immediate notification — every relevant CS + their Leader(s),
      // BEFORE any Bank import happens.
      const stakeholderIds = getStakeholderCsIdsForSession(input.sessionId)
      const leaderIds = new Set<string>()
      for (const csId of stakeholderIds) {
        const acc = accounts.find(a => a.userId === csId)
        if (acc?.teamId) {
          const team = teams.find(t => t.teamId === acc.teamId)
          if (team?.leaderUserId) leaderIds.add(team.leaderUserId)
        }
      }
      const message = `Phiên ${session.date.split('-').reverse().join('/')} đã được mở lại. Vui lòng kiểm tra Bill thiếu và bổ sung Bill Facebook nếu có.`
      for (const csId of stakeholderIds) {
        const acc = accounts.find(a => a.userId === csId)
        if (acc && acc.status !== 'active') continue // §45: inactive AezCheck user never gets operational notifications
        notifications.push({ type: 'SESSION_REOPENED', recipientUserId: csId, sessionId: input.sessionId, message })
      }
      for (const leaderId of leaderIds) {
        const acc = accounts.find(a => a.userId === leaderId)
        if (acc && acc.status !== 'active') continue
        notifications.push({ type: 'SESSION_REOPENED', recipientUserId: leaderId, sessionId: input.sessionId, message })
      }

      return { ok: true, cycleId, cycleNumber }
    },
    [getOpenCycle, getCyclesForSession, fb, logAudit, getStakeholderCsIdsForSession, accounts, teams, notifications],
  )

  const importBankFile = useCallback(
    (input: { sessionId: string; fileName: string; parsed: BankFileParseResult; actor: Actor }): ActionResult<{ imported: number; duplicates: number; invalidRows: number; unresolvedOwnership: number }> => {
      const auth = authorizeReopenActor(input.actor.role)
      if (!auth.ok) return auth
      const cycle = getOpenCycle(input.sessionId)
      if (!cycle) return { ok: false, error: 'Phiên chưa được mở lại — không thể bổ sung Bill Bank.' }
      if (!input.parsed.formatOk) return { ok: false, error: `File Bank không đúng định dạng — thiếu cột: ${input.parsed.missingHeaders.join(', ')}` }

      const resolvedRows: { txnId: string; bankDate: string; reference: string; last4: string; amount: number; bankDesc: string; ownerCsId: string; ownerCsName: string }[] = []
      let unresolvedOwnership = 0
      for (const row of input.parsed.rows) {
        const owner = resolveReopenBankOwner(input.sessionId, row.last4)
        if (!owner) { unresolvedOwnership++; continue }
        resolvedRows.push({ ...row, ownerCsId: owner.csId, ownerCsName: owner.csName })
      }

      const result = fb.importReopenBankRows({
        sessionId: input.sessionId, cycleId: cycle.id, fileName: input.fileName,
        uploadedByUserId: input.actor.id, uploadedByName: input.actor.name, rows: resolvedRows,
      })

      const session = sessionsV2.find(s => s.id === input.sessionId)
      logAudit({
        type: 'REOPEN_BANK_IMPORTED', actorId: input.actor.id, actorName: input.actor.name, actorRole: input.actor.role,
        sessionId: input.sessionId, businessDate: session?.date ?? '', cycleNumber: cycle.cycleNumber,
        reason: `Import ${result.imported} Bill Bank từ ${input.fileName}`,
      })

      return { ok: true, imported: result.imported, duplicates: result.duplicates, invalidRows: input.parsed.errors.length, unresolvedOwnership }
    },
    [getOpenCycle, fb, logAudit],
  )

  const recloseSession = useCallback(
    (input: { sessionId: string; actor: Actor }): ActionResult<{ version: number }> => {
      const auth = authorizeReopenActor(input.actor.role)
      if (!auth.ok) return auth
      const cycle = getOpenCycle(input.sessionId)
      if (!cycle) return { ok: false, error: 'Phiên không có chu kỳ mở lại đang mở.' }
      const gate = getCloseGateSummary(input.sessionId)
      if (!gate.canClose) return { ok: false, error: `Không thể đóng phiên: còn ${gate.blockReason}.` }

      const session = sessionsV2.find(s => s.id === input.sessionId)
      const rows = fb.getReopenBankBillsForSession(input.sessionId)
      const closureRows: ClosureBankBillRow[] = rows.map(r => {
        const resolvedIds = fb.getResolvedBankTxnIds(r.ownerCsId, input.sessionId)
        const acceptedIds = explanation.getAcceptedResolvedBillIds(r.ownerCsId, input.sessionId)
        const kind = resolvedIds.has(r.txnId) ? 'fb_matched' : acceptedIds.has(r.txnId) ? 'explanation_resolved' : 'chua_xu_ly'
        const explanationCaseId = kind === 'explanation_resolved' ? explanation.getCase(r.ownerCsId, input.sessionId)?.id : undefined
        return {
          txnId: r.txnId, tkqcId: '', bankDate: r.bankDate, reference: r.reference, last4: r.last4, bankDesc: r.bankDesc, amount: r.amount,
          bankStatus: kind === 'chua_xu_ly' ? 'chua_doi_soat' : 'da_doi_soat',
          kind, explanationCaseId,
        }
      })
      const now = nowStamp()
      const primaryOwner = rows[0]
      const versionsForSession = closureVersions[input.sessionId] ?? []
      const newVersion: ClosureSnapshot = {
        sessionId: input.sessionId,
        sessionDate: session?.date ?? '',
        ownerCsIdAtClosure: primaryOwner?.ownerCsId ?? '',
        ownerCsNameAtClosure: primaryOwner?.ownerCsName ?? '',
        teamNameAtClosure: '',
        closedAt: now,
        totalBankBills: closureRows.length,
        totalBankAmount: Math.round(closureRows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
        fbMatchedCount: closureRows.filter(r => r.kind === 'fb_matched').length,
        explanationResolvedCount: closureRows.filter(r => r.kind === 'explanation_resolved').length,
        unresolvedCount: closureRows.filter(r => r.kind === 'chua_xu_ly').length,
        finalResult: closureRows.some(r => r.kind === 'chua_xu_ly') ? 'con_ngoai_le' : 'hoan_tat',
        rows: closureRows,
        tkqcOwnershipAtClosure: [],
      }
      setClosureVersions(prev => ({ ...prev, [input.sessionId]: [...versionsForSession, newVersion] }))

      setCycles(prev => prev.map(c => (c.id === cycle.id ? { ...c, status: 'CLOSED', closedAt: now, closedByUserId: input.actor.id, closedByName: input.actor.name } : c)))
      fb.setReopenState(input.sessionId, null)

      logAudit({
        type: 'SESSION_RECLOSED', actorId: input.actor.id, actorName: input.actor.name, actorRole: input.actor.role,
        sessionId: input.sessionId, businessDate: session?.date ?? '', cycleNumber: cycle.cycleNumber,
        reason: `Đóng lại phiên — Closure Version ${versionsForSession.length + 2}`,
      })

      return { ok: true, version: versionsForSession.length + 2 } // +2: v1 is sessionHistory's frozen snapshot
    },
    [getOpenCycle, getCloseGateSummary, fb, explanation, closureVersions, logAudit],
  )

  // §14-17: reminder ticker — a lightweight live poll (not a real cron),
  // consistent with this prototype's "no external scheduler" constraint.
  // Recomputes workload FRESH on every tick (never caches a count) and
  // dedupes strictly via `sentReminderKeys` (session+scope+milestone).
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const dueAll: ReturnType<typeof computeDueReminders> = []
      for (const cycle of cycles) {
        if (cycle.status !== 'OPEN') continue
        const stakeholders = [...getStakeholderCsIdsForSession(cycle.sessionId)]
        const byTeam = new Map<string, { leaderId: string | null; teamId: string | null; members: { csId: string; csName: string; missingBills: number }[] }>()
        for (const csId of stakeholders) {
          const acc = accounts.find(a => a.userId === csId)
          if (acc && acc.status !== 'active') continue // §45
          const teamId = acc?.teamId ?? null
          const team = teamId ? teams.find(t => t.teamId === teamId) : undefined
          const groupKey = teamId ?? `none:${csId}`
          if (!byTeam.has(groupKey)) byTeam.set(groupKey, { leaderId: team?.leaderUserId ?? null, teamId, members: [] })
          const missingBills = getUnresolvedReopenRecordsForCs(csId, cycle.sessionId, new Set()).length
          byTeam.get(groupKey)!.members.push({ csId, csName: acc?.fullName ?? csId, missingBills })
        }
        for (const group of byTeam.values()) {
          const reminderGroup: TeamReminderGroup = { sessionId: cycle.sessionId, deadline: cycle.deadline, leaderId: group.leaderId, teamId: group.teamId, members: group.members }
          dueAll.push(...computeDueReminders(now, reminderGroup, sentReminderKeys))
        }
      }
      if (dueAll.length === 0) return
      setSentReminderKeys(prev => {
        const merged = new Set(prev)
        dueAll.forEach(d => merged.add(d.dedupeKey))
        return merged
      })
      for (const d of dueAll) {
        notifications.push({
          type: d.milestone === '24h' ? (d.scope.kind === 'cs' ? 'REMINDER_24H' : 'REMINDER_LEADER_SUMMARY') : (d.scope.kind === 'cs' ? 'REMINDER_12H' : 'REMINDER_LEADER_SUMMARY'),
          recipientUserId: d.recipientUserId, sessionId: d.dedupeKey.split('|')[0], message: d.message,
        })
      }
    }
    const id = setInterval(tick, REMINDER_TICK_MS)
    tick() // also check once immediately on mount/dependency change, not just after the first interval
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles, accounts, teams])

  const value = useMemo<ReopenStoreValue>(
    () => ({
      cycles, closureVersions, auditEvents,
      isSessionReopened, getEffectiveStatus, getOpenCycle, getCyclesForSession, getReopenSessionsForCs, getAllReopenedSessions,
      getUnresolvedReopenRecordsForCs, getCloseGateSummary,
      reopenSession, importBankFile, recloseSession,
    }),
    [cycles, closureVersions, auditEvents, isSessionReopened, getEffectiveStatus, getOpenCycle, getCyclesForSession, getReopenSessionsForCs, getAllReopenedSessions,
      getUnresolvedReopenRecordsForCs, getCloseGateSummary, reopenSession, importBankFile, recloseSession],
  )

  return <ReopenStoreContext.Provider value={value}>{children}</ReopenStoreContext.Provider>
}

export function useReopenStore(): ReopenStoreValue {
  const ctx = useContext(ReopenStoreContext)
  if (!ctx) throw new Error('useReopenStore must be used within a ReopenStoreProvider')
  return ctx
}
