import { useEffect, useMemo, useState } from 'react'
import { fmt, fmtDate } from '../../../data/sharedData'
import { findCase, getTkqcGapsForCs, getUnresolvedBankRecords, listOpenSessionsForCs } from '../../../domain/bankBills'
import { useExplanationStore } from '../../../domain/explanationStore'
import { useFacebookUploadStore } from '../../../domain/facebookUploadStore'
import { useReopenStore } from '../../../domain/reopenStore'
import { useTkqcDeclarationStore } from '../../../domain/tkqcDeclarationStore'
import { useCombinedLiveLookup } from '../../../domain/liveWorkloadLookup'
import { EXPLANATION_REASON_LABEL, latestAttempt } from '../../../domain/explanationTypes'
import type { ExplanationReason } from '../../../domain/explanationTypes'
import type { EvidenceImage } from '../../../data/mock'
import { Badge, KpiCard, ReadOnlyBanner, SectionHeader } from '../shared'
import ExplanationFormModal from './ExplanationFormModal'
import type { SelectedMissingBillRow } from './ExplanationFormModal'
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
  readOnly: boolean
  onNavigateUpload: () => void
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Chọn Bill khi giải trình task §1/§9: every ACTIVE + REOPENED session this
// CS currently has workload in, gathered exactly like CsUpload.tsx's own
// sessionOptions merge — never a new/second notion of "operational session".
function getOperationalSessionsForCs(csId: string, reopenStore: ReturnType<typeof useReopenStore>): { sessionId: string; sessionDate: string }[] {
  const base = listOpenSessionsForCs(csId)
  const reopened = reopenStore.getReopenSessionsForCs(csId)
  const seen = new Set(base.map(s => s.sessionId))
  return [...base, ...reopened.filter(s => !seen.has(s.sessionId))]
}

export default function PersonalMissingBills({ csId, csName, teamName, readOnly, onNavigateUpload }: Props) {
  const { getCase } = useExplanationStore()
  const { getCompletedFbAmountForTkqc } = useFacebookUploadStore()
  const { getResolvedTkqcIdsForCs } = useTkqcDeclarationStore()
  const reopenStore = useReopenStore()
  const live = useCombinedLiveLookup(csId)

  const sessions = useMemo(() => getOperationalSessionsForCs(csId, reopenStore), [csId, reopenStore])

  // §1: Bill thiếu of every ACTIVE+REOPENED session merged into ONE flat
  // list — each row keeps its own sessionId/sessionDate (never lost, never
  // renumbered), just no longer split into one table per session.
  const unresolvedRows = useMemo<SelectedMissingBillRow[]>(() => {
    const rows: SelectedMissingBillRow[] = []
    for (const s of sessions) {
      const resolvedIds = live.getResolvedIds(s.sessionId)
      const mbc = findCase(csId, s.sessionId)
      for (const r of getUnresolvedBankRecords(mbc, resolvedIds)) {
        rows.push({ txnId: r.txnId, sessionId: s.sessionId, sessionDate: s.sessionDate, bankDate: r.bankDate, reference: r.reference, last4: r.last4, amount: r.amount, bankDesc: r.bankDesc })
      }
      for (const r of reopenStore.getUnresolvedReopenRecordsForCs(csId, s.sessionId, resolvedIds)) {
        rows.push({ txnId: r.txnId, sessionId: s.sessionId, sessionDate: s.sessionDate, bankDate: r.bankDate, reference: r.reference, last4: r.last4, amount: r.amount, bankDesc: r.bankDesc })
      }
    }
    return rows
  }, [sessions, live, csId, reopenStore])

  // §8: a Bill whose session currently has a PENDING explanation is not
  // eligible for a NEW selection (only one pending attempt per csId+session
  // at a time — same rule explanationStore.submit() already enforces).
  const pendingSessionIds = useMemo(
    () => new Set(sessions.filter(s => getCase(csId, s.sessionId)?.status === 'pending').map(s => s.sessionId)),
    [sessions, getCase, csId],
  )
  const isEligible = (r: SelectedMissingBillRow) => !pendingSessionIds.has(r.sessionId)

  const amount = round2(unresolvedRows.reduce((s, r) => s + r.amount, 0))

  const tkqcGaps = useMemo(() => {
    const rows: ReturnType<typeof getTkqcGapsForCs> = []
    for (const s of sessions) {
      const tkqcIds = getResolvedTkqcIdsForCs(csId, s.sessionDate)
      rows.push(...getTkqcGapsForCs(tkqcIds, s.sessionId, tkqcId => getCompletedFbAmountForTkqc(csId, s.sessionId, tkqcId)))
    }
    return rows
  }, [sessions, csId, getResolvedTkqcIdsForCs, getCompletedFbAmountForTkqc])

  // Every session with at least one explanation attempt (pending, accepted
  // or rejected) — shown as its own compact status card, since a merged
  // table can have several such sessions at once (unlike the old
  // one-session-at-a-time view, which only ever had one to show).
  const explanationBanners = useMemo(
    () => sessions
      .map(s => ({ session: s, caseObj: getCase(csId, s.sessionId) }))
      .filter((x): x is { session: typeof sessions[number]; caseObj: NonNullable<ReturnType<typeof getCase>> } => !!x.caseObj && x.caseObj.attempts.length > 0),
    [sessions, getCase, csId],
  )

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [viewSessionId, setViewSessionId] = useState<string | null>(null)
  const [resubmitPrefill, setResubmitPrefill] = useState<ResubmitPrefill | undefined>(undefined)

  // §8: if a selected Bill stops being eligible while Selection Mode is open
  // (e.g. it just got FB-matched, or its session just got locked by a fresh
  // pending case), drop it from the selection immediately — never let a
  // stale selection linger past the live data that invalidated it.
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev
      const validIds = new Set(unresolvedRows.filter(isEligible).map(r => r.txnId))
      const next = new Set([...prev].filter(id => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unresolvedRows, pendingSessionIds])

  const selectedRows = unresolvedRows.filter(r => selectedIds.has(r.txnId))
  const selectedAmount = round2(selectedRows.reduce((s, r) => s + r.amount, 0))

  function toggleSelected(txnId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(txnId)) next.delete(txnId)
      else next.add(txnId)
      return next
    })
  }

  function handleStartSelection() {
    if (readOnly) return
    setSelectionMode(true)
  }

  function handleCancelSelection() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  function handleContinue() {
    if (selectedRows.length === 0) return
    setResubmitPrefill(undefined)
    setFormOpen(true)
  }

  function handleReopenRejectedForm(caseObj: NonNullable<ReturnType<typeof getCase>>, sessionId: string) {
    if (readOnly) return
    const latest = latestAttempt(caseObj)
    if (!latest) return
    setResubmitPrefill({ reasons: latest.reasons, note: latest.note, evidence: latest.evidence })
    // A rejected attempt's own session is, by definition, still eligible
    // (a rejected case is never "pending", so its Bills stayed selectable) —
    // pre-select every currently-unresolved Bill of just that one session,
    // matching the OLD single-session "Giải trình lại" convenience without
    // inventing a new cross-session default.
    const ids = new Set(unresolvedRows.filter(r => r.sessionId === sessionId).map(r => r.txnId))
    setSelectedIds(ids)
    setSelectionMode(false)
    setFormOpen(true)
  }

  function handleSubmitted() {
    setFormOpen(false)
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  function handleUploadClick() {
    if (readOnly) return
    onNavigateUpload()
  }

  return (
    <div>
      {readOnly && <ReadOnlyBanner name={csName} />}

      {/* KPI — merged across every ACTIVE+REOPENED session */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Bill chưa đối soát" value={`${unresolvedRows.length} Bill`} />
        <KpiCard label="Amount chưa đối soát" value={fmt(amount)} sub="Nguồn: Bank Bill chưa đối soát" />
        <KpiCard label="TKQC cần tìm Bill" value={`${tkqcGaps.length} TKQC`} />
        <KpiCard label="Phiên đang xử lý" value={`${sessions.length} phiên`} />
      </div>

      {/* TKQC cần kiểm tra — §10-14 gốc, giờ gộp theo mọi phiên đang xử lý */}
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
                  {tkqcGaps.map((g, i) => (
                    <tr key={`${g.tkqcId}-${i}`}>
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

      {/* Bill Bank chưa đối soát — MỘT bảng chung cho mọi phiên đang xử lý
          (§1/§9). Cột "Phiên" giữ đúng sessionId/sessionDate gốc của từng
          Bill. Checkbox chỉ xuất hiện khi ở Selection Mode (§2/§3). */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeader
          title="Bill Bank chưa đối soát"
          sub={unresolvedRows.length > 0 ? `${unresolvedRows.length} Bill · ${fmt(amount)}` : undefined}
        />
        {unresolvedRows.length === 0 ? (
          <div className="card" style={{ padding: '20px 18px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230', marginBottom: 4 }}>Đã xử lý hết Bill thiếu</div>
            <div style={{ fontSize: 12.5, color: '#667085' }}>
              Không còn Bank Bill nào chưa đối soát trong các phiên đang xử lý.
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {selectionMode && <th style={{ width: 32 }}></th>}
                    <th>Phiên</th>
                    <th>Ngày giao dịch</th>
                    <th>Mã tham chiếu</th>
                    <th>Last 4</th>
                    <th style={{ minWidth: 180 }}>Description</th>
                    <th>Amount</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {unresolvedRows.map(r => {
                    const eligible = isEligible(r)
                    return (
                      <tr key={r.txnId} style={selectionMode && !eligible ? { opacity: 0.5 } : undefined}>
                        {selectionMode && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(r.txnId)}
                              disabled={!eligible}
                              onChange={() => toggleSelected(r.txnId)}
                              style={{ width: 15, height: 15, accentColor: '#2563EB' }}
                            />
                          </td>
                        )}
                        <td className="mono">{fmtDate(r.sessionDate)}</td>
                        <td className="mono">{r.bankDate}</td>
                        <td className="mono">{r.reference}</td>
                        <td className="mono">{r.last4}</td>
                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.bankDesc}</td>
                        <td className="mono">{fmt(r.amount)}</td>
                        <td>{eligible ? <Badge tone="gray">Chưa đối soát</Badge> : <Badge tone="purple">Chờ duyệt giải trình</Badge>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Bổ sung Facebook Bill — không còn gắn với "phiên đang chọn" (không
          còn khái niệm đó ở bảng gộp); Module Upload tự chọn phiên và tự
          enforce khóa giải trình theo đúng phiên CS chọn ở đó. */}
      {!readOnly && (
        <div style={{ marginBottom: 22 }}>
          <button className="btn-primary" onClick={handleUploadClick}>
            + Bổ sung Bill Facebook
          </button>
        </div>
      )}

      {/* Giải trình — §2-9: button "Giải trình Bill" chỉ CHUYỂN SANG
          Selection Mode, không tự mở form/không tự chọn toàn bộ Bill. */}
      <div>
        <SectionHeader title="Giải trình" />

        {explanationBanners.map(({ session, caseObj }) => {
          const latest = latestAttempt(caseObj)
          if (!latest) return null
          return (
            <div key={session.sessionId} className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                {caseObj.status === 'pending' ? (
                  <Badge tone="purple">Giải trình đang chờ duyệt</Badge>
                ) : caseObj.status === 'rejected' ? (
                  <Badge tone="error">Giải trình cần bổ sung</Badge>
                ) : (
                  <Badge tone="success">Giải trình đã duyệt</Badge>
                )}
                <span style={{ fontSize: 12, color: '#98A2B3' }}>Phiên {fmtDate(session.sessionDate)}</span>
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#182230', marginBottom: 4 }}>
                {latest.billCountSnapshot} Bill · {fmt(latest.amountSnapshot)}
              </div>
              {caseObj.status === 'pending' && (
                <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 8 }}>
                  Lý do: {latest.reasons.map(r => EXPLANATION_REASON_LABEL[r]).join(', ')}
                </div>
              )}
              {caseObj.status === 'rejected' && (
                <div style={{ fontSize: 12.5, color: '#7A271A', marginBottom: 8 }}>
                  {latest.reviewedBy ?? 'Kế toán'} từ chối lúc {latest.reviewedAt}
                  {latest.rejectReason && ` — Lý do: ${latest.rejectReason}`}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => setViewSessionId(session.sessionId)}>
                  {caseObj.status === 'pending' ? 'Xem giải trình' : 'Xem lịch sử giải trình'}
                </button>
                {caseObj.status === 'rejected' && !readOnly && (
                  <button className="btn-primary" onClick={() => handleReopenRejectedForm(caseObj, session.sessionId)}>Giải trình lại</button>
                )}
              </div>
            </div>
          )
        })}

        {!readOnly && unresolvedRows.some(isEligible) && (
          selectionMode ? (
            <div className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 13, color: '#344054', marginBottom: 10 }}>
                Tick chọn chính xác Bill cần giải trình trong bảng phía trên.
              </div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#182230', marginBottom: 12 }}>
                Đã chọn: {selectedRows.length} Bill · Tổng Amount: {fmt(selectedAmount)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={handleCancelSelection}>Hủy</button>
                <button className="btn-primary" disabled={selectedRows.length === 0} onClick={handleContinue}>Tiếp tục giải trình</button>
              </div>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleStartSelection}>Giải trình Bill</button>
          )
        )}

        {!selectionMode && !unresolvedRows.some(isEligible) && explanationBanners.length === 0 && (
          <div className="card" style={{ padding: '16px 18px', fontSize: 12.5, color: '#667085' }}>
            Không còn Bill thiếu hoặc giải trình cần xử lý.
          </div>
        )}
      </div>

      {formOpen && !readOnly && (
        <ExplanationFormModal
          csId={csId}
          csName={csName}
          teamName={teamName}
          selectedRows={selectedRows}
          prefill={resubmitPrefill}
          onClose={() => setFormOpen(false)}
          onSubmitted={handleSubmitted}
        />
      )}

      {viewSessionId && (
        <ExplanationViewModal csId={csId} csName={csName} sessionId={viewSessionId} onClose={() => setViewSessionId(null)} />
      )}
    </div>
  )
}
