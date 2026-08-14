import { useMemo } from 'react'
import { useExplanationStore } from './explanationStore'
import type { LiveExplanationLookup } from './explanationStore'
import { useFacebookUploadStore } from './facebookUploadStore'

// Plain (non-hook) composer — usable inside a members.map() loop where hooks
// can't be called conditionally. Callers obtain the underlying store
// functions ONCE via their own top-level hook calls and pass them in.
export function composeLiveLookup(
  csId: string,
  explanationLookup: LiveExplanationLookup,
  getResolvedBankTxnIds: (csId: string, sessionId: string) => ReadonlySet<string>,
  hasUploadedForSession: (csId: string, sessionId: string) => boolean,
): LiveExplanationLookup {
  return {
    isPending: explanationLookup.isPending,
    // "hasAnyAttempt" is the pre-existing field name from Module 2 (its
    // meaning there was "submitted an explanation") — broadened here to
    // ALSO cover "uploaded a real Facebook Bill this session", since both
    // are genuine CS actions per §11 (Module 1)/§51 (Module 3).
    hasAnyAttempt: (sessionId: string) =>
      explanationLookup.hasAnyAttempt(sessionId) || hasUploadedForSession(csId, sessionId),
    getResolvedIds: (sessionId: string) => {
      const fromExplanation = explanationLookup.getResolvedIds(sessionId)
      const fromUpload = getResolvedBankTxnIds(csId, sessionId)
      if (fromUpload.size === 0) return fromExplanation
      if (fromExplanation.size === 0) return fromUpload
      return new Set<string>([...fromExplanation, ...fromUpload])
    },
    getPendingSnapshot: explanationLookup.getPendingSnapshot,
  }
}

// Composes explanationStore's live signal (Module 2) with
// facebookUploadStore's live signal (Module 3) into the SAME
// `LiveExplanationLookup` shape csWorkload.ts (Module 1) and Module 2's own
// components already consume — so neither of those needs to change at all
// to pick up "CS just uploaded a real Facebook Bill" as a genuine action
// (§51/52) and to stop counting Bank Bills that upload-reconciliation just
// matched (§39).
export function useCombinedLiveLookup(csId: string): LiveExplanationLookup {
  const { getLookup } = useExplanationStore()
  const { getResolvedBankTxnIds, hasUploadedForSession } = useFacebookUploadStore()
  const explanationLookup = getLookup(csId)

  return useMemo<LiveExplanationLookup>(
    () => composeLiveLookup(csId, explanationLookup, getResolvedBankTxnIds, hasUploadedForSession),
    [csId, explanationLookup, getResolvedBankTxnIds, hasUploadedForSession],
  )
}
