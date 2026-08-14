/**
 * XLSX/XLS source support for Module 3's Facebook Bill upload. This module
 * ONLY turns a workbook into the same `rows: string[][]` shape the CSV path
 * already produces (header row + data rows) — every downstream step
 * (header validation, required-field validation, canonical normalization,
 * dedupe/conflict, reconciliation) is `parseFacebookRows` in
 * `facebookCsvParser.ts`, shared verbatim with CSV. No XLSX-specific
 * business logic exists anywhere else.
 */
import * as XLSX from 'xlsx'
import { FACEBOOK_REQUIRED_HEADERS, validateFacebookHeaders } from './facebookCanonical'
import { parseFacebookRows } from './facebookCsvParser'
import type { FileParseResult } from './facebookCsvParser'

function sheetToRows(ws: XLSX.WorkSheet): string[][] {
  const raw = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' })
  // `raw:false` already gives formatted text (currency symbols, thousands
  // separators, etc. stripped by parseAmount downstream) — just guard
  // against a stray non-string cell type.
  return raw.map(row => row.map(cell => (cell == null ? '' : String(cell))))
}

const NOT_A_WORKBOOK: FileParseResult = {
  fileName: '', formatOk: false, missingHeaders: [...FACEBOOK_REQUIRED_HEADERS], totalRows: 0, bills: [], errors: [],
}

// §3: read the ONE sheet if there's only one; if there are several, find the
// one whose header row matches the 9 fixed columns — never prompt the user
// to pick a sheet manually.
export function parseFacebookXlsxFile(
  fileName: string,
  data: ArrayBuffer,
  ctx: { ownerCsId: string; sessionId: string; uploadBatchId: string },
): FileParseResult {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(data, { type: 'array' })
  } catch {
    return { ...NOT_A_WORKBOOK, fileName }
  }

  if (workbook.SheetNames.length === 0) {
    return { ...NOT_A_WORKBOOK, fileName }
  }

  if (workbook.SheetNames.length === 1) {
    const rows = sheetToRows(workbook.Sheets[workbook.SheetNames[0]])
    return parseFacebookRows(fileName, rows, ctx)
  }

  // Multiple sheets — auto-detect. First sheet whose header row satisfies
  // validateFacebookHeaders wins; if none match, report the closest
  // candidate's missing headers (fewest missing) so the error message is
  // still useful instead of an arbitrary pick.
  let best: { missing: string[] } | null = null
  for (const name of workbook.SheetNames) {
    const rows = sheetToRows(workbook.Sheets[name])
    const headers = (rows[0] ?? []).map(h => h.trim())
    const { ok, missing } = validateFacebookHeaders(headers)
    if (ok) return parseFacebookRows(fileName, rows, ctx)
    if (!best || missing.length < best.missing.length) best = { missing }
  }
  return { fileName, formatOk: false, missingHeaders: best?.missing ?? [...FACEBOOK_REQUIRED_HEADERS], totalRows: 0, bills: [], errors: [] }
}

export function isExcelFileName(name: string): boolean {
  return /\.(xlsx|xls)$/i.test(name)
}
