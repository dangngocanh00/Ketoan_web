/**
 * Reconciliation engine (§9/25-29 of the original Module 3 task; §7-11 of
 * the Cài đặt hardening task). Pure and side-effect free — given the Bank
 * records still unresolved and the Facebook Bills available to match
 * against, returns which pairs matched. No fuzzy scoring, no candidate
 * suggestion: a Bank Bill either matches on Reference + Last4 (both still
 * EXACT, never fuzzy) + Amount-within-configured-tolerance against a
 * COMPLETED Facebook Bill, or it stays unmatched — nothing in between.
 */
import {
  canonicalBankReference, normalizeBankLast4, normalizeBankAmount, amountWithinTolerance,
} from './facebookCanonical'
import type { FacebookBillCanonical } from './facebookCanonical'

export interface ReconciliationResult {
  newlyMatchedBankTxnIds: string[]
  newlyMatchedFbBillIds: string[]
}

// The minimal shape this engine actually reads off a Bank record — kept
// separate from Module 2's `MissingBillRecord` (which carries CS-case fields
// this engine never touches) so the SAME pure engine can reconcile Bank data
// from a different source (e.g. Reopen's own Bank import — see
// `reopenTypes.ts`'s `ReopenBankBill`) without needing to fabricate a fake
// MissingBillCase/tkqcId/etc. just to satisfy the type. `MissingBillRecord`
// and `ReopenBankBill` already structurally satisfy this interface, so every
// existing caller keeps working unchanged.
export interface ReconcilableBankRecord {
  txnId: string
  reference: string
  bankDesc: string
  last4: string
  amount: number
}

// §29 (Module 3) / §31 (Settings): one-to-one consumption — a Facebook Bill
// matched to one Bank Bill can never be reused for another. Greedy, in
// Bank-record order: deterministic and safe if the dataset ever has
// duplicate-key ambiguity (first Bank record in iteration order wins the
// match; see report for this limitation).
//
// `tolerancePercent` (Cài đặt §7-11, default 0 — see reconciliationSettings.tsx):
// Reference and Last4 stay byte-exact regardless of this value (§9); only
// the Amount check is affected, via `amountWithinTolerance`. Passing 0
// reproduces the exact pre-Settings-task behavior exactly (§10).
export function reconcileBankAgainstFacebook(
  bankRecords: ReconcilableBankRecord[],
  fbCandidates: FacebookBillCanonical[],
  tolerancePercent = 0,
): ReconciliationResult {
  const consumedFb = new Set<string>()
  const newlyMatchedBankTxnIds: string[] = []
  const newlyMatchedFbBillIds: string[] = []

  for (const bank of bankRecords) {
    const bankRef = canonicalBankReference(bank.reference, bank.bankDesc)
    const bankLast4 = normalizeBankLast4(bank.last4)
    const bankAmount = normalizeBankAmount(bank.amount)

    // §18/26 (Module 3): only COMPLETED Facebook Bills are eligible; date is
    // never part of the key, so no date field is read/compared here at all.
    const fb = fbCandidates.find(f =>
      !consumedFb.has(f.id) &&
      f.reconcilable &&
      f.normalizedReference === bankRef &&
      f.normalizedLast4 === bankLast4 &&
      amountWithinTolerance(f.normalizedAmount, bankAmount, tolerancePercent),
    )
    if (fb) {
      consumedFb.add(fb.id)
      newlyMatchedBankTxnIds.push(bank.txnId)
      newlyMatchedFbBillIds.push(fb.id)
    }
  }

  return { newlyMatchedBankTxnIds, newlyMatchedFbBillIds }
}
