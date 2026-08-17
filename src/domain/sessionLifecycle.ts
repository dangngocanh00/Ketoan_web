/**
 * Canonical session lifecycle (task Module 4 §1-4). Exactly two concepts,
 * kept deliberately independent:
 *
 *  - CLOSED vs OPERATIONAL — a lifecycle state, decided ONLY by
 *    `SessionV2.status` (never by comparing a deadline to "now"). Every
 *    other domain module (csWorkload.ts, bankBills.ts, sessionHistory.ts)
 *    imports `isSessionClosed`/`OPEN_STATUSES` from HERE instead of each
 *    keeping its own copy, so there is exactly one place that can ever
 *    answer "is this session Closed".
 *  - OVERDUE — a purely operational/display signal (deadline passed) that
 *    says nothing about lifecycle. A session can be overdue and still
 *    wide open ("Còn tồn đọng") — see csWorkload.ts's `deriveDisplayStatus`.
 *    Overdue must NEVER promote a session into Closed/History.
 */
import type { SessionStatusV2 } from '../data/mock'

// Only these two statuses are "not yet Closed" — still part of the live
// operational workflow (Dashboard/Bill thiếu/Upload), regardless of how
// close to (or past) their deadline they are.
export const OPEN_STATUSES: SessionStatusV2[] = ['active', 'closing_soon']

export function isSessionClosed(status: SessionStatusV2): boolean {
  return status === 'closed' || status === 'closed_pending'
}

// A Reopened session is a THIRD, distinct branch — not `isSessionClosed`
// (it must keep accepting Bank/FB/explanation actions) and not itself one of
// `OPEN_STATUSES` either (its underlying static `SessionV2.status` is still
// literally 'closed'/'closed_pending' — only the LIVE Reopen Cycle makes it
// operational again, see reopenTypes.ts's `EffectiveSessionStatus`/
// facebookUploadStore.tsx's `isSessionReopened`). Callers that mean "CS still
// has actionable workload here" should check `OPEN_STATUSES.includes(status)
// || isReopened`, not `!isSessionClosed(status)` — a Closed-and-not-reopened
// session must stay in History, never fall back into "operational" by
// double negative.
export function isSessionOperational(status: SessionStatusV2, isReopened: boolean): boolean {
  return OPEN_STATUSES.includes(status) || isReopened
}

// Deadline has passed. Purely a time signal — callers decide what to DO
// with it (csWorkload.ts only turns this into "Còn tồn đọng" for sessions
// that are also still open AND still have real unresolved workload).
export function isOverdue(hoursRemaining: number): boolean {
  return hoursRemaining <= 0
}
