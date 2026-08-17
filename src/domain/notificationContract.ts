/**
 * Notification domain CONTRACT ONLY (Cài đặt Finalize task §17/18) — for the
 * next module (Reopen/operational-workflow) to implement against. NOTHING
 * in this file runs a scheduler, sends anything, or renders UI — it exists
 * so the fixed business rule below is written down in ONE place instead of
 * being re-decided (or drifting) when that module gets built.
 *
 * Fixed rule (not editable in Settings — task §17 is explicit that 24h/12h
 * must NOT become a Settings input in this task):
 *  - A session with workload a CS still needs to process gets exactly two
 *    reminder milestones: 24h and 12h before its deadline.
 *  - At each milestone, workload must be recomputed FRESH at send-time —
 *    never reuse a stale count taken earlier. If the CS has since finished,
 *    no reminder goes out for that milestone.
 *  - Recipients: every CS still with open workload for that session, PLUS
 *    the Leader of their team (Leader gets an aggregated Team summary, never
 *    one notification per CS on their team, whenever aggregation is possible).
 *  - Dedupe key: (session, recipient/scope, milestone) — this exact triple
 *    fires at most once, regardless of how many times workload is
 *    recomputed or the reminder job re-runs.
 */
import type { Role } from '../auth/types'

export type ReminderMilestone = '24h' | '12h'

export const REMINDER_MILESTONES: { milestone: ReminderMilestone; hoursBeforeDeadline: number }[] = [
  { milestone: '24h', hoursBeforeDeadline: 24 },
  { milestone: '12h', hoursBeforeDeadline: 12 },
]

export type NotificationRecipientScope =
  | { kind: 'cs'; csId: string }
  // Leader recipients are always a Team-level AGGREGATE — never one
  // synthesized "cs" entry per team member (see rule above).
  | { kind: 'leader_team_summary'; leaderId: string; teamId: string }

// What the future scheduler must be able to answer FRESH at each milestone
// tick — never precomputed/cached ahead of send-time.
export interface WorkloadSnapshotForReminder {
  sessionId: string
  csId: string
  hasOpenWorkload: boolean // false => this CS is excluded from this milestone entirely
}

// The dedupe identity — a (session, recipient/scope, milestone) triple sends
// at most once. The future scheduler owns the actual sent-log; this shape is
// just the KEY it must dedupe on.
export interface ReminderDedupeKey {
  sessionId: string
  scope: NotificationRecipientScope
  milestone: ReminderMilestone
}

export function reminderDedupeKeyString(key: ReminderDedupeKey): string {
  const scopeKey = key.scope.kind === 'cs' ? `cs:${key.scope.csId}` : `leader:${key.scope.leaderId}:team:${key.scope.teamId}`
  return `${key.sessionId}|${scopeKey}|${key.milestone}`
}

// Documented for completeness — NOT enforced/used anywhere yet. The future
// scheduler is expected to gate delivery on these two roles only receiving
// reminders that pertain to them (CS: their own workload; Leader: their own
// team's aggregate) — the same team-scope resolver already established in
// `auth/permissions.ts`'s `teamScopeCsUsers` (Cài đặt Finalize §11) is the
// intended source for "which CS report to which Leader" when this is built.
export const REMINDER_RELEVANT_ROLES: Role[] = ['CS', 'LEADER']
