/**
 * Real CSV parsing + row orchestration for Module 3's Facebook Bill upload.
 * XLSX binary parsing isn't implemented (no parsing library in this project
 * — see report) — CSV with the same 9 headers is read and parsed for real,
 * so the actual normalization/matching rules run against real file content
 * end-to-end, not a simulated/seeded fake.
 */
import {
  FACEBOOK_REQUIRED_HEADERS, validateFacebookHeaders, validateRequiredFields,
  normalizeFacebookReference, extractLast4FromPaymentMethod, parseAmount, roundToCents,
  isCompletedStatus,
} from './facebookCanonical'
import type { FacebookBillCanonical, FacebookRawRow, RowValidationError } from './facebookCanonical'

// Minimal, dependency-free CSV parser — handles quoted fields (with escaped
// "" and embedded commas/newlines) as well as plain unquoted fields.
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\r') {
      // skip — paired \n (or lone \r) below handles the line break
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''))
}

function buildCanonicalBill(
  row: FacebookRawRow,
  rowNumber: number,
  ctx: { ownerCsId: string; sessionId: string; uploadBatchId: string; fileName: string },
): FacebookBillCanonical {
  const normalizedReference = normalizeFacebookReference(row['Tracking ID'])
  const normalizedLast4 = extractLast4FromPaymentMethod(row['Phương thức thanh toán'])
  const parsedAmount = parseAmount(row['Số tiền'])
  const normalizedAmount = parsedAmount != null ? roundToCents(parsedAmount) : null
  // §34: valid data can still be non-reconcilable — never fabricate a
  // missing matching key just to force a match.
  const reconcilable = isCompletedStatus(row['Trạng thái']) && !!normalizedReference && !!normalizedLast4 && normalizedAmount != null

  return {
    id: `fbup-${ctx.uploadBatchId}-${rowNumber}`,
    ownerCsId: ctx.ownerCsId,
    sessionId: ctx.sessionId,
    uploadBatchId: ctx.uploadBatchId,
    sourceFileName: ctx.fileName,
    sourceRowNumber: rowNumber,
    rawTime: row['Thời gian'],
    accountName: row['Tài khoản'],
    accountId: row['ID tài khoản'],
    transactionId: row['Mã giao dịch'],
    trackingId: row['Tracking ID'],
    vatInvoiceId: row['VAT Invoice ID'],
    paymentMethodRaw: row['Phương thức thanh toán'],
    amountRaw: row['Số tiền'],
    facebookStatus: row['Trạng thái'],
    normalizedReference,
    normalizedLast4,
    normalizedAmount,
    reconcilable,
  }
}

export interface FileParseResult {
  fileName: string
  formatOk: boolean
  missingHeaders: string[]
  totalRows: number
  bills: FacebookBillCanonical[]
  errors: RowValidationError[]
}

function isBlankRow(row: FacebookRawRow): boolean {
  return FACEBOOK_REQUIRED_HEADERS.every(h => !row[h] || row[h].trim() === '')
}

// The ONE shared row-processing core — CSV (`parseFacebookCsvFile`) and XLSX
// (`facebookXlsxParser.ts`'s `parseFacebookXlsxFile`) both reduce their
// source down to the SAME `rows: string[][]` shape (header row + data rows)
// and hand it here, so header validation, required-field validation, and
// canonical-model building only exist in one place (task requirement: no
// separate reconciliation/validation logic per file format).
export function parseFacebookRows(
  fileName: string,
  rows: string[][],
  ctx: { ownerCsId: string; sessionId: string; uploadBatchId: string },
): FileParseResult {
  if (rows.length === 0) {
    return { fileName, formatOk: false, missingHeaders: [...FACEBOOK_REQUIRED_HEADERS], totalRows: 0, bills: [], errors: [] }
  }
  const headers = rows[0].map(h => h.trim())
  const { ok, missing } = validateFacebookHeaders(headers)
  if (!ok) {
    return { fileName, formatOk: false, missingHeaders: missing, totalRows: 0, bills: [], errors: [] }
  }

  const colIndex = Object.fromEntries(FACEBOOK_REQUIRED_HEADERS.map(h => [h, headers.indexOf(h)])) as Record<string, number>
  const dataRows = rows.slice(1)
  const bills: FacebookBillCanonical[] = []
  const errors: RowValidationError[] = []
  let totalRows = 0

  dataRows.forEach((cells, i) => {
    const rowNumber = i + 2 // 1-based, +1 for the header row
    const row = Object.fromEntries(
      FACEBOOK_REQUIRED_HEADERS.map(h => [h, (cells[colIndex[h]] ?? '').trim()]),
    ) as FacebookRawRow
    // Real Facebook XLSX exports commonly carry a padded sheet range with
    // hundreds of fully-empty trailing rows — never count/error on those as
    // "invalid data", just skip them silently.
    if (isBlankRow(row)) return
    totalRows++
    const err = validateRequiredFields(row)
    if (err) {
      errors.push({ rowNumber, message: err })
      return
    }
    bills.push(buildCanonicalBill(row, rowNumber, { ...ctx, fileName }))
  })

  return { fileName, formatOk: true, missingHeaders: [], totalRows, bills, errors }
}

// §46: a file whose header row doesn't match the ONE fixed format is
// rejected wholesale ("Không đúng định dạng Bill Facebook") — no column
// mapping UI, ever.
export function parseFacebookCsvFile(
  fileName: string,
  csvText: string,
  ctx: { ownerCsId: string; sessionId: string; uploadBatchId: string },
): FileParseResult {
  return parseFacebookRows(fileName, parseCsvText(csvText), ctx)
}

export interface DedupConflict {
  incoming: FacebookBillCanonical
  existingTransactionId: string
  message: string
}

export interface DedupOutcome {
  imported: FacebookBillCanonical[]
  duplicates: FacebookBillCanonical[]
  conflicts: DedupConflict[]
}

function businessKey(b: FacebookBillCanonical): string {
  return [b.accountId.trim(), b.trackingId.trim(), b.normalizedLast4 ?? '', b.normalizedAmount ?? '', b.facebookStatus.trim().toLowerCase()].join('|')
}

// §30-32: Mã giao dịch (transactionId) is the duplicate-detection identity —
// NOT the filename. Same id + same business fields => full duplicate (skip).
// Same id + different fields => conflict/anomaly (never silently overwrite,
// never let it into reconciliation). Checked against both prior uploads AND
// earlier rows in the SAME batch.
export function dedupeAgainstExisting(
  candidates: FacebookBillCanonical[],
  existing: FacebookBillCanonical[],
): DedupOutcome {
  const byTxnId = new Map<string, FacebookBillCanonical>()
  for (const e of existing) byTxnId.set(e.transactionId, e)

  const imported: FacebookBillCanonical[] = []
  const duplicates: FacebookBillCanonical[] = []
  const conflicts: DedupConflict[] = []

  for (const cand of candidates) {
    const prior = byTxnId.get(cand.transactionId)
    if (!prior) {
      byTxnId.set(cand.transactionId, cand)
      imported.push(cand)
      continue
    }
    if (businessKey(prior) === businessKey(cand)) {
      duplicates.push(cand)
    } else {
      conflicts.push({
        incoming: cand,
        existingTransactionId: prior.transactionId,
        message: 'Mã giao dịch trùng nhưng dữ liệu khác bản ghi đã có — cần kiểm tra thủ công.',
      })
    }
  }
  return { imported, duplicates, conflicts }
}
