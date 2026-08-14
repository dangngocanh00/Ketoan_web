import { fmtDate, sessionsV2 } from '../../../data/sharedData'
import type { UploadBatch } from '../../../domain/facebookUploadStore'
import { Badge } from '../shared'

interface Props {
  batch: UploadBatch
  showCsColumn: boolean
  onClose: () => void
}

// §44/45: read-only detail for one upload batch — per-file breakdown +
// stored row-level errors/conflicts if any. Never shows reconciliation
// results (§46) — upload history is an audit of the UPLOAD action only.
export default function BatchDetailModal({ batch, showCsColumn, onClose }: Props) {
  const sessionDate = sessionsV2.find(s => s.id === batch.sessionId)?.date

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 680 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4E7EC' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>Chi tiết lần tải lên</div>
          <div className="mono" style={{ fontSize: 12, color: '#98A2B3', marginTop: 3 }}>{batch.id}</div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: showCsColumn ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px 18px', fontSize: 13, marginBottom: 18 }}>
            <Field label="Thời gian" value={batch.uploadedAt} mono />
            {showCsColumn && <Field label="CS" value={batch.ownerCsName} />}
            <Field label="Phiên" value={sessionDate ? fmtDate(sessionDate) : batch.sessionId} mono />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              File ({batch.files.length})
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Tên file</th>
                      <th>Dòng đọc</th>
                      <th>Đã nhập</th>
                      <th>Bỏ qua</th>
                      <th>Lỗi</th>
                      <th>Định dạng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.files.map(f => (
                      <tr key={f.fileName}>
                        <td>{f.fileName}</td>
                        <td className="mono">{f.totalRows}</td>
                        <td className="mono">{f.importedCount}</td>
                        <td className="mono">{f.duplicateCount + f.conflictCount}</td>
                        <td className="mono">{f.invalidCount}</td>
                        <td>
                          {f.formatOk ? (
                            <Badge tone="success">Hợp lệ</Badge>
                          ) : (
                            <Badge tone="error">Sai định dạng{f.missingHeaders.length > 0 ? ` (thiếu: ${f.missingHeaders.join(', ')})` : ''}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {(batch.errors.length > 0 || batch.conflicts.length > 0) && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Dòng lỗi / xung đột
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {batch.errors.map((e, i) => (
                  <div key={`e${i}`} style={{ fontSize: 12.5, color: '#B42318' }}>
                    <span className="mono">{e.file} · Dòng {e.rowNumber}</span> — {e.message}
                  </div>
                ))}
                {batch.conflicts.map((c, i) => (
                  <div key={`c${i}`} style={{ fontSize: 12.5, color: '#B54708' }}>
                    <span className="mono">{c.file} · Dòng {c.rowNumber} · Mã GD {c.transactionId}</span> — {c.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 2 }}>{label}</div>
      <div className={mono ? 'mono' : undefined} style={{ fontSize: 13, color: '#182230' }}>{value}</div>
    </div>
  )
}
