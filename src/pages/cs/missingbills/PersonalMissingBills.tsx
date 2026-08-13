import { useMemo, useState } from 'react'
import { fmt, fmtDate } from '../../../data/sharedData'
import { findCase, getTkqcGapsForCs, getUnresolvedBankRecords } from '../../../domain/bankBills'
import { getCsSessionRows } from '../../../domain/csWorkload'
import { useExplanationStore } from '../../../domain/explanationStore'
import { EXPLANATION_REASON_LABEL, latestAttempt } from '../../../domain/explanationTypes'
import type { ExplanationReason } from '../../../domain/explanationTypes'
import type { EvidenceImage } from '../../../data/mock'
import { Badge, KpiCard, ReadOnlyBanner, SectionHeader, STATUS_META, formatHoursRemaining } from '../shared'
import ExplanationFormModal from './ExplanationFormModal'
import ExplanationViewModal from './ExplanationViewModal'

interface ResubmitPrefill {
  reasons: ExplanationReason[]
  note: string
  evidence: EvidenceImage[]
}

interface Props {
  csId: string
  csName: string
  teamName: string
  sessionId: string
  sessionDate: string
  readOnly: boolean
  onNavigateUpload: () => void
}

export default function PersonalMissingBills({
  csId, csName, teamName, sessionId, sessionDate, readOnly, onNavigateUpload,
}: Props) {
  const { getLookup, isLockedForUpload, getCase } = useExplanationStore()
  const live = useMemo(() => getLookup(csId), [getLookup, csId])
  const mbc = useMemo(() => findCase(csId, sessionId), [csId, sessionId])
  const unresolvedRecords = useMemo(
    () => getUnresolvedBankRecords(mbc, live.getResolvedIds(sessionId)),
    [mbc, live, sessionId],
  )
  const tkqcGaps = useMemo(() => getTkqcGapsForCs(csId, sessionId), [csId, sessionId])
  // §59: reuse the EXACT same row Module 1's Dashboard computes for this
  // session — KPI #4 "Trạng thái phiên" must never drift from the Dashboard.
  const dashboardRow = useMemo(() => getCsSessionRows(csId, csName, live).find(r => r.sessionId === sessionId), [csId, csName, live, sessionId])

  const caseObj = getCase(csId, sessionId)
  const latest = latestAttempt(caseObj)
  const uploadLocked = isLockedForUpload(csId, sessionId)

  const [formOpen, setFormOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [resubmitPrefill, setResubmitPrefill] = useState<ResubmitPrefill | undefined>(undefined)

  const amount = round2(unresolvedRecords.reduce((s, r) => s + r.amount, 0))

  function openForm(prefillFromRejected: boolean) {
    if (readOnly) return
    if (prefillFromRejected && latest) {
      setResubmitPrefill({ reasons: latest.reasons, note: latest.note, evidence: latest.evidence })
    } else {
      setResubmitPrefill(undefined)
    }
    setFormOpen(true)
  }

  function handleUploadClick() {
    if (readOnly || uploadLocked) return
    onNavigateUpload()
  }

  return (
    <div>
      {readOnly && <ReadOnlyBanner name={csName} />}

      {/* KPI — §8 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Bill chưa đối soát" value={`${unresolvedRecords.length} Bill`} />
        <KpiCard label="Amount chưa đối soát" value={fmt(amount)} sub="Nguồn: Bank Bill chưa đối soát" />
        <KpiCard label="TKQC cần tìm Bill" value={`${tkqcGaps.length} TKQC`} />
        <KpiCard
          label="Trạng thái phiên"
          value={dashboardRow ? STATUS_META[dashboardRow.status].label : 'Đã xử lý hết'}
          sub={
            dashboardRow?.status === 'sap_het_han' && dashboardRow.hoursRemaining > 0
              ? `Còn ${formatHoursRemaining(dashboardRow.hoursRemaining)}`
              : dashboardRow
                ? `Hạn ${fmtDate(dashboardRow.deadline)}`
                : undefined
          }
        />
      </div>

      {/* TKQC cần kiểm tra — §10-14, section riêng, KHÔNG gắn vào Bank Bill.
          Đây chỉ là GỢI Ý (Sheet spend vs FB Bill ghi nhận) — không phải kết
          luận reconciliation, nên không render badge "Thiếu Bill"/"Chưa có Bill". */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeader title="TKQC cần kiểm tra" sub="Gợi ý dựa trên chênh lệch Chi tiêu Sheet vs Bill Facebook đã ghi nhận — không phải kết luận reconciliation chính thức" />
        {tkqcGaps.length === 0 ? (
          <div className="card" style={{ padding: '16px 18px', fontSize: 13, color: '#667085' }}>
            Không còn TKQC nào có chênh lệch Bill cần kiểm tra.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>TKQC</th>
                    <th>Chi tiêu Sheet</th>
                    <th>Bill Facebook ghi nhận</th>
                    <th>Chênh lệch cần kiểm tra</th>
                  </tr>
                </thead>
                <tbody>
                  {tkqcGaps.map(g => (
                    <tr key={g.tkqcId}>
                      <td className="mono">{g.tkqcId}</td>
                      <td className="mono">{fmt(g.sheetSpend)}</td>
                      <td className="mono">{fmt(g.fbRecorded)}</td>
                      <td className="mono">{fmt(g.gap)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bill Bank chưa đối soát — §19-22, read-only, KHÔNG TKQC, KHÔNG action
          từng Bill. Đúng 6 cột theo yêu cầu — không File nguồn/internal ID. */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeader
          title="Bill Bank chưa đối soát"
          sub={unresolvedRecords.length > 0 ? `${unresolvedRecords.length} Bill · ${fmt(amount)}` : undefined}
        />
        {unresolvedRecords.length === 0 ? (
          <div className="card" style={{ padding: '20px 18px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230', marginBottom: 4 }}>Đã xử lý hết Bill thiếu</div>
            <div style={{ fontSize: 12.5, color: '#667085' }}>Không còn Bank Bill nào chưa đối soát trong phiên này.</div>
          </div>
        ) : (
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
                  </tr>
                </thead>
                <tbody>
                  {unresolvedRecords.map(r => (
                    <tr key={r.id}>
                      <td className="mono">{r.bankDate}</td>
                      <td className="mono">{r.reference}</td>
                      <td className="mono">{r.last4}</td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.bankDesc}</td>
                      <td className="mono">{fmt(r.amount)}</td>
                      <td><Badge tone="gray">Chưa đối soát</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bổ sung Facebook Bill — §15/24/43 */}
      {!readOnly && (
        <div style={{ marginBottom: 22 }}>
          <button className="btn-primary" onClick={handleUploadClick} disabled={uploadLocked}>
            + Bổ sung Bill Facebook
          </button>
          {uploadLocked && (
            <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 6 }}>
              Không thể bổ sung Bill trong khi giải trình đang được duyệt.
            </div>
          )}
        </div>
      )}

      {/* Giải trình — §24-26, §41, §44-45 */}
      <div>
        <SectionHeader title="Giải trình" />

        {caseObj?.status === 'pending' && latest ? (
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Badge tone="purple">Giải trình đang chờ duyệt</Badge>
              <span style={{ fontSize: 12, color: '#98A2B3' }}>Gửi lúc {latest.createdAt}</span>
            </div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#182230', marginBottom: 4 }}>
              {latest.billCountSnapshot} Bill · {fmt(latest.amountSnapshot)}
            </div>
            <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 10 }}>
              Lý do: {latest.reasons.map(r => EXPLANATION_REASON_LABEL[r]).join(', ')}
            </div>
            <button className="btn-secondary" onClick={() => setViewOpen(true)}>Xem giải trình</button>
          </div>
        ) : unresolvedRecords.length === 0 ? (
          <div className="card" style={{ padding: '16px 18px', fontSize: 12.5, color: '#667085' }}>
            {caseObj && caseObj.attempts.length > 0 && (
              <button className="btn-secondary" style={{ marginBottom: 10 }} onClick={() => setViewOpen(true)}>Xem lịch sử giải trình</button>
            )}
            <div>Không còn Bill thiếu hoặc giải trình cần xử lý cho phiên này.</div>
          </div>
        ) : (
          <div className="card" style={{ padding: '16px 18px' }}>
            {caseObj?.status === 'rejected' && latest && (
              <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>Giải trình cần bổ sung</div>
                <div style={{ fontSize: 12.5, color: '#7A271A', marginTop: 3 }}>
                  {latest.reviewedBy ?? 'Kế toán'} từ chối lúc {latest.reviewedAt}
                </div>
                {latest.rejectReason && <div style={{ fontSize: 12.5, color: '#7A271A', marginTop: 2 }}>Lý do: {latest.rejectReason}</div>}
              </div>
            )}
            <div style={{ fontSize: 13, color: '#344054', marginBottom: 4 }}>
              Nếu đã kiểm tra các TKQC liên quan nhưng không thể tìm thêm Bill Facebook, hãy gửi giải trình cho toàn bộ Bill còn thiếu của phiên.
            </div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#182230', margin: '8px 0 12px' }}>
              Hiện còn {unresolvedRecords.length} Bill · {fmt(amount)} chưa đối soát.
            </div>
            {!readOnly && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={() => openForm(caseObj?.status === 'rejected')}>Giải trình Bill còn thiếu</button>
                {caseObj && caseObj.attempts.length > 0 && (
                  <button className="btn-secondary" onClick={() => setViewOpen(true)}>Xem lịch sử giải trình</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {formOpen && !readOnly && (
        <ExplanationFormModal
          csId={csId}
          csName={csName}
          teamName={teamName}
          sessionId={sessionId}
          sessionDate={sessionDate}
          prefill={resubmitPrefill}
          onClose={() => setFormOpen(false)}
          onSubmitted={() => setFormOpen(false)}
        />
      )}

      {viewOpen && (
        <ExplanationViewModal csId={csId} csName={csName} sessionId={sessionId} onClose={() => setViewOpen(false)} />
      )}
    </div>
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
