/**
 * Facebook Bill canonical model + pure normalization functions (Module 3,
 * §10-24). Every function here is a plain, dependency-free, unit-testable
 * transform — no React, no shared-data reads — so the exact-match rules
 * (§26-29, §57-64) can be verified in isolation from the UI/upload flow.
 */

// §11: the ONE fixed Facebook source format — no template selection, no
// column mapping, no AI-detect.
export const FACEBOOK_REQUIRED_HEADERS = [
  'Thời gian',
  'Tài khoản',
  'ID tài khoản',
  'Mã giao dịch',
  'Tracking ID',
  'VAT Invoice ID',
  'Phương thức thanh toán',
  'Số tiền',
  'Trạng thái',
] as const

export type FacebookRawRow = Record<(typeof FACEBOOK_REQUIRED_HEADERS)[number], string>

export function validateFacebookHeaders(headers: string[]): { ok: boolean; missing: string[] } {
  const normalized = headers.map(h => h.trim())
  const missing = FACEBOOK_REQUIRED_HEADERS.filter(h => !normalized.includes(h))
  return { ok: missing.length === 0, missing }
}

// §12: canonical Facebook Bill — raw fields kept for audit, normalized
// fields used by the reconciliation engine.
export interface FacebookBillCanonical {
  id: string
  ownerCsId: string
  sessionId: string
  uploadBatchId: string
  sourceFileName: string
  sourceRowNumber: number
  // raw (audit)
  rawTime: string
  accountName: string
  accountId: string
  transactionId: string
  trackingId: string
  vatInvoiceId: string
  paymentMethodRaw: string
  amountRaw: string
  facebookStatus: string
  // normalized (matching)
  normalizedReference: string | null
  normalizedLast4: string | null
  normalizedAmount: number | null
  // §34: valid-but-non-reconcilable vs fully valid
  reconcilable: boolean
}

function trimOrEmpty(v: string | undefined): string {
  return (v ?? '').trim()
}

// §14: Facebook matching reference = normalize(Tracking ID) — never Mã giao dịch.
export function normalizeFacebookReference(trackingId: string): string | null {
  const t = trimOrEmpty(trackingId)
  return t ? t.toUpperCase() : null
}

// §15/16: extract the last 4-digit run from a free-form payment method
// string ("Visa ···· 5252", "VISA *** 1234", "Mastercard **** 4567", ...).
// Never hard-coded to a specific brand, always returns a STRING (never a
// number — "0012" must stay "0012").
export function extractLast4FromPaymentMethod(paymentMethod: string): string | null {
  const matches = trimOrEmpty(paymentMethod).match(/\d{4}/g)
  if (!matches || matches.length === 0) return null
  return matches[matches.length - 1]
}

// §17: numeric amount from a possibly formatted string ("1,923.64", "$500",
// "500"). Returns null (never fabricates 0) when unparsable.
export function parseAmount(raw: string): number | null {
  const cleaned = trimOrEmpty(raw).replace(/[^0-9.\-]/g, '')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function roundToCents(n: number): number {
  return Math.round(n * 100) / 100
}

// §17/24-26: amount comparison must be decimal-safe — compare integer cents,
// never raw floats (avoids classic 0.1+0.2 style mismatches).
export function amountsEqual(a: number | null, b: number | null): boolean {
  if (a == null || b == null) return false
  return Math.round(a * 100) === Math.round(b * 100)
}

// §20-22: Bank Description sometimes carries a "FACEBK *<REF>" prefix — the
// REAL reference is the code after the prefix, not the raw description.
// Case-insensitive, tolerant of "FACEBK*REF" / "FACEBK *REF" / extra spaces.
// Returns null (never guesses) when the pattern isn't present.
const FACEBK_PREFIX_RE = /FACEBK\s*\*\s*([A-Za-z0-9]+)/i

export function extractBankReferenceFromDescription(description: string): string | null {
  const m = trimOrEmpty(description).match(FACEBK_PREFIX_RE)
  return m ? m[1].toUpperCase() : null
}

// §20-22: canonical Bank reference — prefer extracting the real Facebook
// code from Description; the EXISTING shared dataset's Description never
// carries a FACEBK prefix (it's a generic "THANH TOAN THE TIN DUNG ####"
// string predating this module), so this falls back to the record's own
// already-clean `reference` field rather than inventing/fuzzy-guessing one.
// Both are genuine, already-correct data sources — never a guess.
export function canonicalBankReference(reference: string, description: string): string {
  const fromDesc = extractBankReferenceFromDescription(description)
  return (fromDesc ?? trimOrEmpty(reference)).toUpperCase()
}

// §23: Bank Last4 is normally already "1234"/"0012" — normalize to a clean
// string, never a number.
export function normalizeBankLast4(last4: string): string {
  return trimOrEmpty(last4)
}

export function normalizeBankAmount(amount: number): number {
  return roundToCents(amount)
}

export interface RowValidationError {
  rowNumber: number
  message: string
}

// §33-34: required-field validation. A/INVALID row (unusable data) is kept
// separate from B/VALID-BUT-NON-RECONCILABLE (readable, but status !=
// COMPLETED or missing a matching key) — see parseFacebookRow's caller.
export function validateRequiredFields(row: FacebookRawRow): string | null {
  if (!trimOrEmpty(row['Thời gian'])) return 'Không đọc được Thời gian'
  if (!trimOrEmpty(row['ID tài khoản'])) return 'Thiếu ID tài khoản'
  if (!trimOrEmpty(row['Mã giao dịch'])) return 'Thiếu Mã giao dịch'
  if (parseAmount(row['Số tiền']) == null) return 'Không đọc được Số tiền'
  if (!trimOrEmpty(row['Trạng thái'])) return 'Thiếu Trạng thái'
  return null
}

export function isCompletedStatus(status: string): boolean {
  return trimOrEmpty(status).toLowerCase() === 'completed'
}
