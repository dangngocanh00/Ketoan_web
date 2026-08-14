import { useState } from 'react'
import { fmtDate, sessionsV2 } from '../../../data/sharedData'
import type { UploadBatch } from '../../../domain/facebookUploadStore'
import { Badge, SectionHeader } from '../shared'
import BatchDetailModal from './BatchDetailModal'

interface Props {
  batches: UploadBatch[]
  showCsColumn: boolean
}

// §40-47: Tab 2 "Lịch sử tải lên" — the FULL Facebook-upload audit trail
// (not the last-5-only widget Module 3's Upload page shows), spanning
// active/tồn đọng/closed sessions alike (§41) — never reconciliation
// results (§46).
export default function UploadHistoryTab({ batches, showCsColumn }: Props) {
  const [detailBatch, setDetailBatch] = useState<UploadBatch | null>(null)

  return (
    <div>
      <SectionHeader title="Lịch sử tải lên Bill Facebook" />
      {batches.length === 0 ? (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>Chưa có lịch sử tải lên.</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Thời gian tải</th>
                  {showCsColumn && <th>CS</th>}
                  <th>Phiên</th>
                  <th>File</th>
                  <th>Dòng đọc</th>
                  <th>Đã nhập</th>
                  <th>Bỏ qua</th>
                  <th>Lỗi</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const sessionDate = sessionsV2.find(s => s.id === b.sessionId)?.date
                  const hasIssue = b.duplicateCount + b.conflictCount + b.invalidCount > 0 || b.files.some(f => !f.formatOk)
                  return (
                    <tr key={b.id}>
                      <td className="mono">{b.uploadedAt}</td>
                      {showCsColumn && <td style={{ fontWeight: 600 }}>{b.ownerCsName}</td>}
                      <td className="mono">{sessionDate ? fmtDate(sessionDate) : b.sessionId}</td>
                      <td title={b.fileNames.join(', ')}>{b.fileNames.length === 1 ? b.fileNames[0] : `${b.fileNames.length} file`}</td>
                      <td className="mono">{b.totalRows}</td>
                      <td className="mono">{b.importedCount}</td>
                      <td className="mono">{b.duplicateCount + b.conflictCount}</td>
                      <td className="mono">{b.invalidCount}</td>
                      <td><Badge tone={hasIssue ? 'warning' : 'success'}>{hasIssue ? 'Có vấn đề' : 'Thành công'}</Badge></td>
                      <td><button className="btn-secondary" onClick={() => setDetailBatch(b)}>Xem</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailBatch && <BatchDetailModal batch={detailBatch} showCsColumn={showCsColumn} onClose={() => setDetailBatch(null)} />}
    </div>
  )
}
