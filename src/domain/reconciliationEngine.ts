/**
 * Exact-match reconciliation engine (§25-29). Pure and side-effect free —
 * given the Bank records still unresolved and the Facebook Bills available
 * to match against, returns which pairs matched. No fuzzy scoring, no
 * candidate suggestion: a Bank Bill either matches on all 3 canonical keys
 * (reference, last4, amount) against a COMPLETED Facebook Bill, or it stays
 * unmatched — nothing in between.
 */
import {
  canonicalBankReference, normalizeBankLast4, normalizeBankAmount, amountsEqual,
} from './facebookCanonical'
import type { FacebookBillCanonical } from './facebookCanonical'
import type { MissingBillRecord } from '../data/mock'

export interface ReconciliationResult {
  newlyMatchedBankTxnIds: string[]
  newlyMatchedFbBillIds: string[]
}

// §29: one-to-one consumption — a Facebook Bill matched to one Bank Bill can
// never be reused for another. Greedy, in Bank-record order: deterministic
// and safe if the dataset ever has duplicate-key ambiguity (first Bank
// record in iteration order wins the match; see report for this limitation).
export function reconcileBankAgainstFacebook(
  bankRecords: MissingBillRecord[],
  fbCandidates: FacebookBillCanonical[],
): ReconciliationResult {
  const consumedFb = new Set<string>()
  const newlyMatchedBankTxnIds: string[] = []
  const newlyMatchedFbBillIds: string[] = []

  for (const bank of bankRecords) {
    const bankRef = canonicalBankReference(bank.reference, bank.bankDesc)
    const bankLast4 = normalizeBankLast4(bank.last4)
    const bankAmount = normalizeBankAmount(bank.amount)

    // §18/26: only COMPLETED Facebook Bills are eligible; §28: date is
    // never part of the key, so no date field is read/compared here at all.
    const fb = fbCandidates.find(f =>
      !consumedFb.has(f.id) &&
      f.reconcilable &&
      f.normalizedReference === bankRef &&
      f.normalizedLast4 === bankLast4 &&
      amountsEqual(f.normalizedAmount, bankAmount),
    )
    if (fb) {
      consumedFb.add(fb.id)
      newlyMatchedBankTxnIds.push(bank.txnId)
      newlyMatchedFbBillIds.push(fb.id)
    }
  }

  return { newlyMatchedBankTxnIds, newlyMatchedFbBillIds }
}
