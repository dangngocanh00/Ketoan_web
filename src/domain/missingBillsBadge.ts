/**
 * "Bill thiếu" sidebar nav badge — a live WORKLOAD count (unresolved Bank
 * Bills the viewer is responsible for), never a notification. No read/
 * unread state, no store of its own: this file only aggregates numbers that
 * already exist in the canonical domain layer —
 *  - ACTIVE sessions: `csWorkload.ts`'s `getCsSessionRows` (per-CS unresolved
 *    Bank Bill rows, already excluding FB-matched/accepted-explanation ids
 *    via the combined live lookup).
 *  - REOPENED sessions: `reopenStore.tsx`'s own unresolved-record set
 *    (`getReopenSessionsForCs` + `getUnresolvedReopenRecordsForCs`).
 * This is the exact ACTIVE+REOPENED combination `PersonalMissingBills.tsx`/
 * `CsMissingBills.tsx`/`CsUpload.tsx` already assemble per-page — never a
 * second/parallel counter built just for the sidebar.
 */
import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { teamScopeCsUsers, usesAdminUI } from '../auth/permissions'
import { missingBillCases } from '../data/sharedData'
import { useAccountStore } from './accountStore'
import { resolveScopeTarget, useCsScope } from './csScope'
import { getCsSessionRows } from './csWorkload'
import type { LiveExplanationLookup } from './explanationStore'
import { useExplanationStore } from './explanationStore'
import { useFacebookUploadStore } from './facebookUploadStore'
import { composeLiveLookup } from './liveWorkloadLookup'
import { useReopenStore } from './reopenStore'

type ExplanationStoreValue = ReturnType<typeof useExplanationStore>
type FacebookUploadStoreValue = ReturnType<typeof useFacebookUploadStore>
type ReopenStoreValue = ReturnType<typeof useReopenStore>

function unresolvedCountForCs(
  csId: string,
  csName: string,
  explanation: ExplanationStoreValue,
  fb: FacebookUploadStoreValue,
  reopen: ReopenStoreValue,
): number {
  const live: LiveExplanationLookup = composeLiveLookup(csId, explanation.getLookup(csId), fb.getResolvedBankTxnIds, fb.hasUploadedForSession)
  let count = getCsSessionRows(csId, csName, live).reduce((sum, row) => sum + row.missingBills, 0)
  for (const { sessionId } of reopen.getReopenSessionsForCs(csId)) {
    count += reopen.getUnresolvedReopenRecordsForCs(csId, sessionId, live.getResolvedIds(sessionId)).length
  }
  return count
}

export function useMissingBillsBadgeCount(): number {
  const { currentUser } = useAuth()
  const { accounts } = useAccountStore()
  const explanation = useExplanationStore()
  const fb = useFacebookUploadStore()
  const reopen = useReopenStore()
  const { scope } = useCsScope()

  return useMemo(() => {
    if (!currentUser) return 0

    if (usesAdminUI(currentUser.role)) {
      // Admin/Kế toán: every stakeholder across ACTIVE (missingBillCases
      // owners) + REOPENED (Reopen Bank Bill owners) operational sessions,
      // system-wide — never scoped to a single Team/CS.
      const csIds = new Set<string>()
      for (const c of missingBillCases) if (c.ownerCsId) csIds.add(c.ownerCsId)
      for (const { sessionId } of reopen.getAllReopenedSessions()) {
        for (const bill of fb.getReopenBankBillsForSession(sessionId)) csIds.add(bill.ownerCsId)
      }
      let total = 0
      for (const csId of csIds) {
        const name = accounts.find(a => a.userId === csId)?.fullName ?? csId
        total += unresolvedCountForCs(csId, name, explanation, fb, reopen)
      }
      return total
    }

    if (currentUser.role === 'CS') {
      return unresolvedCountForCs(currentUser.id, currentUser.displayName, explanation, fb, reopen)
    }

    // LEADER — follows whatever scope is currently active (Cá nhân tôi / một
    // CS cụ thể / Toàn Team), the same CsScopeContext Dashboard/Bill thiếu use.
    if (scope.kind === 'team') {
      return teamScopeCsUsers(currentUser, accounts)
        .reduce((sum, m) => sum + unresolvedCountForCs(m.id, m.name, explanation, fb, reopen), 0)
    }
    const target = resolveScopeTarget(currentUser, scope, accounts)
    return unresolvedCountForCs(target.csId, target.displayName, explanation, fb, reopen)
  }, [currentUser, accounts, explanation, fb, reopen, scope])
}
