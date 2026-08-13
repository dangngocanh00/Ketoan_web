/**
 * Pure domain logic for the CS/Leader "Bảng điều hành" module. No React,
 * no hardcoded dashboard numbers — everything here is derived from the
 * existing shared dataset (sessionsV2 / missingBillCases / explanationCases
 * / auditLog) so Dashboard, Bill thiếu, and History stay consistent once
 * those other modules read from the same source.
 */
import { sessionsV2, missingBillCases, explanationCases, auditLog } from '../data/sharedData'
import type { AuditEntry, MissingBillCase, MissingBillLastActionKind, SessionStatusV2 } from '../data/mock'
import { getUnresolvedSummary } from './bankBills'
import type { LiveExplanationLookup } from './explanationStore'

const EMPTY_IDS: ReadonlySet<string> = new Set()
const NOOP_LIVE: LiveExplanationLookup = {
  isPending: () => false,
  hasAnyAttempt: () => false,
  getResolvedIds: () => EMPTY_IDS,
  getPendingSnapshot: () => null,
}

export type CsDisplayStatus = 'chua_xu_ly' | 'dang_xu_ly' | 'cho_duyet' | 'sap_het_han'
export type TeamMemberStatus = CsDisplayStatus | 'hoan_tat'

const STATUS_PRIORITY: Record<CsDisplayStatus, number> = {
  sap_het_han: 0,
  cho_duyet: 1,
  dang_xu_ly: 2,
  chua_xu_ly: 3,
}

const TEAM_STATUS_PRIORITY: Record<TeamMemberStatus, number> = {
  ...STATUS_PRIORITY,
  hoan_tat: 4,
}

// A session only counts toward the CS/Leader dashboard while it's still
// open for action. Closed/closed_pending sessions (incl. quá hạn cases) are
// history — Module Lịch sử, not this dashboard (see task spec §8, §13, §16).
const OPEN_STATUSES: SessionStatusV2[] = ['active', 'closing_soon']

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function openSessionIds(): Set<string> {
  return new Set(sessionsV2.filter(s => OPEN_STATUSES.includes(s.status)).map(s => s.id))
}

function hasPendingExplanation(csName: string, sessionDate: string) {
  return explanationCases.find(e => e.cs === csName && e.sessionDate === sessionDate) ?? null
}

// A genuine CS action, per §11: derived from the structured lastActionKind
// (set at generation time from actor/action-type — see sharedData.ts), never
// by parsing lastActionDesc text. System detections and Admin/Leader actions
// are never 'cs_*', so they can never flip this to true.
function isCsAction(kind: MissingBillLastActionKind | undefined): boolean {
  return kind === 'cs_upload' || kind === 'cs_explanation_submitted' || kind === 'cs_explanation_rejected'
}

// Amount thiếu is ALWAYS the outstanding Bank-bill amount — record-level
// (see domain/bankBills.ts), never Facebook amount, never a Sheet-spend gap.
function deriveDisplayStatus(
  missingBills: number, hoursRemaining: number, pendingExplanation: boolean, hasAction: boolean,
): CsDisplayStatus {
  if (pendingExplanation) return 'cho_duyet'
  const nearDeadline = hoursRemaining > 0 && hoursRemaining < 6
  if (missingBills > 0 && nearDeadline) return 'sap_het_han'
  return hasAction ? 'dang_xu_ly' : 'chua_xu_ly'
}

export interface CsSessionRow {
  sessionId: string
  sessionDate: string
  status: CsDisplayStatus
  missingBills: number
  missingAmount: number
  explanationPending: boolean
  explanationBills: number
  explanationAmount: number
  deadline: string
  hoursRemaining: number
  lastActionDesc: string
  lastActionKind: MissingBillLastActionKind
  hasAction: boolean
}

export function sortSessionRows<T extends { status: CsDisplayStatus; hoursRemaining: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status], pb = STATUS_PRIORITY[b.status]
    if (pa !== pb) return pa - pb
    return a.hoursRemaining - b.hoursRemaining
  })
}

// Only sessions where this CS still has real workload (missing bills or a
// pending explanation) come back — a fully-resolved session is dropped
// entirely, per spec §13 ("phiên hoàn thành biến khỏi Phiên cần xử lý").
// Matches by ownerCsId (a real user id, set by sharedData.ts's generator) —
// not by display name — per §5's ID-based cross-module relationship; csName
// is only needed for the explanationCases join (that dataset has no CS id).
//
// `live` bridges Module 2's explanationStore (submit/accept/reject) back
// into these numbers — e.g. after an ACCEPT, the accepted Bank Bills stop
// counting as missing, and if that clears the case entirely the session
// drops off "Phiên cần xử lý" here automatically (task §50/72). Pure/optional
// so this module stays store-agnostic; callers without a live store (or old
// call sites) get byte-identical behavior to before via the no-op default.
export function getCsSessionRows(csId: string, csName: string, live: LiveExplanationLookup = NOOP_LIVE): CsSessionRow[] {
  const openIds = openSessionIds()
  const rows: CsSessionRow[] = []
  for (const mbc of missingBillCases) {
    if (mbc.ownerCsId !== csId || !openIds.has(mbc.sessionId)) continue
    const staticPending = hasPendingExplanation(csName, mbc.sessionDate)
    const livePending = live.isPending(mbc.sessionId)
    const pendingExplanation = !!staticPending || livePending
    const { bills: missingBills, amount: missingAmount } = getUnresolvedSummary(mbc, live.getResolvedIds(mbc.sessionId))
    if (missingBills <= 0 && !pendingExplanation) continue
    const liveSnapshot = livePending ? live.getPendingSnapshot(mbc.sessionId) : null
    const hasAction = isCsAction(mbc.lastActionKind) || live.hasAnyAttempt(mbc.sessionId)
    rows.push({
      sessionId: mbc.sessionId,
      sessionDate: mbc.sessionDate,
      status: deriveDisplayStatus(missingBills, mbc.hoursRemaining, pendingExplanation, hasAction),
      missingBills,
      missingAmount,
      explanationPending: pendingExplanation,
      explanationBills: liveSnapshot?.bills ?? staticPending?.bills ?? missingBills,
      explanationAmount: liveSnapshot?.amount ?? (staticPending ? round2(staticPending.totalAmount) : missingAmount),
      deadline: mbc.processingDeadline,
      hoursRemaining: mbc.hoursRemaining,
      lastActionDesc: mbc.lastActionDesc,
      lastActionKind: mbc.lastActionKind ?? 'none',
      hasAction,
    })
  }
  return sortSessionRows(rows)
}

// Every open session this CS had a case in at all, whether resolved or not —
// used for the Team table's "Phiên active" column (§38 keeps completed
// members visible with their real active-session count, not 0).
export function countOpenCaseSessions(csId: string): number {
  const openIds = openSessionIds()
  return missingBillCases.filter(c => c.ownerCsId === csId && openIds.has(c.sessionId)).length
}

export interface PersonalKpis {
  sessionsInProgress: number
  missingBills: number
  missingAmount: number
  pendingExplanationCases: number
  pendingExplanationBills: number
  pendingExplanationAmount: number
  nearDeadlineSessions: number
  nearestDeadlineHours: number | null
}

export function getPersonalKpis(rows: CsSessionRow[]): PersonalKpis {
  const pendingRows = rows.filter(r => r.explanationPending)
  const nearRows = rows.filter(r => r.status === 'sap_het_han')
  return {
    sessionsInProgress: rows.length,
    missingBills: rows.reduce((s, r) => s + r.missingBills, 0),
    missingAmount: round2(rows.reduce((s, r) => s + r.missingAmount, 0)),
    pendingExplanationCases: pendingRows.length,
    pendingExplanationBills: pendingRows.reduce((s, r) => s + r.explanationBills, 0),
    pendingExplanationAmount: round2(pendingRows.reduce((s, r) => s + r.explanationAmount, 0)),
    nearDeadlineSessions: nearRows.length,
    nearestDeadlineHours: nearRows.length ? Math.min(...nearRows.map(r => r.hoursRemaining)) : null,
  }
}

export type TodoPriority = 1 | 2 | 3 | 4

export interface TodoItem {
  key: string
  priority: TodoPriority
  hoursRemaining: number
  title: string
  sessionId: string
  sessionDate: string
  detail: string
  actionLabel: string
}

// §26 priority: P1 rejected explanation, P2 sắp hết hạn, P3/P4 chưa xử lý
// (P3 = the most recent open session, read as "mới phát sinh"; P4 = older
// ones). The shared dataset has no true detected-at delta to tell a genuinely
// NEW missing bill apart from a long-standing untouched one, so "most recent
// session date" is the closest honest proxy — see task report for this caveat.
export function getTodoItems(rows: CsSessionRow[]): TodoItem[] {
  const mostRecentDate = rows.reduce((max, r) => (r.sessionDate > max ? r.sessionDate : max), '')
  const items: TodoItem[] = []

  for (const row of rows) {
    if (row.lastActionKind === 'cs_explanation_rejected') {
      items.push({
        key: `reject-${row.sessionId}`,
        priority: 1,
        hoursRemaining: row.hoursRemaining,
        title: 'Giải trình cần bổ sung',
        sessionId: row.sessionId,
        sessionDate: row.sessionDate,
        detail: `${row.missingBills} Bill · ${row.lastActionDesc}`,
        actionLabel: 'Xem lý do',
      })
    } else if (row.status === 'sap_het_han') {
      items.push({
        key: `urgent-${row.sessionId}`,
        priority: 2,
        hoursRemaining: row.hoursRemaining,
        title: 'Sắp hết hạn',
        sessionId: row.sessionId,
        sessionDate: row.sessionDate,
        detail: `Còn ${row.missingBills} Bill`,
        actionLabel: 'Xử lý ngay',
      })
    } else if (row.status === 'chua_xu_ly') {
      const isNewest = row.sessionDate === mostRecentDate
      items.push({
        key: `new-${row.sessionId}`,
        priority: isNewest ? 3 : 4,
        hoursRemaining: row.hoursRemaining,
        title: isNewest ? 'Bill thiếu mới phát sinh' : 'Bill thiếu chưa xử lý',
        sessionId: row.sessionId,
        sessionDate: row.sessionDate,
        detail: `${row.missingBills} Bill`,
        actionLabel: 'Tìm Bill',
      })
    }
  }

  return items
    .sort((a, b) => a.priority - b.priority || a.hoursRemaining - b.hoursRemaining)
    .slice(0, 5)
}

function mentionsCs(entry: AuditEntry, csName: string): boolean {
  return entry.actor === csName || entry.target === csName || entry.detail.startsWith(`${csName} `) || entry.detail.startsWith(`${csName}·`)
}

export function getCsRecentActivity(csName: string, limit = 8): AuditEntry[] {
  return auditLog.filter(e => mentionsCs(e, csName)).slice(0, limit)
}

// ── Team roll-up (Leader / Toàn Team) ────────────────────────────────────────

export interface TeamMemberRow {
  csId: string
  name: string
  status: TeamMemberStatus
  activeSessions: number
  missingBills: number
  missingAmount: number
  pendingExplanation: number
  nearestDeadlineHours: number | null
  lastActionDesc: string
}

export function getTeamMemberRows(
  members: { id: string; name: string }[],
  getLiveLookup: (csId: string) => LiveExplanationLookup = () => NOOP_LIVE,
): TeamMemberRow[] {
  return members.map(m => {
    const rows = getCsSessionRows(m.id, m.name, getLiveLookup(m.id)) // already sorted worst-first
    const activeSessions = countOpenCaseSessions(m.id)
    if (rows.length === 0) {
      const recent = getCsRecentActivity(m.name, 1)[0]
      const time = recent?.timestamp.split(' ')[1]
      return {
        csId: m.id,
        name: m.name,
        status: 'hoan_tat',
        activeSessions,
        missingBills: 0,
        missingAmount: 0,
        pendingExplanation: 0,
        nearestDeadlineHours: null,
        lastActionDesc: recent ? `${recent.action}${time ? ` lúc ${time}` : ''}` : 'Chưa có hoạt động',
      }
    }
    const worst = rows[0]
    return {
      csId: m.id,
      name: m.name,
      status: worst.status,
      activeSessions,
      missingBills: rows.reduce((s, r) => s + r.missingBills, 0),
      missingAmount: round2(rows.reduce((s, r) => s + r.missingAmount, 0)),
      pendingExplanation: rows.filter(r => r.explanationPending).length,
      nearestDeadlineHours: Math.min(...rows.map(r => r.hoursRemaining)),
      lastActionDesc: worst.lastActionDesc,
    }
  })
}

export function sortTeamRows(rows: TeamMemberRow[]): TeamMemberRow[] {
  return [...rows].sort((a, b) => {
    const pa = TEAM_STATUS_PRIORITY[a.status], pb = TEAM_STATUS_PRIORITY[b.status]
    if (pa !== pb) return pa - pb
    const ha = a.nearestDeadlineHours ?? Infinity
    const hb = b.nearestDeadlineHours ?? Infinity
    return ha - hb
  })
}

export interface TeamKpis {
  totalMembers: number
  membersWithMissing: number
  totalMissingBills: number
  totalMissingAmount: number
  pendingExplanationCsCount: number
  nearDeadlineCsCount: number
  notStartedCsCount: number
}

export function getTeamKpis(rows: TeamMemberRow[]): TeamKpis {
  return {
    totalMembers: rows.length,
    membersWithMissing: rows.filter(r => r.missingBills > 0).length,
    totalMissingBills: rows.reduce((s, r) => s + r.missingBills, 0),
    totalMissingAmount: round2(rows.reduce((s, r) => s + r.missingAmount, 0)),
    pendingExplanationCsCount: rows.filter(r => r.pendingExplanation > 0).length,
    nearDeadlineCsCount: rows.filter(r => r.status === 'sap_het_han').length,
    notStartedCsCount: rows.filter(r => r.status === 'chua_xu_ly').length,
  }
}

export function getTeamRecentActivity(memberNames: string[], limit = 5): AuditEntry[] {
  return auditLog.filter(e => memberNames.some(name => mentionsCs(e, name))).slice(0, limit)
}
