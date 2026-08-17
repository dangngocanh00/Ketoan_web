/**
 * Bank Bill file parser — originally built for the (now-removed) "Phiên bổ
 * sung" feature, reused as-is for Admin/Kế toán's "Bổ sung Bill Bank" action
 * on a Reopened session (Reopen task §19: "Reuse bankSupplementParser.ts
 * nếu parser hiện tại đúng... không rewrite parser vô ích"). No pre-existing
 * Bank parser exists anywhere else in this codebase — `pages/Upload.tsx`
 * (Admin's older "Upload Bank" screen) is a cosmetic placeholder with no
 * real file reading — so this remains the ONE real Bank parser, reusing
 * every GENERIC primitive already established for Facebook's upload path
 * rather than re-inventing them:
 *  - `parseCsvText` (facebookCsvParser.ts) — the CSV tokenizer itself.
 *  - `sheetToRows` (facebookXlsxParser.ts) — the XLSX-workbook-to-rows[][] reader.
 *  - `parseAmount`/`roundToCents` (facebookCanonical.ts) — numeric parsing,
 *    already source-agnostic (never Facebook-specific).
 * Only the header set + column→field mapping below is new, because no Bank
 * equivalent existed to reuse.
 */
import * as XLSX from 'xlsx'
import { parseCsvText } from './facebookCsvParser'
import { sheetToRows, isExcelFileName } from './facebookXlsxParser'
import { parseAmount, roundToCents } from './facebookCanonical'
import type { RowValidationError } from './facebookCanonical'

export { isExcelFileName }

export const BANK_REQUIRED_HEADERS = [
  'Ngày giao dịch',
  'Mã giao dịch',
  'Mã tham chiếu',
  'Last 4',
  'Số tiền',
  'Diễn giải',
] as const

export type BankRawRow = Record<(typeof BANK_REQUIRED_HEADERS)[number], string>

export interface ParsedBankRow {
  rowNumber: number
  txnId: string
  bankDate: string
  reference: string
  last4: string
  amount: number
  bankDesc: string
}

export function validateBankHeaders(headers: string[]): { ok: boolean; missing: string[] } {
  const normalized = headers.map(h => h.trim())
  const missing = BANK_REQUIRED_HEADERS.filter(h => !normalized.includes(h))
  return { ok: missing.length === 0, missing }
}

function isBlankRow(row: BankRawRow): boolean {
  return BANK_REQUIRED_HEADERS.every(h => !row[h] || row[h].trim() === '')
}

function validateBankRow(row: BankRawRow): string | null {
  if (!row['Ngày giao dịch'].trim()) return 'Không đọc được Ngày giao dịch'
  if (!row['Mã giao dịch'].trim()) return 'Thiếu Mã giao dịch'
  if (!row['Last 4'].trim()) return 'Thiếu Last 4'
  if (parseAmount(row['Số tiền']) == null) return 'Không đọc được Số tiền'
  return null
}

export interface BankFileParseResult {
  fileName: string
  formatOk: boolean
  missingHeaders: string[]
  totalRows: number
  rows: ParsedBankRow[]
  errors: RowValidationError[]
}

// Shared row-processing core for both CSV and XLSX Bank sources — same
// pattern as `parseFacebookRows`, kept in its own file since the Bank header
// set/column mapping is entirely different from Facebook's.
export function parseBankRows(fileName: string, rawRows: string[][]): BankFileParseResult {
  if (rawRows.length === 0) {
    return { fileName, formatOk: false, missingHeaders: [...BANK_REQUIRED_HEADERS], totalRows: 0, rows: [], errors: [] }
  }
  const headers = rawRows[0].map(h => h.trim())
  const { ok, missing } = validateBankHeaders(headers)
  if (!ok) {
    return { fileName, formatOk: false, missingHeaders: missing, totalRows: 0, rows: [], errors: [] }
  }

  const colIndex = Object.fromEntries(BANK_REQUIRED_HEADERS.map(h => [h, headers.indexOf(h)])) as Record<string, number>
  const dataRows = rawRows.slice(1)
  const rows: ParsedBankRow[] = []
  const errors: RowValidationError[] = []
  let totalRows = 0

  dataRows.forEach((cells, i) => {
    const rowNumber = i + 2
    const row = Object.fromEntries(
      BANK_REQUIRED_HEADERS.map(h => [h, (cells[colIndex[h]] ?? '').trim()]),
    ) as BankRawRow
    if (isBlankRow(row)) return
    totalRows++
    const err = validateBankRow(row)
    if (err) {
      errors.push({ rowNumber, message: err })
      return
    }
    rows.push({
      rowNumber,
      txnId: row['Mã giao dịch'],
      bankDate: row['Ngày giao dịch'],
      reference: row['Mã tham chiếu'],
      last4: row['Last 4'],
      amount: roundToCents(parseAmount(row['Số tiền'])!),
      bankDesc: row['Diễn giải'],
    })
  })

  return { fileName, formatOk: true, missingHeaders: [], totalRows, rows, errors }
}

export function parseBankCsvFile(fileName: string, csvText: string): BankFileParseResult {
  return parseBankRows(fileName, parseCsvText(csvText))
}

// Mirrors `parseFacebookXlsxFile`'s single/multi-sheet auto-detect — kept as
// its own small implementation (not a shared helper) since the header set it
// tests against differs; the underlying `sheetToRows` reader is still shared.
export function parseBankXlsxFile(fileName: string, data: ArrayBuffer): BankFileParseResult {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(data, { type: 'array' })
  } catch {
    return { fileName, formatOk: false, missingHeaders: [...BANK_REQUIRED_HEADERS], totalRows: 0, rows: [], errors: [] }
  }
  if (workbook.SheetNames.length === 0) {
    return { fileName, formatOk: false, missingHeaders: [...BANK_REQUIRED_HEADERS], totalRows: 0, rows: [], errors: [] }
  }
  if (workbook.SheetNames.length === 1) {
    return parseBankRows(fileName, sheetToRows(workbook.Sheets[workbook.SheetNames[0]]))
  }
  let best: { missing: string[] } | null = null
  for (const name of workbook.SheetNames) {
    const raw = sheetToRows(workbook.Sheets[name])
    const headers = (raw[0] ?? []).map(h => h.trim())
    const { ok, missing } = validateBankHeaders(headers)
    if (ok) return parseBankRows(fileName, raw)
    if (!best || missing.length < best.missing.length) best = { missing }
  }
  return { fileName, formatOk: false, missingHeaders: best?.missing ?? [...BANK_REQUIRED_HEADERS], totalRows: 0, rows: [], errors: [] }
}

// Bank duplicate-transaction protection (task §36 — "reuse existing dedupe
// rules; don't invent one that conflicts"). No pre-existing Bank dedupe rule
// exists anywhere in this codebase to reuse (Upload.tsx never real-parsed a
// file), so this establishes ONE, keyed the same way Facebook's own
// dedupe already treats identity — a natural transaction id (there,
// `transactionId`; here, `txnId`) — never the source filename.
export interface BankDedupOutcome {
  imported: ParsedBankRow[]
  duplicates: ParsedBankRow[]
}

export function dedupeBankRowsAgainstExisting(
  candidates: ParsedBankRow[],
  existingTxnIds: ReadonlySet<string>,
): BankDedupOutcome {
  const imported: ParsedBankRow[] = []
  const duplicates: ParsedBankRow[] = []
  const seenThisBatch = new Set<string>()
  for (const row of candidates) {
    if (existingTxnIds.has(row.txnId) || seenThisBatch.has(row.txnId)) {
      duplicates.push(row)
      continue
    }
    seenThisBatch.add(row.txnId)
    imported.push(row)
  }
  return { imported, duplicates }
}
