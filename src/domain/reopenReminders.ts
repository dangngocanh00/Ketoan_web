/**
 * Pure Reopen reminder-milestone logic (Reopen task §14-17), implemented
 * against the existing `notificationContract.ts` contract rather than a new
 * one. Deliberately takes `now` (ms) as a PARAMETER — never reads
 * `Date.now()` itself — so it's directly unit-testable with a synthetic
 * clock, and so the live ticker (reopenStore.tsx) is the only place that
 * ever touches a real clock.
 */
import { REMINDER_MILESTONES, reminderDedupeKeyString } from './notificationContract'
import type { NotificationRecipientScope, ReminderMilestone } from './notificationContract'

export interface CsWorkload {
  csId: string
  csName: string
  missingBills: number
}

export interface TeamReminderGroup {
  sessionId: string
  deadline: string // parseable datetime string
  leaderId: string | null
  teamId: string | null
  members: CsWorkload[] // every relevant CS for this session/team, workload recomputed FRESH by the caller
}

export interface DueReminder {
  dedupeKey: string
  milestone: ReminderMilestone
  scope: NotificationRecipientScope
  recipientUserId: string
  message: string
}

function fmtDeadline(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// A milestone is "due" once elapsed time has crossed its threshold — checked
// on every tick, so this only needs to answer "have we reached or passed
// this point yet", not "are we exactly at it". Callers dedupe against
// `alreadySent` so crossing the threshold is only ever acted on once.
function hoursUntil(deadline: string, now: number): number {
  return (new Date(deadline).getTime() - now) / (3600 * 1000)
}

// §15: workload is whatever `group.members` says RIGHT NOW — this function
// never caches/remembers a prior count; the caller is responsible for
// recomputing `members[].missingBills` fresh before calling this on every
// tick, which is what makes "CS đã xử lý xong → không nhận reminder" true.
export function computeDueReminders(
  now: number,
  group: TeamReminderGroup,
  alreadySent: ReadonlySet<string>,
): DueReminder[] {
  const due: DueReminder[] = []
  const deadlineLabel = fmtDeadline(group.deadline)

  for (const { milestone, hoursBeforeDeadline } of REMINDER_MILESTONES) {
    const remaining = hoursUntil(group.deadline, now)
    if (remaining > hoursBeforeDeadline) continue // threshold not reached yet

    const membersWithWorkload = group.members.filter(m => m.missingBills > 0)

    for (const m of membersWithWorkload) {
      const key = reminderDedupeKeyString({ sessionId: group.sessionId, scope: { kind: 'cs', csId: m.csId }, milestone })
      if (alreadySent.has(key)) continue
      due.push({
        dedupeKey: key,
        milestone,
        scope: { kind: 'cs', csId: m.csId },
        recipientUserId: m.csId,
        message: `Phiên còn ${hoursBeforeDeadline} giờ đến hạn (${deadlineLabel}). Bạn còn ${m.missingBills} Bill chưa đối soát cần xử lý.`,
      })
    }

    // §16: Leader gets ONE aggregated Team summary per milestone — never one
    // notification per CS on their team.
    if (group.leaderId && group.teamId && membersWithWorkload.length > 0) {
      const key = reminderDedupeKeyString({ sessionId: group.sessionId, scope: { kind: 'leader_team_summary', leaderId: group.leaderId, teamId: group.teamId }, milestone })
      if (!alreadySent.has(key)) {
        const lines = membersWithWorkload.map(m => `${m.csName} ${m.missingBills} Bill`).join(', ')
        due.push({
          dedupeKey: key,
          milestone,
          scope: { kind: 'leader_team_summary', leaderId: group.leaderId, teamId: group.teamId },
          recipientUserId: group.leaderId,
          message: `Phiên còn ${hoursBeforeDeadline} giờ đến hạn (${deadlineLabel}). Team còn ${membersWithWorkload.length} CS cần xử lý: ${lines}.`,
        })
      }
    }
  }

  return due
}
