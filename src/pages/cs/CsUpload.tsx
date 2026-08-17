import { useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { fmt, fmtDate, sessionsV2 } from '../../data/sharedData'
import { listOpenSessionsForCs } from '../../domain/bankBills'
import { useCsScope } from '../../domain/csScope'
import { useExplanationStore } from '../../domain/explanationStore'
import { useReopenStore } from '../../domain/reopenStore'
import { fmtBytes, useFacebookUploadStore } from '../../domain/facebookUploadStore'
import type { SubmitBatchFile, SubmitBatchResult } from '../../domain/facebookUploadStore'
import { isExcelFileName } from '../../domain/facebookXlsxParser'

interface Props {
  onNavigateMissingBills: () => void
}

interface PickedFile {
  file: File
  key: string
}

let pickSeq = 0

// Module 3 — Tải lên Bill Facebook (CS/Leader only). Owner is ALWAYS
// currentUser (§2/3) — this page never reads CsScopeContext's Leader
// scope/member for ownership, only `uploadFocusSessionId` for the
// Dashboard/Bill-thiếu → Upload session handoff (§6).
export default function CsUpload({ onNavigateMissingBills }: Props) {
  const { currentUser } = useAuth()
  const { uploadFocusSessionId, requestMissingBillFocus, setScope } = useCsScope()
  const { isLockedForUpload, getAcceptedResolvedBillIds } = useExplanationStore()
  const { submitBatch, getRecentBatchesForCs } = useFacebookUploadStore()
  const reopenStore = useReopenStore()

  const [manualSessionId, setManualSessionId] = useState<string | null>(null)
  const [picked, setPicked] = useState<PickedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<SubmitBatchResult | null>(null)
  const [showErrorDetail, setShowErrorDetail] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!currentUser) return null
  const ownerCsId = currentUser.id
  const ownerCsName = currentUser.displayName

  // Reopen task §29: "Phiên nhận Bill" includes active sessions this CS may
  // act on AND any Reopened session they're a stakeholder of — Closed (and
  // not currently Reopened) sessions never appear here at all.
  const sessionOptions = useMemo(() => {
    const base = listOpenSessionsForCs(ownerCsId)
    const reopened = reopenStore.getReopenSessionsForCs(ownerCsId)
    const seen = new Set(base.map(s => s.sessionId))
    return [...base, ...reopened.filter(s => !seen.has(s.sessionId))]
  }, [ownerCsId, reopenStore])
  const focusValid = uploadFocusSessionId != null && sessionOptions.some(s => s.sessionId === uploadFocusSessionId)
  const sessionId = manualSessionId ?? (focusValid ? uploadFocusSessionId : null) ?? sessionOptions[0]?.sessionId ?? null
  const sessionDate = sessionOptions.find(s => s.sessionId === sessionId)?.sessionDate

  // §7/53: derived straight from the shared explanation workflow — no
  // separate lock state invented for this module.
  const locked = sessionId ? isLockedForUpload(ownerCsId, sessionId) : false

  function addFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter(f => /\.(csv|xlsx|xls)$/i.test(f.name))
    if (accepted.length === 0) return
    setPicked(prev => [...prev, ...accepted.map(file => ({ file, key: `f${++pickSeq}` }))])
    setResult(null)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (locked) return
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  function removeFile(key: string) {
    setPicked(prev => prev.filter(p => p.key !== key))
  }

  async function handleUpload() {
    if (!sessionId || locked || picked.length === 0 || uploading) return
    setUploading(true)
    const files: SubmitBatchFile[] = await Promise.all(
      picked.map(async (p): Promise<SubmitBatchFile> =>
        isExcelFileName(p.file.name)
          ? { name: p.file.name, size: p.file.size, kind: 'excel', data: await p.file.arrayBuffer() }
          : { name: p.file.name, size: p.file.size, kind: 'csv', text: await p.file.text() },
      ),
    )
    const alreadyResolvedByExplanation = getAcceptedResolvedBillIds(ownerCsId, sessionId)
    const res = submitBatch({
      uploadedByUserId: ownerCsId,
      ownerCsId,
      ownerCsName,
      sessionId,
      files,
      isExplanationLocked: locked,
      alreadyResolvedByExplanation,
    })
    setUploading(false)
    setResult(res)
    if (res.ok) setPicked([])
  }

  function handleViewMissingBills() {
    if (!sessionId) return
    // §44: always the uploader's OWN scope — never the Leader's previous
    // Team/member selection.
    setScope({ kind: 'self' })
    requestMissingBillFocus({ csId: ownerCsId, csName: ownerCsName, sessionId, readOnly: false })
    onNavigateMissingBills()
  }

  const recentBatches = getRecentBatchesForCs(ownerCsId, 5)

  return (
    <div className="page-content">
      <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Tải lên Bill Facebook</div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 4 }}>
        Bổ sung dữ liệu Bill Facebook để hệ thống tự động đối soát lại phiên.
      </div>
      <div style={{ fontSize: 12.5, color: '#98A2B3', marginBottom: 18 }}>
        Người tải: <b style={{ color: '#344054' }}>{ownerCsName}</b>
        {currentUser.role === 'LEADER' && ' · Leader'}
      </div>

      <div style={{ marginBottom: 18, maxWidth: 320 }}>
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 5 }}>
          Phiên đối soát *
        </label>
        {sessionOptions.length === 0 ? (
          <div style={{ fontSize: 12.5, color: '#98A2B3' }}>Không có phiên active nào để tải lên.</div>
        ) : (
          <select className="select-input" style={{ width: '100%' }} value={sessionId ?? ''} onChange={e => { setManualSessionId(e.target.value); setResult(null) }}>
            {sessionOptions.map(s => (
              <option key={s.sessionId} value={s.sessionId}>
                {fmtDate(s.sessionDate)}{reopenStore.isSessionReopened(s.sessionId) ? ' — Đã mở lại' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {locked && (
        <div style={{ background: '#FFFAEB', border: '1px solid #FEDF89', color: '#B54708', borderRadius: 8, padding: '9px 14px', fontSize: 12.5, marginBottom: 16 }}>
          Không thể tải Bill Facebook trong khi giải trình của phiên này đang được duyệt.
        </div>
      )}

      {sessionId && (
        <>
          {/* Dropzone — §8/9 */}
          <div
            className="upload-zone"
            style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? 'none' : 'auto', borderColor: dragOver ? '#2563EB' : undefined, marginBottom: 16, maxWidth: 620 }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230', marginBottom: 4 }}>
              Kéo file vào đây hoặc <span style={{ color: '#2563EB' }}>Chọn file</span>
            </div>
            <div style={{ fontSize: 12, color: '#98A2B3' }}>Cho phép chọn nhiều file cùng lúc (.xlsx, .xls, .csv)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
            />
          </div>

          {picked.length > 0 && (
            <div style={{ marginBottom: 16, maxWidth: 620 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                File đã chọn
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Tên file</th>
                      <th>Dung lượng</th>
                      <th>Trạng thái</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {picked.map(p => (
                      <tr key={p.key}>
                        <td>{p.file.name}</td>
                        <td className="mono">{fmtBytes(p.file.size)}</td>
                        <td style={{ color: '#98A2B3' }}>Chưa tải lên</td>
                        <td>
                          <button className="btn-secondary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => removeFile(p.key)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12 }}>
                <button className="btn-primary" disabled={locked || uploading} onClick={handleUpload}>
                  {uploading ? 'Đang kiểm tra…' : 'Kiểm tra & tải lên'}
                </button>
              </div>
            </div>
          )}

          {/* Result — §41-46: upload result ONLY, never reconciliation numbers */}
          {result && (
            <div style={{ marginBottom: 22, maxWidth: 620 }}>
              {result.ok ? (
                <div className="card" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#027A48', marginBottom: 4 }}>Tải lên thành công</div>
                  <div style={{ fontSize: 13, color: '#182230', marginBottom: 2 }}>
                    {result.batch.importedCount} Bill Facebook đã được ghi nhận.
                  </div>
                  <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 10 }}>
                    Hệ thống đã cập nhật dữ liệu đối soát của phiên.
                  </div>
                  <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 12 }}>
                    {result.batch.fileNames.length} file · {result.batch.totalRows} dòng đọc được · {result.batch.importedCount} đã nhập
                    {result.batch.duplicateCount > 0 && ` · ${result.batch.duplicateCount} trùng bỏ qua`}
                    {result.batch.conflictCount > 0 && ` · ${result.batch.conflictCount} xung đột`}
                    {result.batch.invalidCount > 0 && ` · ${result.batch.invalidCount} lỗi`}
                  </div>

                  {result.batch.files.some(f => !f.formatOk) && (
                    <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: '#B42318', marginBottom: 12 }}>
                      {result.batch.files.filter(f => !f.formatOk).map(f => (
                        <div key={f.fileName}>
                          <b>{f.fileName}</b>: Không đúng định dạng Bill Facebook
                          {f.missingHeaders.length > 0 && ` (thiếu cột: ${f.missingHeaders.join(', ')})`}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginBottom: (result.batch.invalidCount > 0 || result.batch.conflictCount > 0) ? 10 : 0 }}>
                    <button className="btn-primary" onClick={handleViewMissingBills}>Xem Bill thiếu còn lại</button>
                    <button className="btn-secondary" onClick={() => setResult(null)}>Tải thêm file</button>
                    {(result.batch.invalidCount > 0 || result.batch.conflictCount > 0) && (
                      <button className="btn-secondary" onClick={() => setShowErrorDetail(v => !v)}>Xem dòng lỗi</button>
                    )}
                  </div>

                  {showErrorDetail && (
                    <div style={{ marginTop: 10, borderTop: '1px solid #E4E7EC', paddingTop: 10 }}>
                      {result.batch.errors.map((e, i) => (
                        <div key={`e${i}`} style={{ fontSize: 12.5, color: '#B42318', marginBottom: 4 }}>
                          <span className="mono">{e.file} · Dòng {e.rowNumber}</span> — {e.message}
                        </div>
                      ))}
                      {result.batch.conflicts.map((c, i) => (
                        <div key={`c${i}`} style={{ fontSize: 12.5, color: '#B54708', marginBottom: 4 }}>
                          <span className="mono">{c.file} · Dòng {c.rowNumber} · Mã GD {c.transactionId}</span> — {c.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: '#B42318' }}>
                  {result.error}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Recent uploads — §47/48: this CS/Leader's own last 5 batches only */}
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
          Lần tải lên gần đây
        </div>
        {recentBatches.length === 0 ? (
          <div className="card" style={{ padding: '14px 18px', fontSize: 12.5, color: '#98A2B3' }}>Chưa có lần tải lên nào.</div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Phiên</th>
                    <th>File</th>
                    <th>Đã nhập</th>
                    <th>Bỏ qua</th>
                    <th>Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBatches.map(b => {
                    const date = sessionsV2.find(s => s.id === b.sessionId)?.date
                    return (
                      <tr key={b.id}>
                        <td className="mono">{b.uploadedAt}</td>
                        <td className="mono">{date ? fmtDate(date) : b.sessionId}</td>
                        <td title={b.fileNames.join(', ')}>{b.fileNames.length === 1 ? b.fileNames[0] : `${b.fileNames.length} file`}</td>
                        <td className="mono">{b.importedCount}</td>
                        <td className="mono">{b.duplicateCount + b.conflictCount}</td>
                        <td className="mono">{b.invalidCount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// keep `fmt` import used (amount formatting available for future drill-down)
void fmt
