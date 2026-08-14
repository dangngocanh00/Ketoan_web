/**
 * Record-level Bank Bill + TKQC-gap domain logic for Module 2 (Bill thiếu
 * CS/Leader). Two DELIBERATELY separate concerns that must never be mixed
 * (task §13):
 *  - Bank Bill reconciliation state (matched/unmatched) → drives "Bill/Amount
 *    chưa đối soát" everywhere (KPI, table, explanation snapshot).
 *  - TKQC Sheet-spend-vs-Facebook-Bill gap → only ever a hint of WHICH TKQC
 *    to go look for a Bill in. Never feeds back into the Bank Bill numbers.
 */
import { missingBillCases, missingBillRecords, sessionDetails, sessionsV2 } from '../data/sharedData'
import type { MissingBillCase, MissingBillRecord } from '../data/mock'
import { OPEN_STATUSES } from './sessionLifecycle'

const EMPTY_SET: ReadonlySet<string> = new Set()

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function findCase(csId: string, sessionId: string): MissingBillCase | undefined {
  return missingBillCases.find(c => c.ownerCsId === csId && c.sessionId === sessionId)
}

export interface CsOpenSession {
  sessionId: string
  sessionDate: string
}

// §6: the session selector "chỉ list các phiên có liên quan tới CS đang xem"
// — every currently-open session this CS has a case in, whether resolved or
// not, most recent first (so the newest active session is the default).
export function listOpenSessionsForCs(csId: string): CsOpenSession[] {
  const openIds = activeSessionIdSet()
  return missingBillCases
    .filter(c => c.ownerCsId === csId && openIds.has(c.sessionId))
    .map(c => ({ sessionId: c.sessionId, sessionDate: c.sessionDate }))
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
}

function activeSessionIdSet(): Set<string> {
  return new Set(sessionsV2.filter(s => OPEN_STATUSES.includes(s.status)).map(s => s.id))
}

// Team scope has no single CS to scope sessions by — the "Phiên đối soát"
// selector there lists every currently-open session system-wide (still never
// closed/historical — Module Lịch sử's job), most recent first.
export function listActiveSessions(): CsOpenSession[] {
  return sessionsV2
    .filter(s => OPEN_STATUSES.includes(s.status))
    .map(s => ({ sessionId: s.id, sessionDate: s.date }))
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
}

export function isSessionActive(sessionId: string): boolean {
  return activeSessionIdSet().has(sessionId)
}

// The record-level Bank Bill list — §18/19: never derived from
// initialBills-minus-uploaded-FB-count. `mbc.resolvedBankTxnIds` is the
// generator's own record-level "matched via reconciliation" backing (see
// sharedData.ts); `extraResolvedIds` additionally lets a caller (Module 1's
// KPIs, this module's own UI) exclude bills resolved by an ACCEPTED
// explanation attempt, without this file needing to know about the
// explanation store at all.
export function getUnresolvedBankRecords(
  mbc: MissingBillCase | undefined,
  extraResolvedIds: ReadonlySet<string> = EMPTY_SET,
): MissingBillRecord[] {
  if (!mbc) return []
  const resolved = mbc.resolvedBankTxnIds ?? []
  return missingBillRecords.filter(
    r => r.caseId === mbc.id && !resolved.includes(r.txnId) && !extraResolvedIds.has(r.txnId),
  )
}

export interface UnresolvedSummary {
  bills: number
  amount: number
}

export function getUnresolvedSummary(
  mbc: MissingBillCase | undefined,
  extraResolvedIds: ReadonlySet<string> = EMPTY_SET,
): UnresolvedSummary {
  const records = getUnresolvedBankRecords(mbc, extraResolvedIds)
  return { bills: records.length, amount: round2(records.reduce((s, r) => s + r.amount, 0)) }
}

// ── TKQC cần tìm Bill (§10-14) ────────────────────────────────────────────

export interface TkqcGapRow {
  tkqcId: string
  sheetSpend: number
  fbRecorded: number
  gap: number
  hasNoBill: boolean // true = no Facebook Bill recorded at all for this TKQC
}

const SHEET_RATIO = 1.02 // same Sheet-vs-Bank ratio sessionsV2.sheetTotal already uses at session level
const GAP_THRESHOLD = 0.5 // ignore sub-$1 gaps — floating point / rounding noise, not a real "missing Bill"

// §36-40 (TKQC Chạy Chung): this file has NO knowledge of Shared
// Cards/declarations/ownership resolution at all — it just computes a gap
// for whatever `tkqcIds` it's handed. The CALLER (PersonalMissingBills.tsx)
// assembles that list via `useTkqcDeclarationStore().getResolvedTkqcIdsForCs`
// — the CS's own non-shared TKQC (unchanged, task §40) plus any Shared Card
// TKQC currently RESOLVED to them (never Unassigned/Conflict ones, task
// §38/39) — keeping ownership resolution and Sheet-spend math fully
// separate concerns.
//
// `getLiveFbAmount` (Module 3, §40 of the earlier Upload task): FB Bills a
// CS has ALREADY uploaded through facebookUploadStore for a given TKQC/
// session aren't in the static sessionDetails snapshot — the caller supplies
// the live sum per tkqcId so the gap reacts immediately after an upload,
// without this file depending on that store directly.
export function getTkqcGapsForCs(
  tkqcIds: string[],
  sessionId: string,
  getLiveFbAmount: (tkqcId: string) => number = () => 0,
): TkqcGapRow[] {
  const detail = sessionDetails[sessionId]
  if (!detail || tkqcIds.length === 0) return []

  const rows: TkqcGapRow[] = []
  for (const tkqcId of tkqcIds) {
    const bankSide =
      detail.reconciled.filter(r => r.tkqc === tkqcId).reduce((s, r) => s + r.bankAmount, 0) +
      detail.exceptions.filter(r => r.tkqc === tkqcId).reduce((s, r) => s + r.bankAmount, 0) +
      detail.bankUnreconciled.filter(r => r.tkqc === tkqcId).reduce((s, r) => s + r.amount, 0)

    const fbSide =
      detail.reconciled.filter(r => r.tkqc === tkqcId).reduce((s, r) => s + r.fbAmount, 0) +
      detail.exceptions.filter(r => r.tkqc === tkqcId).reduce((s, r) => s + r.fbAmount, 0) +
      detail.fbUnreconciled.filter(r => r.tkqc === tkqcId).reduce((s, r) => s + r.amount, 0) +
      getLiveFbAmount(tkqcId)

    // Sheet spend is an independent client-reported figure — approximated
    // here from the Bank side using the SAME ratio already established at
    // session level (sessionsV2.sheetTotal = bankTotal * 1.02), not a new
    // invented number. A real per-TKQC Sheet feed would replace this later.
    const sheetSpend = round2(bankSide * SHEET_RATIO)
    const fbRecorded = round2(fbSide)
    const gap = round2(sheetSpend - fbRecorded)

    if (gap > GAP_THRESHOLD) rows.push({ tkqcId, sheetSpend, fbRecorded, gap, hasNoBill: fbRecorded <= GAP_THRESHOLD })
  }
  return rows
}
