import { fmt, fmtDate, missingBillRecords } from '../../../data/sharedData'
import { useExplanationStore } from '../../../domain/explanationStore'
import { EXPLANATION_REASON_LABEL } from '../../../domain/explanationTypes'
import type { ExplanationAttempt } from '../../../domain/explanationTypes'
import { Badge } from '../shared'

const DECISION_META: Record<ExplanationAttempt['decision'], { label: string; tone: 'purple' | 'success' | 'error' }> = {
  pending: { label: 'Chờ duyệt', tone: 'purple' },
  accepted: { label: 'Đã duyệt', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'error' },
}

interface Props {
  csId: string
  csName: string
  sessionId: string
  onClose: () => void
}

// §42/48: read-only view of the explanation case — the latest attempt in
// full, plus attempt history. Never editable from here (that's the form
// modal, only reachable when not pending — see PersonalMissingBills).
export default function ExplanationViewModal({ csId, csName, sessionId, onClose }: Props) {
  const { getCase } = useExplanationStore()
  const c = getCase(csId, sessionId)
  if (!c) return null
  const latest = c.attempts[c.attempts.length - 1]
  const snapshotRecords = latest.billIdsSnapshot
    .map(txnId => missingBillRecords.find(r => r.txnId === txnId))
    .filter((r): r is NonNullable<typeof r> => !!r)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 700 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4E7EC' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>Giải trình Bill còn thiếu</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 3 }}>
            Phiên {fmtDate(c.sessionDate)} · {csName}
          </div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Badge tone={DECISION_META[latest.decision].tone}>{DECISION_META[latest.decision].label}</Badge>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>
              {latest.billCountSnapshot} Bill · {fmt(latest.amountSnapshot)}
            </span>
            <span style={{ fontSize: 12, color: '#98A2B3' }}>Gửi lúc {latest.createdAt}</span>
          </div>

          {latest.decision === 'rejected' && (
            <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>
                {latest.reviewedBy ?? 'Kế toán'} từ chối lúc {latest.reviewedAt}
              </div>
              {latest.rejectReason && (
                <div style={{ fontSize: 12.5, color: '#7A271A', marginTop: 4 }}>Lý do: {latest.rejectReason}</div>
              )}
            </div>
          )}
          {latest.decision === 'accepted' && (
            <div style={{ background: '#ECFDF3', border: '1px solid #A6F4C5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, color: '#027A48', fontWeight: 600 }}>
                Giải trình đã được duyệt {latest.reviewedBy ? `bởi ${latest.reviewedBy}` : ''} lúc {latest.reviewedAt}
              </div>
              <div style={{ fontSize: 12.5, color: '#05603A', marginTop: 4 }}>
                {latest.billCountSnapshot} Bill · {fmt(latest.amountSnapshot)} đã được xử lý bằng giải trình.
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Lý do</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {latest.reasons.map(r => <Badge key={r} tone="gray">{EXPLANATION_REASON_LABEL[r]}</Badge>)}
            </div>
          </div>

          {latest.note && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Ghi chú</div>
              <div style={{ fontSize: 13, color: '#182230' }}>{latest.note}</div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              Bằng chứng ({latest.evidence.length} ảnh)
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {latest.evidence.map(img => (
                <div key={img.id} style={{ width: 72, height: 72, borderRadius: 8, overflow: 'hidden', background: img.colorBg || '#F2F4F7', border: '1px solid #E4E7EC' }}>
                  {img.dataUrl && <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
              ))}
            </div>
          </div>

          {snapshotRecords.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                Danh sách Bill giải trình — {latest.billCountSnapshot} Bill · {fmt(latest.amountSnapshot)}
              </div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', maxHeight: 240 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>Ngày giao dịch</th>
                        <th>Mã tham chiếu</th>
                        <th>Last 4</th>
                        <th style={{ minWidth: 180 }}>Description</th>
                        <th>Amount</th>
                        <th>Trạng thái bank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotRecords.map(r => (
                        <tr key={r.id}>
                          <td className="mono">{r.bankDate}</td>
                          <td className="mono">{r.reference}</td>
                          <td className="mono">{r.last4}</td>
                          <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.bankDesc}</td>
                          <td className="mono">{fmt(r.amount)}</td>
                          <td><Badge tone={latest.decision === 'accepted' ? 'success' : 'gray'}>{latest.decision === 'accepted' ? 'Đã xử lý bằng giải trình' : 'Chưa đối soát'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {c.attempts.length > 1 && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Lịch sử giải trình
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {c.attempts.map(a => (
                  <div key={a.attemptNo} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 12.5, color: '#182230' }}>
                      <b>Lần {a.attemptNo}</b> · {a.billCountSnapshot} Bill · {fmt(a.amountSnapshot)} · {a.createdAt}
                    </div>
                    <Badge tone={DECISION_META[a.decision].tone}>{DECISION_META[a.decision].label}</Badge>
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
