import { useState } from 'react'
import { fmt, fmtDate } from '../../../data/sharedData'
import type { ClosureSnapshot, BankBillResolutionKind } from '../../../domain/sessionHistory'
import { Badge, SectionHeader } from '../shared'
import BankBillDetailModal from './BankBillDetailModal'

const RESOLUTION_META: Record<BankBillResolutionKind, { label: string; tone: 'success' | 'purple' | 'gray' }> = {
  fb_matched: { label: 'Đối soát bằng Facebook', tone: 'success' },
  explanation_resolved: { label: 'Xử lý bằng giải trình', tone: 'purple' },
  chua_xu_ly: { label: 'Chưa xử lý', tone: 'gray' },
}

interface Props {
  snapshot: ClosureSnapshot
  backLabel: string
  onBack: () => void
}

// §21-24: read-only Closed-session detail — CS + Session header, summary,
// and the full Bank Bill table for that session's closure snapshot. Every
// number here comes straight from the immutable ClosureSnapshot (never
// recomputed from a live store — task §33).
export default function SessionDetailView({ snapshot, backLabel, onBack }: Props) {
  const [detailRow, setDetailRow] = useState<ClosureSnapshot['rows'][number] | null>(null)

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', fontWeight: 600, fontFamily: 'inherit', padding: 0, fontSize: 12.5 }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {backLabel}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Phiên {fmtDate(snapshot.sessionDate)}</div>
        <span style={{ color: '#98A2B3' }}>·</span>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#344054' }}>{snapshot.ownerCsNameAtClosure}</div>
        <Badge tone={snapshot.finalResult === 'hoan_tat' ? 'success' : 'error'}>
          {snapshot.finalResult === 'hoan_tat' ? 'Hoàn tất' : 'Còn ngoại lệ'}
        </Badge>
      </div>
      <div style={{ fontSize: 12.5, color: '#98A2B3', marginBottom: 18 }}>
        Đóng phiên lúc {snapshot.closedAt} · Dữ liệu snapshot tại thời điểm đóng phiên, không thay đổi theo dữ liệu về sau.
      </div>

      {/* §22: summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 22 }}>
        <SummaryCard label="Tổng Bill Bank" value={`${snapshot.totalBankBills}`} />
        <SummaryCard label="Đối soát bằng Facebook" value={`${snapshot.fbMatchedCount}`} />
        <SummaryCard label="Xử lý bằng giải trình" value={`${snapshot.explanationResolvedCount}`} />
        <SummaryCard label="Còn ngoại lệ" value={`${snapshot.unresolvedCount}`} />
        <SummaryCard label="Tổng Amount Bank" value={fmt(snapshot.totalBankAmount)} />
      </div>

      {/* §23/24: Bank Bill table — exactly these columns, no File nguồn/internal ID */}
      <div>
        <SectionHeader title="Bank Bill" sub="Click một dòng để xem chi tiết xử lý — chỉ xem" />
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Ngày giao dịch</th>
                  <th>Mã tham chiếu</th>
                  <th>Last 4</th>
                  <th style={{ minWidth: 200 }}>Description</th>
                  <th>Amount</th>
                  <th>Trạng thái bank</th>
                  <th>Kết quả xử lý</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map(row => {
                  const meta = RESOLUTION_META[row.kind]
                  return (
                    <tr key={row.txnId} className="table-row-hover" style={{ cursor: 'pointer' }} onClick={() => setDetailRow(row)}>
                      <td className="mono">{row.bankDate}</td>
                      <td className="mono">{row.reference}</td>
                      <td className="mono">{row.last4}</td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.bankDesc}</td>
                      <td className="mono">{fmt(row.amount)}</td>
                      <td><Badge tone={row.bankStatus === 'da_doi_soat' ? 'success' : 'gray'}>{row.bankStatus === 'da_doi_soat' ? 'Đã đối soát' : 'Chưa đối soát'}</Badge></td>
                      <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                    </tr>
                  )
                })}
                {snapshot.rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#98A2B3', padding: '18px 14px' }}>
                      Không có Bank Bill nào trong phiên này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {detailRow && <BankBillDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi-card">
      <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: '#182230', lineHeight: 1.15 }}>{value}</div>
    </div>
  )
}
