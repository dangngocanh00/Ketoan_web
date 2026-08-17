/**
 * Shared types for the Reopen Phiên đối soát feature — kept in their own
 * file (no store imports) so both `facebookUploadStore.tsx` (which owns the
 * live Bank↔Facebook reconciliation state, including reopen Bank Bills —
 * see that file's header) and `reopenStore.tsx` (which owns Reopen Cycle
 * lifecycle + Closure Versions) can import these types without creating a
 * circular module dependency between the two stores.
 */
import type { Role } from '../auth/types'
import type { SessionStatusV2 } from '../data/mock'

// A session's status as actually DISPLAYED/operated on right now — distinct
// from `SessionV2.status` (the frozen, generator-time value in
// `sharedData.ts`, which never changes). `sessionsV2` is never mutated (see
// sessionHistory.ts's header) — Reopen is a LIVE overlay on top of it, never
// a rewrite of the static field. `'reopened'` only ever appears in THIS
// computed type, never in the raw `SessionV2.status` value itself.
export type EffectiveSessionStatus = SessionStatusV2 | 'reopened'

export type ReopenCycleStatus = 'OPEN' | 'CLOSED'

export interface ReopenCycle {
  id: string
  sessionId: string
  cycleNumber: number
  reopenedAt: string
  reopenedByUserId: string
  reopenedByName: string
  reopenedByRole: Role
  reason: string
  deadline: string // ISO-ish datetime-local string, e.g. "2026-08-17T18:00"
  status: ReopenCycleStatus
  closedAt?: string
  closedByUserId?: string
  closedByName?: string
}

// Structurally a superset of `MissingBillRecord` (src/data/mock.ts) — same
// field names for the columns Module 2's existing "Bill Bank chưa đối soát"
// table already renders (bankDate/reference/last4/amount/bankDesc), so a
// Reopen Bank Bill can be pushed into that EXISTING table with zero
// component changes (see PersonalMissingBills.tsx's integration). Also
// satisfies `ReconcilableBankRecord` (reconciliationEngine.ts) directly.
export interface ReopenBankBill {
  id: string
  cycleId: string
  sessionId: string
  txnId: string
  bankDate: string
  reference: string
  last4: string
  amount: number
  bankDesc: string
  ownerCsId: string
  ownerCsName: string
  sourceFileName: string
  uploadedByUserId: string
  uploadedByName: string
  uploadedAt: string
}
