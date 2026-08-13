import type { EvidenceImage } from '../data/mock'

export type ExplanationReason = 'acc_die' | 'no_share' | 'back'

export const EXPLANATION_REASON_LABEL: Record<ExplanationReason, string> = {
  acc_die: 'ACC DIE',
  no_share: 'Không có quyền SHARE',
  back: 'BACK',
}

export type ExplanationDecision = 'pending' | 'accepted' | 'rejected'

// 1 CS + 1 session = at most one attempt PENDING at a time (§35), but a case
// can carry several attempts over time (submit → reject → resubmit → accept).
export interface ExplanationAttempt {
  attemptNo: number
  createdAt: string
  reasons: ExplanationReason[]
  note: string
  evidence: EvidenceImage[]
  // Snapshot of the Bank Bills this attempt covers, taken at submit time —
  // never edited afterward. Bank txn ids match MissingBillRecord.txnId.
  billIdsSnapshot: string[]
  billCountSnapshot: number
  amountSnapshot: number
  decision: ExplanationDecision
  reviewedAt?: string
  reviewedBy?: string
  rejectReason?: string
}

// §34: 1 CS + 1 SESSION = at most one business ExplanationCase — never one
// case per attempt. `status` mirrors the latest attempt's decision.
export interface ExplanationCaseV2 {
  id: string
  sessionId: string
  sessionDate: string
  csId: string
  csName: string
  teamName: string
  status: ExplanationDecision
  attempts: ExplanationAttempt[]
}

export function latestAttempt(c: ExplanationCaseV2 | undefined): ExplanationAttempt | undefined {
  return c?.attempts[c.attempts.length - 1]
}
