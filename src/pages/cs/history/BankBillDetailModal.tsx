import { fmt } from '../../../data/sharedData'
import { getExplanationCaseDetail } from '../../../domain/sessionHistory'
import type { ClosureBankBillRow } from '../../../domain/sessionHistory'
import { EXPLANATION_REASON_LABEL } from '../../../domain/explanationTypes'
import type { ExplanationAttempt } from '../../../domain/explanationTypes'
import { Badge } from '../shared'

const DECISION_META: Record<ExplanationAttempt['decision'], { label: string; tone: 'purple' | 'success' | 'error' }> = {
  pending: { label: 'Chờ duyệt', tone: 'purple' },
  accepted: { label: 'Đã duyệt', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'error' },
}

interface Props {
  row: ClosureBankBillRow
  onClose: () => void
}

// §25-32: read-only detail for one Bank Bill row from a Closed session's
// snapshot. Never a reconciliation debugger (§28) — no per-field match ✓/✗,
// just the two sides of an already-decided pair, or the explanation that
// resolved it, or a plain "chưa xử lý" note. Entirely derived from the
// immutable ClosureSnapshot row passed in — never re-queries a live store.
export default function BankBillDetailModal({ row, onClose }: Props) {
  const explanationCase = row.explanationCaseId ? getExplanationCaseDetail(row.explanationCaseId) : undefined
  const acceptedAttempt = explanationCase?.attempts.find(a => a.decision === 'accepted')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 680 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4E7EC' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>Chi tiết Bank Bill</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 3 }}>Chỉ xem — dữ liệu tại thời điểm đóng phiên</div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          {/* §26: Bank side — real fields, raw Description kept for audit */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
              Bank
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px', fontSize: 13 }}>
                <Field label="Ngày giao dịch" value={row.bankDate} mono />
                <Field label="Mã tham chiếu" value={row.reference} mono />
                <Field label="Last 4" value={row.last4} mono />
                <Field label="Amount" value={fmt(row.amount)} mono />
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Description" value={row.bankDesc} />
                </div>
              </div>
            </div>
          </div>

          {row.kind === 'fb_matched' && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Facebook
              </div>
              {row.fbPair ? (
                <div className="card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px', fontSize: 13 }}>
                    <Field label="Ngày" value={row.fbPair.fbDate} mono />
                    <Field label="Số tiền" value={fmt(row.fbPair.fbAmount)} mono />
                    <Field label="Mã Bill Facebook" value={row.fbPair.fbBillId} mono />
                    <Field label="Upload lúc" value={row.fbPair.fbUploadTime} mono />
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: '14px 16px', fontSize: 12.5, color: '#667085' }}>
                  Bill này đã được đối soát bằng Facebook, nhưng dữ liệu ghép đôi chi tiết không còn khả dụng cho phiên lịch sử này.
                </div>
              )}
            </div>
          )}

          {row.kind === 'explanation_resolved' && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Giải trình
              </div>
              {acceptedAttempt ? (
                <>
                  <div className="card" style={{ padding: '14px 16px', marginBottom: explanationCase && explanationCase.attempts.length > 1 ? 12 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Badge tone="success">Đã duyệt</Badge>
                      <span style={{ fontSize: 12, color: '#98A2B3' }}>Gửi lúc {acceptedAttempt.createdAt}</span>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Lý do</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {acceptedAttempt.reasons.map(r => <Badge key={r} tone="gray">{EXPLANATION_REASON_LABEL[r]}</Badge>)}
                      </div>
                    </div>
                    {acceptedAttempt.note && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Ghi chú</div>
                        <div style={{ fontSize: 13, color: '#182230' }}>{acceptedAttempt.note}</div>
                      </div>
                    )}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                        Bằng chứng ({acceptedAttempt.evidence.length} ảnh)
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {acceptedAttempt.evidence.map(img => (
                          <div key={img.id} style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: img.colorBg || '#F2F4F7', border: '1px solid #E4E7EC' }}>
                            {img.dataUrl && <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#027A48' }}>
                      {acceptedAttempt.reviewedBy ?? 'Kế toán'} duyệt lúc {acceptedAttempt.reviewedAt}
                    </div>
                  </div>

                  {/* §30: attempt history — never overwritten, all prior attempts stay visible */}
                  {explanationCase && explanationCase.attempts.length > 1 && (
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                        Lịch sử giải trình
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {explanationCase.attempts.map(a => (
                          <div key={a.attemptNo} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ fontSize: 12.5, color: '#182230' }}>
                              <b>Lần {a.attemptNo}</b> · {a.billCountSnapshot} Bill · {fmt(a.amountSnapshot)} · {a.createdAt}
                              {a.decision === 'rejected' && a.rejectReason && <span style={{ color: '#B42318' }}> · {a.rejectReason}</span>}
                            </div>
                            <Badge tone={DECISION_META[a.decision].tone}>{DECISION_META[a.decision].label}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="card" style={{ padding: '14px 16px', fontSize: 12.5, color: '#667085' }}>
                  Không tìm thấy chi tiết giải trình cho Bill này.
                </div>
              )}
            </div>
          )}

          {row.kind === 'chua_xu_ly' && (
            <div style={{ background: '#F2F4F7', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 16px' }}>
              <Badge tone="gray">Chưa xử lý khi đóng phiên</Badge>
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 8 }}>
                Bill này vẫn chưa đối soát tại thời điểm phiên được đóng. Không có hành động xử lý nào khả dụng ở Lịch sử.
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
      <div className={mono ? 'mono' : undefined} style={{ fontSize: 13, color: '#182230', wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}
