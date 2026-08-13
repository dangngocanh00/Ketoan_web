import { useState, useRef } from 'react'
import { sessionsV2 } from '../data/sharedData'
import { uploadHistory, generateInvalidRecords } from '../data/uploadData'
import type { UploadHistoryRecord, RefConflictRecord } from '../data/uploadData'

// Open sessions available for upload (active or closing_soon only)
const openSessions = sessionsV2
  .filter(s => s.status === 'active' || s.status === 'closing_soon')
  .sort((a, b) => b.date.localeCompare(a.date))

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function fmtNum(n: number) {
  return n.toLocaleString('vi-VN')
}

// Deterministic parse result from sessionDate
function generateParseResult(sessionDate: string) {
  const seed = sessionDate.replace(/-/g, '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const total = 1100 + (seed % 300)
  const wrongDate = 12 + (seed % 18)
  const dupExact = 5 + (seed % 9)
  const refConflict = 2 + (seed % 4)
  const invalid = 10 + (seed % 14)
  const existing = 0
  const valid = total - wrongDate - dupExact - invalid - refConflict

  const splits = [0.25, 0.24, 0.27, 0.24]
  const tabNames = ['TN1 - Bank cũ', 'TN2 - Bank cũ', 'TN1 - Bank mới', 'TN2 - Bank mới']
  const tabFormats: ('Bank cũ' | 'Bank mới')[] = ['Bank cũ', 'Bank cũ', 'Bank mới', 'Bank mới']

  const tabs = tabNames.map((name, i) => {
    const r = Math.floor(total * splits[i])
    const wd = Math.floor(wrongDate * splits[i])
    const de = Math.floor(dupExact * splits[i])
    const inv = Math.floor(invalid * splits[i])
    const rc = i === 0 ? refConflict : 0
    const vl = r - wd - de - inv - rc
    return { tabName: name, format: tabFormats[i], read: r, valid: Math.max(0, vl), error: inv, duplicate: de, wrongDate: wd }
  })

  return { total, valid, invalid, wrongDate, dupExact, refConflict, existing, tabs }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FileInfo {
  name: string
  size: number
  selectedAt: string
}

type Step = 'idle' | 'processing' | 'preview' | 'confirm' | 'importing' | 'result'

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, padding: '14px 16px', minWidth: 120 }}>
      <div style={{ fontSize: 11.5, color: '#667085', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#182230', lineHeight: 1.1 }}>
        {typeof value === 'number' ? fmtNum(value) : value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: 'success' | 'partial' | 'failed' }) {
  const map = {
    success: { label: 'Thành công', bg: '#ECFDF3', color: '#027A48' },
    partial: { label: 'Thành công một phần', bg: '#FFFAEB', color: '#B54708' },
    failed: { label: 'Thất bại', bg: '#FEF3F2', color: '#B42318' },
  }
  const s = map[status]
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>
      {s.label}
    </span>
  )
}

function DrawerOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ width: 680, maxWidth: '90vw', background: '#fff', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: '28px', width: 480, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Upload() {
  const [sessionDate, setSessionDate] = useState('')
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [dragging, setDragging] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [processingMsg, setProcessingMsg] = useState('')
  const [parseResult, setParseResult] = useState<ReturnType<typeof generateParseResult> | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showErrorDrawer, setShowErrorDrawer] = useState(false)
  const [showRefDrawer, setShowRefDrawer] = useState(false)
  const [showDupList, setShowDupList] = useState(false)
  const [showHistoryDetail, setShowHistoryDetail] = useState<UploadHistoryRecord | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sessionDateOk = sessionDate.length === 10
  const canUpload = sessionDateOk

  function handleFileSelect(file?: File) {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(ext || '')) {
      alert('Chỉ hỗ trợ file .xlsx hoặc .xls')
      return
    }
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    setFileInfo({ name: file.name, size: file.size, selectedAt: `${hh}:${mm}` })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!canUpload) return
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileSelect(e.target.files?.[0])
  }

  function handleProcess() {
    if (!fileInfo || !sessionDateOk) return
    setStep('processing')
    setProcessingMsg('Đang đọc dữ liệu Bank...')
    setTimeout(() => setProcessingMsg('Đang kiểm tra dữ liệu...'), 1100)
    setTimeout(() => {
      setParseResult(generateParseResult(sessionDate))
      setStep('preview')
    }, 2400)
  }

  function handleImport() {
    setShowConfirm(false)
    setStep('importing')
    setTimeout(() => setStep('result'), 1600)
  }

  function handleReset() {
    setFileInfo(null)
    setParseResult(null)
    setStep('idle')
    setShowConfirm(false)
    setShowErrorDrawer(false)
    setShowRefDrawer(false)
    setShowDupList(false)
  }

  const pr = parseResult
  const invalidRecords = sessionDate ? generateInvalidRecords(sessionDate) : []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-content" style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Tải lên dữ liệu</div>
        <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
          Upload Bill Bank theo từng phiên đối soát. Chọn phiên trước, sau đó upload file.
        </div>
      </div>

      {/* STEP: Processing */}
      {step === 'processing' && (
        <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '48px 32px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E4E7EC', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#182230', marginBottom: 6 }}>{processingMsg}</div>
          <div style={{ fontSize: 12.5, color: '#98A2B3' }}>Đọc toàn bộ tab trong file · Nhận diện format · Chuẩn hóa · Validate</div>
        </div>
      )}

      {/* STEP: Importing */}
      {step === 'importing' && (
        <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: '48px 32px', textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E4E7EC', borderTopColor: '#12B76A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: '#182230', marginBottom: 6 }}>Đang import dữ liệu hợp lệ...</div>
          <div style={{ fontSize: 12.5, color: '#98A2B3' }}>Lưu vào hệ thống · Cập nhật phiên đối soát</div>
        </div>
      )}

      {/* STEP: idle / file_selected */}
      {(step === 'idle') && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start', marginBottom: 28 }}>
          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Session dropdown */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#182230', display: 'block', marginBottom: 10 }}>
                Phiên đối soát <span style={{ color: '#F04438' }}>*</span>
              </label>

              {openSessions.length === 0 ? (
                <div style={{ fontSize: 12.5, color: '#667085', background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 14px' }}>
                  Hiện không có phiên đối soát nào đang mở để tải dữ liệu.
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {/* Trigger */}
                  <button
                    onClick={() => setSessionDropdownOpen(v => !v)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', border: '1.5px solid', borderRadius: 8, fontFamily: 'inherit',
                      borderColor: sessionDropdownOpen ? '#2563EB' : '#D0D5DD',
                      background: '#fff', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {sessionDate ? (
                      <span style={{ fontSize: 13, color: '#182230', fontWeight: 600 }}>
                        Phiên {fmtDate(sessionDate)} ·{' '}
                        <span style={{ fontWeight: 400, color: openSessions.find(s => s.date === sessionDate)?.status === 'closing_soon' ? '#B54708' : '#027A48' }}>
                          {openSessions.find(s => s.date === sessionDate)?.status === 'closing_soon' ? 'Sắp đóng' : 'Đang đối soát'}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#98A2B3' }}>Chọn phiên đối soát</span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transform: sessionDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                      <path d="M2.5 5l4.5 4 4.5-4" stroke="#667085" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Dropdown list */}
                  {sessionDropdownOpen && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setSessionDropdownOpen(false)} />
                  )}
                  {sessionDropdownOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: '#fff', border: '1.5px solid #D0D5DD', borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
                    }}>
                      {openSessions.map(s => {
                        const isSoon = s.status === 'closing_soon'
                        const selected = s.date === sessionDate
                        return (
                          <button
                            key={s.id}
                            onClick={() => { setSessionDate(s.date); setFileInfo(null); setSessionDropdownOpen(false) }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '11px 14px', background: selected ? '#EFF8FF' : '#fff',
                              border: 'none', borderBottom: '1px solid #F2F4F7', cursor: 'pointer',
                              fontFamily: 'inherit', textAlign: 'left', gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 2 }}>
                                Phiên {fmtDate(s.date)}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#667085' }}>
                                Hạn xử lý: {fmtDate(s.processingDeadline)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{
                                fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                                background: isSoon ? '#FFFAEB' : '#ECFDF3',
                                color: isSoon ? '#B54708' : '#027A48',
                              }}>
                                {isSoon ? 'Sắp đóng' : 'Đang đối soát'}
                              </span>
                              {selected && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M2.5 7l3 3 6-6" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {sessionDate && (
                <div style={{ fontSize: 11.5, color: '#667085', marginTop: 8 }}>
                  Hạn xử lý: <strong>{fmtDate(openSessions.find(s => s.date === sessionDate)?.processingDeadline ?? '')}</strong>
                  {' · '}Chỉ giao dịch ngày <strong>{fmtDate(sessionDate)}</strong> được phép import.
                </div>
              )}
            </div>

            {/* Upload zone */}
            <div className="card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 12 }}>File Bill Bank</div>

              {!fileInfo ? (
                <div
                  className="upload-zone"
                  onDragOver={e => { e.preventDefault(); if (canUpload) setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => canUpload && fileInputRef.current?.click()}
                  style={{
                    borderColor: !canUpload ? '#E4E7EC' : dragging ? '#2563EB' : undefined,
                    background: !canUpload ? '#F9FAFB' : dragging ? '#EFF8FF' : undefined,
                    cursor: canUpload ? 'pointer' : 'not-allowed',
                    opacity: canUpload ? 1 : 0.6,
                  }}
                >
                  <div style={{ width: 36, height: 36, background: canUpload ? '#EFF8FF' : '#F2F4F7', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 12V5m0 0L6 8m3-3l3 3" stroke={canUpload ? '#2563EB' : '#98A2B3'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M3 14v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke={canUpload ? '#2563EB' : '#98A2B3'} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 3 }}>Kéo thả file Bank vào đây</div>
                  <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 6 }}>hoặc nhấn để chọn file</div>
                  <div style={{ fontSize: 11, color: '#C4C9D4' }}>Hỗ trợ: .xlsx, .xls</div>
                  <div style={{ fontSize: 11, color: '#C4C9D4' }}>1 file · tự đọc toàn bộ tab</div>
                </div>
              ) : (
                <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: '#EFF8FF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="1" width="10" height="13" rx="2" stroke="#2563EB" strokeWidth="1.4" />
                        <path d="M5 5h5M5 8h3" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#182230', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileInfo.name}</div>
                      <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>{fmtBytes(fileInfo.size)} · Chọn lúc {fileInfo.selectedAt}</div>
                    </div>
                    <button
                      onClick={() => setFileInfo(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', padding: 2, flexShrink: 0 }}
                      title="Xóa file"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11.5, color: '#667085', background: '#EFF8FF', borderRadius: 6, padding: '6px 10px' }}>
                    Hệ thống sẽ tự đọc toàn bộ tab trong file · Support 2 format Bank
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleInputChange} />

              {fileInfo && (
                <button
                  className="btn-primary"
                  style={{ marginTop: 12, width: '100%' }}
                  onClick={handleProcess}
                >
                  Xử lý file
                </button>
              )}

              {!fileInfo && !canUpload && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: '#F79009', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 4v2.5M6 8v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M5.134 1.5L.268 9.5A1 1 0 001.134 11h9.732a1 1 0 00.866-1.5L6.866 1.5a1 1 0 00-1.732 0z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  </svg>
                  Chọn phiên đối soát trước
                </div>
              )}
            </div>
          </div>

          {/* Right: format info */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 14 }}>Thông tin xử lý file</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <InfoRow icon="tab" label="Đọc file" value="Tự đọc toàn bộ tab trong 1 lần upload" />
              <InfoRow icon="format" label="Format hỗ trợ" value="Format Bank cũ và Format Bank mới" />
              <InfoRow icon="date" label="Rule ngày phiên" value="Chỉ import giao dịch đúng ngày phiên đã chọn" />
              <InfoRow icon="dup" label="Duplicate hoàn toàn" value="Tự động loại bỏ, không tính là lỗi" />
              <InfoRow icon="ref" label="Trùng Reference khác thông tin" value="Ghi nhận, cần kiểm tra tại Phiên đối soát" />
              <InfoRow icon="existing" label="Upload lại" value="Giao dịch đã tồn tại được bỏ qua, không tạo trùng" />
              <InfoRow icon="partial" label="Lỗi một phần" value="Phần hợp lệ vẫn được import, phần lỗi bị loại" />
              <InfoRow icon="tkqc" label="TKQC" value="Không có trong Bank — được suy luận riêng bởi hệ thống" />
            </div>
          </div>
        </div>
      )}

      {/* STEP: Preview */}
      {step === 'preview' && pr && (
        <div style={{ marginBottom: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#182230' }}>Kết quả kiểm tra file</div>
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
                Phiên: <strong>{fmtDate(sessionDate)}</strong> · File: <strong>{fileInfo?.name}</strong>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={handleReset}
              style={{ fontSize: 12.5 }}
            >
              Hủy, chọn lại
            </button>
          </div>

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiCard label="Tổng dòng đọc được" value={pr.total} />
            <KpiCard label="Hợp lệ" value={pr.valid} color="#027A48" />
            <KpiCard label="Không hợp lệ" value={pr.invalid} color={pr.invalid > 0 ? '#B42318' : '#667085'} />
            <KpiCard label="Sai ngày phiên" value={pr.wrongDate} color={pr.wrongDate > 0 ? '#B54708' : '#667085'} />
            <KpiCard label="Trùng hoàn toàn" value={pr.dupExact} color="#667085" sub="Sẽ bỏ qua" />
            <KpiCard label="Trùng Reference khác thông tin" value={pr.refConflict} color={pr.refConflict > 0 ? '#B54708' : '#667085'} />
          </div>

          {/* Tab breakdown */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 13, fontWeight: 600, color: '#182230' }}>
              Kết quả theo tab
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Tab</th>
                    <th>Format</th>
                    <th style={{ textAlign: 'right' }}>Đọc được</th>
                    <th style={{ textAlign: 'right' }}>Hợp lệ</th>
                    <th style={{ textAlign: 'right' }}>Lỗi</th>
                    <th style={{ textAlign: 'right' }}>Trùng hoàn toàn</th>
                    <th style={{ textAlign: 'right' }}>Sai ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.tabs.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, color: '#182230' }}>{t.tabName}</td>
                      <td>
                        <span style={{ fontSize: 11.5, background: t.format === 'Bank cũ' ? '#F2F4F7' : '#EFF8FF', color: t.format === 'Bank cũ' ? '#344054' : '#175CD3', padding: '2px 7px', borderRadius: 5, fontWeight: 600 }}>
                          {t.format}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">{fmtNum(t.read)}</td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        <span style={{ color: '#027A48', fontWeight: 600 }}>{fmtNum(t.valid)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        <span style={{ color: t.error > 0 ? '#B42318' : '#98A2B3' }}>{fmtNum(t.error)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        <span style={{ color: t.duplicate > 0 ? '#667085' : '#98A2B3' }}>{fmtNum(t.duplicate)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono">
                        <span style={{ color: t.wrongDate > 0 ? '#B54708' : '#98A2B3' }}>{fmtNum(t.wrongDate)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                    <td colSpan={2} style={{ color: '#344054' }}>Tổng</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmtNum(pr.total)}</td>
                    <td style={{ textAlign: 'right' }} className="mono" ><span style={{ color: '#027A48' }}>{fmtNum(pr.valid)}</span></td>
                    <td style={{ textAlign: 'right' }} className="mono"><span style={{ color: pr.invalid > 0 ? '#B42318' : '#98A2B3' }}>{fmtNum(pr.invalid)}</span></td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmtNum(pr.dupExact)}</td>
                    <td style={{ textAlign: 'right' }} className="mono"><span style={{ color: pr.wrongDate > 0 ? '#B54708' : '#98A2B3' }}>{fmtNum(pr.wrongDate)}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              onClick={() => setShowConfirm(true)}
              style={{ fontSize: 13.5, padding: '9px 20px' }}
            >
              Import {fmtNum(pr.valid)} giao dịch hợp lệ
            </button>
            {(pr.invalid > 0 || pr.wrongDate > 0) && (
              <button
                className="btn-secondary"
                onClick={() => setShowErrorDrawer(true)}
                style={{ fontSize: 12.5 }}
              >
                Xem danh sách lỗi ({fmtNum(pr.invalid + pr.wrongDate)} dòng)
              </button>
            )}
            {pr.refConflict > 0 && (
              <button
                className="btn-secondary"
                onClick={() => setShowRefDrawer(true)}
                style={{ fontSize: 12.5 }}
              >
                Trùng Reference khác thông tin ({pr.refConflict} case)
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP: Result */}
      {step === 'result' && pr && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ background: '#ECFDF3', border: '1px solid #6CE9A6', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#027A48" strokeWidth="1.8" />
              <path d="M7.5 12l3 3 6-6" stroke="#027A48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#027A48' }}>Import hoàn tất</div>
              <div style={{ fontSize: 12.5, color: '#027A48', marginTop: 1 }}>
                Phiên {fmtDate(sessionDate)} · {fmtNum(pr.valid)} giao dịch đã được lưu vào hệ thống
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#182230', marginBottom: 14 }}>Kết quả Upload</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiCard label="Đã đọc" value={pr.total} />
            <KpiCard label="Đã Import" value={pr.valid} color="#027A48" />
            <KpiCard label="Không hợp lệ" value={pr.invalid} color={pr.invalid > 0 ? '#B42318' : '#667085'} />
            <KpiCard label="Sai ngày phiên" value={pr.wrongDate} color={pr.wrongDate > 0 ? '#B54708' : '#667085'} />
            <KpiCard label="Duplicate bỏ qua" value={pr.dupExact} color="#667085" />
            <KpiCard label="Đã tồn tại" value={pr.existing} color="#667085" />
            <KpiCard label="Trùng Reference khác thông tin" value={pr.refConflict} color={pr.refConflict > 0 ? '#B54708' : '#667085'} />
          </div>

          {pr.dupExact > 0 && (
            <div style={{ fontSize: 12.5, color: '#667085', background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              {fmtNum(pr.dupExact)} bản ghi trùng hoàn toàn đã được bỏ qua.
              <button onClick={() => setShowDupList(true)} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: 12.5, marginLeft: 6, fontFamily: 'inherit' }}>Xem danh sách</button>
            </div>
          )}

          {pr.refConflict > 0 && (
            <div style={{ fontSize: 12.5, color: '#B54708', background: '#FFFAEB', border: '1px solid #FEC84B', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              {pr.refConflict} case trùng Reference khác thông tin — cần kiểm tra tại Phiên đối soát → Tab Ngoại lệ.
              <button onClick={() => setShowRefDrawer(true)} style={{ background: 'none', border: 'none', color: '#B54708', cursor: 'pointer', fontSize: 12.5, marginLeft: 6, fontFamily: 'inherit', textDecoration: 'underline' }}>Xem chi tiết</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn-primary" onClick={handleReset}>Tải lên file khác</button>
            <button className="btn-secondary" style={{ fontSize: 12.5 }}>Xem Phiên đối soát</button>
          </div>
        </div>
      )}

      {/* History table */}
      {(step === 'idle' || step === 'result') && (
        <div className="card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#182230' }}>Lịch sử tải lên</span>
            <span style={{ fontSize: 12, color: '#667085' }}>Bill Bank</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Phiên</th>
                  <th>File</th>
                  <th>Người upload</th>
                  <th style={{ textAlign: 'right' }}>Số tab</th>
                  <th style={{ textAlign: 'right' }}>Tổng dòng</th>
                  <th style={{ textAlign: 'right' }}>Đã Import</th>
                  <th style={{ textAlign: 'right' }}>Lỗi</th>
                  <th style={{ textAlign: 'right' }}>Duplicate</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {uploadHistory.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontSize: 12, color: '#667085' }}>{u.timestamp}</td>
                    <td style={{ fontWeight: 600, color: '#182230' }}>{fmtDate(u.sessionDate)}</td>
                    <td>
                      <span className="mono" style={{ fontSize: 11.5, color: '#344054' }}>{u.filename}</span>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{u.uploadedByName}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{u.tabs.length}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmtNum(u.totalRead)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      <span style={{ color: '#027A48', fontWeight: 600 }}>{fmtNum(u.totalImported)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      <span style={{ color: u.totalError > 0 ? '#B42318' : '#98A2B3' }}>{fmtNum(u.totalError)}</span>
                    </td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      <span style={{ color: u.totalDuplicate > 0 ? '#667085' : '#98A2B3' }}>{fmtNum(u.totalDuplicate)}</span>
                    </td>
                    <td><StatusBadge status={u.status} /></td>
                    <td>
                      <button
                        onClick={() => setShowHistoryDetail(u)}
                        style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: '2px 0' }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ──────────────────────────────────────────────────────── */}
      {showConfirm && pr && (
        <ModalOverlay>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Xác nhận Import Bill Bank
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #E4E7EC', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            {[
              ['Phiên', fmtDate(sessionDate)],
              ['File', fileInfo?.name || ''],
              ['Tab đã đọc', '4'],
              ['Tổng dòng', fmtNum(pr.total)],
              ['Sẽ Import', fmtNum(pr.valid)],
              ['Không hợp lệ', fmtNum(pr.invalid)],
              ['Sai ngày phiên', fmtNum(pr.wrongDate)],
              ['Duplicate hoàn toàn bỏ qua', fmtNum(pr.dupExact)],
              ['Trùng Reference khác thông tin', fmtNum(pr.refConflict)],
            ].map(([label, val], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: i < 8 ? '1px solid #F2F4F7' : 'none' }}>
                <span style={{ fontSize: 12.5, color: '#667085' }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#182230' }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowConfirm(false)}>Hủy</button>
            <button className="btn-primary" onClick={handleImport}>Xác nhận Import</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── Error Drawer ───────────────────────────────────────────────────────── */}
      {showErrorDrawer && (
        <DrawerOverlay onClose={() => setShowErrorDrawer(false)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>Danh sách dữ liệu không hợp lệ</div>
              <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Các dòng bị loại khỏi lần Import</div>
            </div>
            <button onClick={() => setShowErrorDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Tab</th>
                  <th style={{ textAlign: 'right' }}>Dòng</th>
                  <th>Ngày</th>
                  <th>Reference</th>
                  <th>Last 4</th>
                  <th>Amount</th>
                  <th>Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {invalidRecords.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: '#344054' }}>{r.tab}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{r.row}</td>
                    <td style={{ fontSize: 12, color: '#667085' }}>{r.date || '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.reference || '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.last4}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.amount}</td>
                    <td style={{ fontSize: 12, color: '#B42318' }}>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DrawerOverlay>
      )}

      {/* ── Ref Conflict Drawer ────────────────────────────────────────────────── */}
      {showRefDrawer && (
        <DrawerOverlay onClose={() => setShowRefDrawer(false)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>Trùng Reference khác thông tin</div>
              <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Cần kiểm tra tại Phiên đối soát → Tab Ngoại lệ</div>
            </div>
            <button onClick={() => setShowRefDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
            {(step === 'result' ? uploadHistory.find(u => u.sessionDate === sessionDate)?.refConflicts ?? [] : generateMockRefConflicts(sessionDate, pr?.refConflict ?? 0)).map((rc, i) => (
              <RefConflictCard key={i} conflict={rc} />
            ))}
            {pr?.refConflict === 0 && <div style={{ color: '#98A2B3', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>Không có case nào.</div>}
          </div>
        </DrawerOverlay>
      )}

      {/* ── Dup list drawer ────────────────────────────────────────────────────── */}
      {showDupList && (
        <ModalOverlay>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>Danh sách bản ghi trùng hoàn toàn</div>
            <button onClick={() => setShowDupList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: '#667085', background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px' }}>
            {pr?.dupExact ? fmtNum(pr.dupExact) : 0} bản ghi trùng hoàn toàn (cùng Reference + toàn bộ thông tin nghiệp vụ giống nhau). Hệ thống đã giữ lại 1 bản và bỏ qua các bản trùng. Không phải lỗi — không cần xử lý thêm.
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setShowDupList(false)}>Đóng</button>
          </div>
        </ModalOverlay>
      )}

      {/* ── History Detail Drawer ──────────────────────────────────────────────── */}
      {showHistoryDetail && (
        <DrawerOverlay onClose={() => setShowHistoryDetail(null)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>Chi tiết lần upload</div>
              <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>{showHistoryDetail.id} · {showHistoryDetail.timestamp}</div>
            </div>
            <button onClick={() => setShowHistoryDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Meta */}
            <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
              {[
                ['File', showHistoryDetail.filename],
                ['Người upload', showHistoryDetail.uploadedByName],
                ['Thời gian', showHistoryDetail.timestamp],
                ['Phiên', fmtDate(showHistoryDetail.sessionDate)],
                ['Số tab', String(showHistoryDetail.tabs.length)],
                ['Tổng dòng', fmtNum(showHistoryDetail.totalRead)],
              ].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 14px', background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: i < 5 ? '1px solid #F2F4F7' : 'none' }}>
                  <span style={{ fontSize: 12.5, color: '#667085' }}>{label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#182230', fontFamily: label === 'File' ? 'monospace' : 'inherit' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Result summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              <KpiCard label="Đã Import" value={showHistoryDetail.totalImported} color="#027A48" />
              <KpiCard label="Lỗi" value={showHistoryDetail.totalError} color={showHistoryDetail.totalError > 0 ? '#B42318' : '#667085'} />
              <KpiCard label="Duplicate" value={showHistoryDetail.totalDuplicate} />
              <KpiCard label="Sai ngày" value={showHistoryDetail.totalWrongDate} color={showHistoryDetail.totalWrongDate > 0 ? '#B54708' : '#667085'} />
            </div>

            {/* Trạng thái */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#667085' }}>Trạng thái:</span>
              <StatusBadge status={showHistoryDetail.status} />
            </div>

            {/* Tab breakdown */}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 10 }}>Breakdown theo tab</div>
            <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
              {showHistoryDetail.tabs.map((t, i) => (
                <div key={i} style={{ padding: '12px 14px', background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: i < showHistoryDetail.tabs.length - 1 ? '1px solid #F2F4F7' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#182230' }}>{t.tabName}</span>
                    <span style={{ fontSize: 11.5, background: t.format === 'Bank cũ' ? '#F2F4F7' : '#EFF8FF', color: t.format === 'Bank cũ' ? '#344054' : '#175CD3', padding: '1px 7px', borderRadius: 5, fontWeight: 600 }}>{t.format}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#667085' }}>
                    <span>Đọc: <strong style={{ color: '#182230' }}>{fmtNum(t.read)}</strong></span>
                    <span>Import: <strong style={{ color: '#027A48' }}>{fmtNum(t.valid)}</strong></span>
                    <span>Lỗi: <strong style={{ color: t.error > 0 ? '#B42318' : '#98A2B3' }}>{fmtNum(t.error)}</strong></span>
                    <span>Trùng: <strong style={{ color: '#667085' }}>{fmtNum(t.duplicate)}</strong></span>
                    <span>Sai ngày: <strong style={{ color: t.wrongDate > 0 ? '#B54708' : '#98A2B3' }}>{fmtNum(t.wrongDate)}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Ref conflicts in history */}
            {showHistoryDetail.refConflicts.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 10 }}>
                  Trùng Reference khác thông tin ({showHistoryDetail.refConflicts.length} case)
                </div>
                {showHistoryDetail.refConflicts.map((rc, i) => (
                  <RefConflictCard key={i} conflict={rc} />
                ))}
              </>
            )}
          </div>
        </DrawerOverlay>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────────

function InfoRow({ label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB', flexShrink: 0, marginTop: 6 }} />
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#344054' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#667085', marginTop: 1 }}>{value}</div>
      </div>
    </div>
  )
}

function RefConflictCard({ conflict }: { conflict: RefConflictRecord }) {
  const allFields = ['txId', 'date', 'time', 'description', 'last4', 'card', 'cardGroup', 'amount', 'currency', 'status', 'sourceTab']
  const fieldLabels: Record<string, string> = {
    txId: 'Transaction ID', date: 'Ngày', time: 'Thời gian', description: 'Description',
    last4: 'Last 4', card: 'Card', cardGroup: 'Card Group', amount: 'Amount',
    currency: 'Currency', status: 'Status', sourceTab: 'Source Tab',
  }
  return (
    <div style={{ border: '1px solid #E4E7EC', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ background: '#FFFAEB', padding: '10px 14px', borderBottom: '1px solid #FEC84B', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 4.5v3M7 9v.5" stroke="#B54708" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M6.134 2L1.268 10A1 1 0 002.134 11.5h9.732A1 1 0 0012.732 10L7.866 2a1 1 0 00-1.732 0z" stroke="#B54708" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#B54708' }}>Reference: {conflict.reference}</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 14px', fontSize: 11.5, color: '#667085', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', minWidth: 90 }}>Trường</th>
              {conflict.records.map((_, i) => (
                <th key={i} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 11.5, color: '#667085', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', minWidth: 150 }}>Record {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFields.map((field, fi) => {
              const isDiff = conflict.records.some(r => r.diffFields.includes(field))
              return (
                <tr key={fi} style={{ background: isDiff ? '#FFFAEB' : fi % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                  <td style={{ padding: '7px 14px', fontSize: 12, fontWeight: isDiff ? 700 : 500, color: isDiff ? '#B54708' : '#667085', borderBottom: '1px solid #F2F4F7' }}>{fieldLabels[field]}</td>
                  {conflict.records.map((r, ri) => {
                    const val = r[field as keyof typeof r]
                    return (
                      <td key={ri} style={{ padding: '7px 14px', fontSize: 12, color: isDiff ? '#B42318' : '#344054', fontWeight: isDiff ? 700 : 400, borderBottom: '1px solid #F2F4F7', fontFamily: ['amount', 'txId'].includes(field) ? 'monospace' : 'inherit' }}>
                        {field === 'amount' ? `$${val}` : String(val)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function generateMockRefConflicts(sessionDate: string, count: number): RefConflictRecord[] {
  const refs = ['ABC' + sessionDate.slice(5, 7) + sessionDate.slice(8), 'XYZ' + sessionDate.slice(5, 7) + sessionDate.slice(8), 'DEF' + sessionDate.slice(5, 7) + sessionDate.slice(8)]
  const d = sessionDate.slice(8) + '/' + sessionDate.slice(5, 7) + '/' + sessionDate.slice(0, 4)
  return refs.slice(0, count).map((ref, i) => ({
    reference: ref,
    records: [
      { txId: `TX-0${10 + i}1`, date: d, time: '08:2' + i + ':14', description: 'FACEBOOK IRELAND LTD', last4: '88' + (21 + i), card: 'Visa 88' + (21 + i), cardGroup: 'TN1', amount: 100 + i * 20, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN1 - Bank cũ', diffFields: ['amount'] },
      { txId: `TX-0${10 + i}2`, date: d, time: '08:2' + i + ':14', description: 'FACEBOOK IRELAND LTD', last4: '88' + (21 + i), card: 'Visa 88' + (21 + i), cardGroup: 'TN1', amount: 120 + i * 20, currency: 'USD', status: 'SUCCESS', sourceTab: 'TN2 - Bank cũ', diffFields: ['amount'] },
    ],
  }))
}
