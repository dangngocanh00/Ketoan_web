import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { findCase, getUnresolvedBankRecords, isSessionActive } from './bankBills'
import { dedupeAgainstExisting, parseFacebookCsvFile } from './facebookCsvParser'
import { parseFacebookXlsxFile } from './facebookXlsxParser'
import { isCompletedStatus } from './facebookCanonical'
import { reconcileBankAgainstFacebook } from './reconciliationEngine'
import type { FacebookBillCanonical } from './facebookCanonical'
import type { FileParseResult } from './facebookCsvParser'

let batchSeq = 0
const EMPTY_IDS: ReadonlySet<string> = new Set()

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export interface UploadFileSummary {
  fileName: string
  sizeBytes: number
  totalRows: number
  importedCount: number
  duplicateCount: number
  conflictCount: number
  invalidCount: number
  formatOk: boolean
  missingHeaders: string[]
}

export interface RowErrorDetail { file: string; rowNumber: number; message: string }
export interface RowConflictDetail { file: string; rowNumber: number; transactionId: string; message: string }

export interface UploadBatch {
  id: string
  uploadedByUserId: string
  ownerCsId: string
  ownerCsName: string
  sessionId: string
  uploadedAt: string
  fileNames: string[]
  totalRows: number
  importedCount: number
  duplicateCount: number
  conflictCount: number
  invalidCount: number
  files: UploadFileSummary[]
  errors: RowErrorDetail[]
  conflicts: RowConflictDetail[]
}

export type SubmitBatchResult =
  | { ok: true; batch: UploadBatch }
  | { ok: false; error: string }

// One fixed Facebook source format, two container formats — CSV (already
// text) and XLSX/XLS (binary, read via SheetJS). Both funnel into the exact
// same `parseFacebookRows` core (see facebookCsvParser.ts) — this union only
// carries "how was the file read", never a second copy of parsing/matching
// logic.
export type SubmitBatchFile =
  | { name: string; size: number; kind: 'csv'; text: string }
  | { name: string; size: number; kind: 'excel'; data: ArrayBuffer }

export interface SubmitBatchInput {
  uploadedByUserId: string
  ownerCsId: string
  ownerCsName: string
  sessionId: string
  files: SubmitBatchFile[]
  // §7/53: enforced HERE (the action layer), not just a disabled button —
  // caller passes the CURRENT explanation-pending state (from
  // explanationStore) as a required precondition.
  isExplanationLocked: boolean
  // Bank Bills already resolved by an ACCEPTED explanation (from
  // explanationStore) — excluded from the reconciliation candidate pool so
  // upload-matching never "re-resolves" something explanation already did.
  alreadyResolvedByExplanation: ReadonlySet<string>
}

interface FacebookUploadStoreValue {
  submitBatch: (input: SubmitBatchInput) => SubmitBatchResult
  getRecentBatchesForCs: (csId: string, limit?: number) => UploadBatch[]
  // Module 4 (Lịch sử) Tab 2 — the FULL upload audit trail, not capped to
  // the last 5 like Module 3's own "Lần tải lên gần đây" widget, and NOT
  // limited to Closed sessions (§41: upload history spans active/tồn
  // đọng/closed sessions alike — it's an audit of the upload action itself,
  // never a reconciliation view).
  getAllBatchesForCs: (csId: string) => UploadBatch[]
  getAllBatchesForCsIds: (csIds: string[]) => UploadBatch[]
  getResolvedBankTxnIds: (csId: string, sessionId: string) => ReadonlySet<string>
  hasUploadedForSession: (csId: string, sessionId: string) => boolean
  getCompletedFbAmountForTkqc: (csId: string, sessionId: string, tkqcId: string) => number
}

const FacebookUploadStoreContext = createContext<FacebookUploadStoreValue | null>(null)

// Mounted inside the CS/Leader branch (see App.tsx) — scoped to Module
// 1/2/3 only. Admin's separate Upload Bank module is untouched (§0).
export function FacebookUploadStoreProvider({ children }: { children: ReactNode }) {
  const [uploadedBills, setUploadedBills] = useState<FacebookBillCanonical[]>([])
  const [batches, setBatches] = useState<UploadBatch[]>([])
  const [matchedBankTxnIds, setMatchedBankTxnIds] = useState<Record<string, ReadonlySet<string>>>({})
  const [matchedFbBillIds, setMatchedFbBillIds] = useState<ReadonlySet<string>>(new Set())

  const scopeKey = (csId: string, sessionId: string) => `${csId}|${sessionId}`

  const getResolvedBankTxnIds = useCallback(
    (csId: string, sessionId: string): ReadonlySet<string> => matchedBankTxnIds[scopeKey(csId, sessionId)] ?? EMPTY_IDS,
    [matchedBankTxnIds],
  )

  const hasUploadedForSession = useCallback(
    (csId: string, sessionId: string) => uploadedBills.some(b => b.ownerCsId === csId && b.sessionId === sessionId),
    [uploadedBills],
  )

  const getCompletedFbAmountForTkqc = useCallback(
    (csId: string, sessionId: string, tkqcId: string) =>
      Math.round(
        uploadedBills
          .filter(b => b.ownerCsId === csId && b.sessionId === sessionId && b.accountId === tkqcId && isCompletedStatus(b.facebookStatus))
          .reduce((s, b) => s + (b.normalizedAmount ?? 0), 0) * 100,
      ) / 100,
    [uploadedBills],
  )

  const getRecentBatchesForCs = useCallback(
    (csId: string, limit = 5) => batches.filter(b => b.ownerCsId === csId).slice(0, limit),
    [batches],
  )

  const getAllBatchesForCs = useCallback(
    (csId: string) => batches.filter(b => b.ownerCsId === csId),
    [batches],
  )

  const getAllBatchesForCsIds = useCallback(
    (csIds: string[]) => {
      const set = new Set(csIds)
      return batches.filter(b => set.has(b.ownerCsId))
    },
    [batches],
  )

  const submitBatch = useCallback(
    (input: SubmitBatchInput): SubmitBatchResult => {
      if (input.isExplanationLocked) {
        return { ok: false, error: 'Không thể tải Bill Facebook trong khi giải trình của phiên này đang được duyệt.' }
      }
      if (!isSessionActive(input.sessionId)) {
        return { ok: false, error: 'Phiên không còn active. Không thể tải lên Bill Facebook.' }
      }
      if (input.files.length === 0) {
        return { ok: false, error: 'Vui lòng chọn ít nhất 1 file.' }
      }

      const batchId = `batch-${++batchSeq}`
      const parseCtx = { ownerCsId: input.ownerCsId, sessionId: input.sessionId, uploadBatchId: batchId }
      const parsedFiles: FileParseResult[] = input.files.map(f =>
        f.kind === 'excel' ? parseFacebookXlsxFile(f.name, f.data, parseCtx) : parseFacebookCsvFile(f.name, f.text, parseCtx),
      )

      // §35/36: parse every file first — one bad/mis-formatted file never
      // blocks the rest of the batch.
      const allCandidateRows = parsedFiles.flatMap(f => f.bills)
      const dedup = dedupeAgainstExisting(allCandidateRows, uploadedBills)

      const importedByFile = new Map<string, number>()
      const duplicatesByFile = new Map<string, number>()
      const conflictsByFile = new Map<string, number>()
      for (const b of dedup.imported) importedByFile.set(b.sourceFileName, (importedByFile.get(b.sourceFileName) ?? 0) + 1)
      for (const b of dedup.duplicates) duplicatesByFile.set(b.sourceFileName, (duplicatesByFile.get(b.sourceFileName) ?? 0) + 1)
      for (const c of dedup.conflicts) conflictsByFile.set(c.incoming.sourceFileName, (conflictsByFile.get(c.incoming.sourceFileName) ?? 0) + 1)

      const fileSummaries: UploadFileSummary[] = parsedFiles.map((f, i) => ({
        fileName: f.fileName,
        sizeBytes: input.files[i].size,
        totalRows: f.totalRows,
        importedCount: importedByFile.get(f.fileName) ?? 0,
        duplicateCount: duplicatesByFile.get(f.fileName) ?? 0,
        conflictCount: conflictsByFile.get(f.fileName) ?? 0,
        invalidCount: f.errors.length,
        formatOk: f.formatOk,
        missingHeaders: f.missingHeaders,
      }))

      const errors: RowErrorDetail[] = parsedFiles.flatMap(f => f.errors.map(e => ({ file: f.fileName, rowNumber: e.rowNumber, message: e.message })))
      const conflicts: RowConflictDetail[] = dedup.conflicts.map(c => ({
        file: c.incoming.sourceFileName, rowNumber: c.incoming.sourceRowNumber, transactionId: c.incoming.transactionId, message: c.message,
      }))

      const batch: UploadBatch = {
        id: batchId,
        uploadedByUserId: input.uploadedByUserId,
        ownerCsId: input.ownerCsId,
        ownerCsName: input.ownerCsName,
        sessionId: input.sessionId,
        uploadedAt: nowStamp(),
        fileNames: input.files.map(f => f.name),
        totalRows: parsedFiles.reduce((s, f) => s + f.totalRows, 0),
        importedCount: dedup.imported.length,
        duplicateCount: dedup.duplicates.length,
        conflictCount: dedup.conflicts.length,
        invalidCount: errors.length,
        files: fileSummaries,
        errors,
        conflicts,
      }

      // §37/38: exactly ONE reconciliation pass for the whole batch, run
      // against ALL relevant session data (existing + newly imported), not
      // per-row — only when at least one row was actually newly imported.
      if (dedup.imported.length > 0) {
        setUploadedBills(prev => [...prev, ...dedup.imported])

        const key = scopeKey(input.ownerCsId, input.sessionId)
        const mbc = findCase(input.ownerCsId, input.sessionId)
        const alreadyResolved = new Set<string>([
          ...(mbc?.resolvedBankTxnIds ?? []),
          ...input.alreadyResolvedByExplanation,
          ...(matchedBankTxnIds[key] ?? []),
        ])
        const bankRecords = getUnresolvedBankRecords(mbc, alreadyResolved)
        const sessionFbBills = [...uploadedBills, ...dedup.imported].filter(
          b => b.ownerCsId === input.ownerCsId && b.sessionId === input.sessionId && !matchedFbBillIds.has(b.id),
        )
        const result = reconcileBankAgainstFacebook(bankRecords, sessionFbBills)

        if (result.newlyMatchedBankTxnIds.length > 0) {
          setMatchedBankTxnIds(prev => {
            const merged = new Set(prev[key] ?? [])
            result.newlyMatchedBankTxnIds.forEach(id => merged.add(id))
            return { ...prev, [key]: merged }
          })
          setMatchedFbBillIds(prev => {
            const merged = new Set(prev)
            result.newlyMatchedFbBillIds.forEach(id => merged.add(id))
            return merged
          })
        }
      }

      setBatches(prev => [batch, ...prev])
      return { ok: true, batch }
    },
    [uploadedBills, matchedBankTxnIds, matchedFbBillIds],
  )

  const value = useMemo<FacebookUploadStoreValue>(
    () => ({
      submitBatch, getRecentBatchesForCs, getAllBatchesForCs, getAllBatchesForCsIds,
      getResolvedBankTxnIds, hasUploadedForSession, getCompletedFbAmountForTkqc,
    }),
    [submitBatch, getRecentBatchesForCs, getAllBatchesForCs, getAllBatchesForCsIds, getResolvedBankTxnIds, hasUploadedForSession, getCompletedFbAmountForTkqc],
  )

  return <FacebookUploadStoreContext.Provider value={value}>{children}</FacebookUploadStoreContext.Provider>
}

export function useFacebookUploadStore(): FacebookUploadStoreValue {
  const ctx = useContext(FacebookUploadStoreContext)
  if (!ctx) throw new Error('useFacebookUploadStore must be used within a FacebookUploadStoreProvider')
  return ctx
}

export { fmtBytes }
