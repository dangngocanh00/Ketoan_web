/**
 * Data retention domain CONTRACT ONLY (Settings > Đối soát — "Thời gian lưu
 * dữ liệu đối soát" task). NOTHING in this file scans, schedules, or
 * deletes anything, and nothing else in the app calls it yet — it exists so
 * the fixed business rule below is written down in ONE place for the
 * future backend cleanup worker to implement against, instead of being
 * re-decided (or drifting) when that worker gets built.
 *
 * SCOPE (task §8): this rule only ever applies to a business session's Bank
 * Bill data, Facebook Bill data, and reconciliation detail data. Audit Log,
 * Historical Snapshot, Reports, and Explanation Evidence are explicitly OUT
 * of scope — those get their own retention rule in a future spec, never
 * this one.
 *
 * Fixed rule:
 *  - ACTIVE or REOPENED data is NEVER eligible for deletion, regardless of
 *    age (task §7) — checked first, before any date math.
 *  - Otherwise, eligibility is "days since the MOST RECENT close (the
 *    session's original close, OR — if it was ever Reopened — the latest
 *    Reclose) >= the configured retention days" (task §6). A Reopen +
 *    Reclose always resets the clock to the NEW close; the original
 *    closedAt is never reused once a later Reclose exists.
 */
import type { EffectiveSessionStatus } from './reopenTypes'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface RetentionEligibilityInput {
  // The session's CURRENT effective status (task §7's "ACTIVE hoặc
  // REOPENED" protection reads this, never the frozen static status alone).
  effectiveStatus: EffectiveSessionStatus
  // Epoch ms of the session's MOST RECENT close — the original close if
  // never Reopened, or the latest Reclose's timestamp otherwise (task §6).
  // null = never closed (should be unreachable for anything but an active
  // session, since eligibility already requires a closed effective status).
  lastClosedAtMs: number | null
  retentionDays: number
  // Caller-supplied "now" so this stays pure/testable — never reads
  // Date.now() itself.
  nowMs: number
}

export function isEligibleForRetentionDeletion(input: RetentionEligibilityInput): boolean {
  // §7: ACTIVE/REOPENED protection wins over everything else, including a
  // stale/leftover lastClosedAtMs from a PRIOR cycle of the same session.
  if (input.effectiveStatus === 'active' || input.effectiveStatus === 'closing_soon' || input.effectiveStatus === 'reopened') {
    return false
  }
  if (input.lastClosedAtMs == null) return false

  const ageDays = (input.nowMs - input.lastClosedAtMs) / MS_PER_DAY
  return ageDays >= input.retentionDays
}
