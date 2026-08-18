import React, { useState, useMemo } from 'react'
import {
  sessionsV2, sessionDetails, teams, csMembers, csTeamMap, fmt, fmtDate,
} from '../data/sharedData'
import type {
  SessionV2, SessionStatusV2, ReconciledPair,
  ExceptionRecord, BankUnreconciledRecord, FbUnreconciledRecord,
} from '../data/mock'
import { useAuth } from '../auth/AuthContext'
import { canManageReopen } from '../auth/permissions'
import { useReopenStore, listClosedSessionsInMonth } from '../domain/reopenStore'
import { useFacebookUploadStore } from '../domain/facebookUploadStore'
import { parseBankCsvFile, parseBankXlsxFile, isExcelFileName } from '../domain/bankSupplementParser'
import type { EffectiveSessionStatus } from '../domain/reopenTypes'

// ─── Shared Badge ─────────────────────────────────────────────────────────────

function Badge({ type, children }: { type: string; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; color: string }> = {
    active: { bg: '#EFF8FF', color: '#175CD3' },
    closing_soon: { bg: '#FFFAEB', color: '#B54708' },
    closed: { bg: '#ECFDF3', color: '#027A48' },
    closed_pending: { bg: '#FEF3F2', color: '#B42318' },
    success: { bg: '#ECFDF3', color: '#027A48' },
    warning: { bg: '#FFFAEB', color: '#B54708' },
    error: { bg: '#FEF3F2', color: '#B42318' },
    info: { bg: '#EFF8FF', color: '#175CD3' },
    purple: { bg: '#F4F3FF', color: '#5925DC' },
    gray: { bg: '#F2F4F7', color: '#344054' },
  }
  const s = styles[type] || styles.gray
  return <span className="badge" style={{ background: s.bg, color: s.color }}>{children}</span>
}

function statusBadge(status: EffectiveSessionStatus) {
  const map: Record<EffectiveSessionStatus, { type: string; label: string }> = {
    active: { type: 'active', label: 'Đang đối soát' },
    closing_soon: { type: 'closing_soon', label: 'Sắp đóng' },
    closed: { type: 'closed', label: 'Đã đóng' },
    closed_pending: { type: 'closed_pending', label: 'Đã đóng còn tồn đọng' },
    // Reopen task §2/25: a THIRD, distinct badge — never confused with
    // "closed_pending" (which is a first-close outcome, not a reopen state).
    reopened: { type: 'purple', label: 'Đã mở lại' },
  }
  const { type, label } = map[status]
  return <Badge type={type}>{label}</Badge>
}

function csStatusBadge(status: BankUnreconciledRecord['csStatus']) {
  const map: Record<string, { type: string; label: string }> = {
    chua_xu_ly: { type: 'error', label: 'Chưa xử lý' },
    dang_xu_ly: { type: 'info', label: 'Đang xử lý' },
    da_nhac: { type: 'warning', label: 'Đã nhắc' },
    cho_duyet: { type: 'purple', label: 'Chờ duyệt giải trình' },
  }
  const m = map[status] || { type: 'gray', label: status }
  return <Badge type={m.type}>{m.label}</Badge>
}

// ─── Record Detail Drawer ─────────────────────────────────────────────────────

function FieldRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F2F4F7', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#667085', flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: '#182230', fontWeight: 500, textAlign: 'right' }} className={mono ? 'mono' : ''}>{value}</span>
    </div>
  )
}

type DrawerRecord =
  | { kind: 'reconciled'; data: ReconciledPair }
  | { kind: 'exception'; data: ExceptionRecord }
  | { kind: 'bankUnreconciled'; data: BankUnreconciledRecord }
  | { kind: 'fbUnreconciled'; data: FbUnreconciledRecord }

function RecordDrawer({ record, onClose, onGoMissingBills }: {
  record: DrawerRecord; onClose: () => void;
  onGoMissingBills?: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>Chi tiết đối soát</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 18, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── KẾT QUẢ ĐỐI SOÁT ── */}
          {record.kind === 'reconciled' && (() => {
            const d = record.data
            return (
              <>
                <div style={{ background: '#ECFDF3', border: '1px solid #6CE9A6', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 16, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#027A48', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Kết quả đối soát — Đã khớp</div>
                    {[['Mã tham chiếu', true], ['Last 4', true], ['Amount', true]].map(([k]) => (
                      <div key={String(k)} style={{ fontSize: 12, color: '#027A48', display: 'flex', gap: 8 }}>
                        <span style={{ minWidth: 120 }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>✓ Khớp</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: '#027A48' }}>{fmt(d.bankAmount)}</div>
                    <div style={{ fontSize: 11, color: '#027A48' }}>Chênh lệch $0</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Thông tin Bank</div>
                  <FieldRow label="Transaction ID" value={d.bankTxnId} mono />
                  <FieldRow label="Ngày giao dịch" value={d.bankDate} />
                  <FieldRow label="Description gốc" value={d.bankDesc} />
                  <FieldRow label="Mã tham chiếu" value={d.reference} mono />
                  <FieldRow label="Last 4" value={`•••• ${d.last4}`} mono />
                  <FieldRow label="Amount" value={fmt(d.bankAmount)} mono />
                  <FieldRow label="CS" value={d.cs} />
                  <FieldRow label="Team" value={d.team} />
                  <FieldRow label="Source file" value={d.bankSourceFile} mono />
                  <FieldRow label="Thời gian upload" value={d.bankUploadTime} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Thông tin Facebook Bill</div>
                  <FieldRow label="Bill ID" value={d.fbBillId} mono />
                  <FieldRow label="Ngày Facebook" value={d.fbDate} />
                  <FieldRow label="ID TKQC" value={d.tkqc} mono />
                  <FieldRow label="Mã tham chiếu" value={d.reference} mono />
                  <FieldRow label="Last 4" value={`•••• ${d.last4}`} mono />
                  <FieldRow label="Amount" value={fmt(d.fbAmount)} mono />
                  <FieldRow label="CS" value={d.cs} />
                  <FieldRow label="Team" value={d.team} />
                  <FieldRow label="Source file" value={d.fbSourceFile} mono />
                  <FieldRow label="Thời gian upload" value={d.fbUploadTime} />
                </div>
              </>
            )
          })()}

          {/* ── EXCEPTION DETAIL ── */}
          {record.kind === 'exception' && (() => {
            const d = record.data
            const isAmountMismatch = d.type === 'amount_mismatch'
            return (
              <>
                <div style={{ background: isAmountMismatch ? '#FFFAEB' : '#EFF8FF', border: `1px solid ${isAmountMismatch ? '#FEC84B' : '#B2DDFF'}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isAmountMismatch ? '#B54708' : '#175CD3', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    Kết quả — {isAmountMismatch ? 'Lệch Amount' : 'Trùng mã tham chiếu'}
                  </div>
                  {isAmountMismatch ? (
                    <>
                      <div style={{ fontSize: 12, color: '#B54708' }}>Mã tham chiếu &nbsp;✓ Khớp</div>
                      <div style={{ fontSize: 12, color: '#B54708' }}>Last 4 &nbsp;✓ Khớp</div>
                      <div style={{ fontSize: 12, color: '#B54708' }}>Amount &nbsp;✕ Không khớp</div>
                      <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                        <div><div style={{ fontSize: 11, color: '#B54708' }}>Bank</div><div className="mono" style={{ fontWeight: 700, color: '#B54708' }}>{fmt(d.bankAmount)}</div></div>
                        <div><div style={{ fontSize: 11, color: '#B54708' }}>Facebook</div><div className="mono" style={{ fontWeight: 700, color: '#B54708' }}>{fmt(d.fbAmount)}</div></div>
                        <div><div style={{ fontSize: 11, color: '#B54708' }}>Chênh lệch</div><div className="mono" style={{ fontWeight: 700, color: '#F04438' }}>${d.diff.toFixed(2)}</div></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: '#175CD3', marginBottom: 8 }}>
                        Tìm thấy {d.duplicateRecords?.length ?? 2} bản ghi cùng mã tham chiếu:
                      </div>
                      {(d.duplicateRecords ?? []).map((rec, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, padding: '4px 0', borderBottom: '1px solid #EFF8FF' }}>
                          <span style={{ minWidth: 70, fontWeight: 600, color: rec.source === 'bank' ? '#2563EB' : '#7F56D9' }}>{rec.source === 'bank' ? 'Bank' : 'Facebook'}</span>
                          <span className="mono" style={{ minWidth: 80 }}>{fmt(rec.amount)}</span>
                          <span style={{ color: '#667085' }}>{rec.date}</span>
                          <span className="mono" style={{ color: '#98A2B3', fontSize: 11 }}>{rec.txnId}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <FieldRow label="Loại ngoại lệ" value={<Badge type={isAmountMismatch ? 'warning' : 'info'}>{isAmountMismatch ? 'Lệch Amount' : 'Trùng mã tham chiếu'}</Badge>} />
                <FieldRow label="Ngày" value={d.date} />
                <FieldRow label="CS" value={d.cs} />
                <FieldRow label="Team" value={d.team} />
                <FieldRow label="ID TKQC" value={d.tkqc} mono />
                <FieldRow label="Mã tham chiếu" value={d.reference} mono />
                <FieldRow label="Last 4" value={`•••• ${d.last4}`} mono />
                {d.bankTxnId && <FieldRow label="Bank Txn ID" value={d.bankTxnId} mono />}
                {d.fbBillId && <FieldRow label="Facebook Bill ID" value={d.fbBillId} mono />}
              </>
            )
          })()}

          {/* ── BANK CHƯA ĐỐI SOÁT ── */}
          {record.kind === 'bankUnreconciled' && (() => {
            const d = record.data
            return (
              <>
                <div style={{ background: '#FEF3F2', border: '1px solid #FDA29B', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#B42318', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Chưa tìm thấy Facebook Bill
                  </div>
                  <div style={{ fontSize: 12, color: '#B42318' }}>CS phụ trách: <strong>{d.cs}</strong></div>
                  <div style={{ fontSize: 12, color: '#B42318' }}>TKQC gợi ý: <strong className="mono">{d.tkqc}</strong></div>
                  <div style={{ fontSize: 12, color: '#B42318', marginTop: 4 }}>Trạng thái CS: {csStatusBadge(d.csStatus)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Thông tin Bank</div>
                  <FieldRow label="Transaction ID" value={d.bankTxnId} mono />
                  <FieldRow label="Ngày giao dịch" value={d.bankDate} />
                  <FieldRow label="Description gốc" value={d.bankDesc} />
                  <FieldRow label="Mã tham chiếu" value={d.reference} mono />
                  <FieldRow label="Last 4" value={`•••• ${d.last4}`} mono />
                  <FieldRow label="Amount" value={fmt(d.amount)} mono />
                  <FieldRow label="CS" value={d.cs} />
                  <FieldRow label="Team" value={d.team} />
                  <FieldRow label="Source file" value={d.bankSourceFile} mono />
                  <FieldRow label="Thời gian upload" value={d.bankUploadTime} />
                  <FieldRow label="Thời gian còn lại" value={d.hoursRemaining > 0 ? `${d.hoursRemaining} giờ` : 'Đã hết hạn'} />
                </div>
                {d.hasMissingBillCase && (
                  <button className="btn-secondary" style={{ fontSize: 12.5 }} onClick={onGoMissingBills}>
                    Xem trong Bill thiếu →
                  </button>
                )}
              </>
            )
          })()}

          {/* ── FB CHƯA ĐỐI SOÁT ── */}
          {record.kind === 'fbUnreconciled' && (() => {
            const d = record.data
            const isLate = d.status === 'added_after_close'
            return (
              <>
                {isLate && (
                  <div style={{ background: '#FFFAEB', border: '1px solid #FEC84B', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#B54708', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                      Bill được bổ sung sau khi phiên đã đóng
                    </div>
                    <div style={{ fontSize: 12, color: '#B54708' }}>
                      Bill này có khả năng khớp với giao dịch Bank trong phiên. Kết quả đã chốt của phiên không bị thay đổi.
                    </div>
                  </div>
                )}
                <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    Chưa tìm thấy Bank transaction
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Thông tin Facebook Bill</div>
                  <FieldRow label="Bill ID" value={d.fbBillId} mono />
                  <FieldRow label="Ngày Facebook" value={d.fbDate} />
                  <FieldRow label="ID TKQC" value={d.tkqc} mono />
                  <FieldRow label="Mã tham chiếu" value={d.reference} mono />
                  <FieldRow label="Last 4" value={`•••• ${d.last4}`} mono />
                  <FieldRow label="Amount" value={fmt(d.amount)} mono />
                  <FieldRow label="CS" value={d.cs} />
                  <FieldRow label="Team" value={d.team} />
                  <FieldRow label="Source file" value={d.fbSourceFile} mono />
                  <FieldRow label="Ngày upload" value={d.uploadDate} />
                </div>
              </>
            )
          })()}

        </div>
      </div>
    </div>
  )
}

// ─── Reopen modal ───────────────────────────────────────────────────────────

function availableMonths(): string[] {
  const set = new Set(sessionsV2.map(s => s.date.slice(0, 7)))
  return [...set].sort((a, b) => b.localeCompare(a))
}

function monthLabel(m: string): string {
  const [y, mm] = m.split('-')
  return `Tháng ${mm}/${y}`
}

// A business date can have more than one session, so "Phiên N" must number
// per businessDate (reset for each date) — NEVER by position in the overall
// dropdown list, which would number across dates instead of within a date.
function sessionOptionLabels(sessions: SessionV2[]): Map<string, string> {
  const byDate = new Map<string, SessionV2[]>()
  for (const s of sessions) {
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }
  const labels = new Map<string, string>()
  for (const group of byDate.values()) {
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
    sorted.forEach((s, i) => labels.set(s.id, `${fmtDate(s.date)} — Phiên ${i + 1}`))
  }
  return labels
}

function ReopenModal({ onClose, onReopened }: { onClose: () => void; onReopened: (sessionId: string) => void }) {
  const { currentUser } = useAuth()
  const reopenStore = useReopenStore()
  const months = useMemo(() => availableMonths(), [])
  const [month, setMonth] = useState(months[0] ?? '')
  const [sessionId, setSessionId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const openSessionIds = new Set(reopenStore.cycles.filter(c => c.status === 'OPEN').map(c => c.sessionId))
  const eligible = useMemo(() => (month ? listClosedSessionsInMonth(month, openSessionIds) : []), [month, reopenStore.cycles])
  const eligibleLabels = useMemo(() => sessionOptionLabels(eligible), [eligible])

  function handleMonthChange(next: string) {
    setMonth(next)
    setSessionId('')
  }

  function submit() {
    if (!sessionId) { setError('Vui lòng chọn phiên cần mở lại.'); return }
    const result = reopenStore.reopenSession({
      sessionId, deadline, reason,
      actor: { id: currentUser!.id, name: currentUser!.displayName, role: currentUser!.role },
    })
    if (!result.ok) { setError(result.error); return }
    onReopened(sessionId)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>MỞ LẠI PHIÊN</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>Tháng nghiệp vụ *</label>
            <select className="select-input" style={{ width: '100%' }} value={month} onChange={e => handleMonthChange(e.target.value)}>
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>Phiên cần mở lại *</label>
            {eligible.length === 0 ? (
              <div style={{ fontSize: 12, color: '#98A2B3' }}>Không có phiên đã đóng nào trong tháng này có thể mở lại.</div>
            ) : (
              <select className="select-input" style={{ width: '100%' }} value={sessionId} onChange={e => setSessionId(e.target.value)}>
                <option value="">— Chọn phiên —</option>
                {eligible.map(s => <option key={s.id} value={s.id}>{eligibleLabels.get(s.id)}</option>)}
              </select>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>Hạn xử lý *</label>
            <input type="datetime-local" className="text-input" style={{ width: '100%' }} value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>Lý do mở lại *</label>
            <textarea
              className="text-input" style={{ width: '100%', height: 70, paddingTop: 8, resize: 'vertical', fontFamily: 'inherit' }}
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ví dụ: Phát hiện thiếu Bill Bank khi rà soát lại ngày 10/08/2026."
            />
          </div>
          {error && <div style={{ fontSize: 12, color: '#B42318' }}>{error}</div>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn-primary" onClick={submit}>Mở lại phiên</button>
        </div>
      </div>
    </div>
  )
}

// ─── Close Gate modal ───────────────────────────────────────────────────────

function CloseSessionModal({ session, onClose, onClosed }: { session: SessionV2; onClose: () => void; onClosed: () => void }) {
  const { currentUser } = useAuth()
  const reopenStore = useReopenStore()
  const [error, setError] = useState<string | null>(null)
  const gate = reopenStore.getCloseGateSummary(session.id)

  function submit() {
    const result = reopenStore.recloseSession({ sessionId: session.id, actor: { id: currentUser!.id, name: currentUser!.displayName, role: currentUser!.role } })
    if (!result.ok) { setError(result.error); return }
    onClosed()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>ĐÓNG LẠI PHIÊN</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 6 }}>Phiên {fmtDate(session.date)} — tổng kết chu kỳ mở lại hiện tại:</div>
          {[
            ['Bank bổ sung', gate.bankAdded],
            ['Đã đối soát thêm', gate.reconciledAdded],
            ['Giải trình đã duyệt', gate.explanationApproved],
            ['Chưa xử lý', gate.unresolved],
            ['Chờ duyệt', gate.pendingApproval],
          ].map(([label, value]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span style={{ color: '#667085' }}>{label}</span>
              <span style={{ fontWeight: 600, color: (label === 'Chưa xử lý' || label === 'Chờ duyệt') && (value as number) > 0 ? '#B42318' : '#182230' }}>{value}</span>
            </div>
          ))}
          {!gate.canClose && (
            <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#B42318', marginTop: 6 }}>
              Không thể đóng phiên: còn {gate.blockReason}.
            </div>
          )}
          {error && <div style={{ fontSize: 12, color: '#B42318' }}>{error}</div>}
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Huỷ</button>
          <button className="btn-primary" disabled={!gate.canClose} onClick={submit}>Xác nhận đóng lại phiên</button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabKey = 'reconciled' | 'exceptions' | 'bank_unreconciled' | 'fb_unreconciled' | 'reopen_bank'

// ─── Session Detail Page ─────────────────────────────────────────────────────

function SessionDetailPage({ session, onBack, onGoMissingBills }: {
  session: SessionV2; onBack: () => void; onGoMissingBills: () => void;
}) {
  const { currentUser } = useAuth()
  const reopenStore = useReopenStore()
  const fbStore = useFacebookUploadStore()
  const [activeTab, setActiveTab] = useState<TabKey>('reconciled')
  const [teamFilter, setTeamFilter] = useState('all')
  const [csFilter, setCsFilter] = useState('all')
  const [tkqcSearch, setTkqcSearch] = useState('')
  const [last4Search, setLast4Search] = useState('')
  const [refSearch, setRefSearch] = useState('')
  const [drawerRecord, setDrawerRecord] = useState<DrawerRecord | null>(null)
  const [exportNotice, setExportNotice] = useState('')
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [importNotice, setImportNotice] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const canReopen = canManageReopen(currentUser!.role)
  const effectiveStatus = reopenStore.getEffectiveStatus(session)
  const isReopened = effectiveStatus === 'reopened'
  const openCycle = reopenStore.getOpenCycle(session.id)
  const cyclesForSession = reopenStore.getCyclesForSession(session.id)
  const reopenBankRows = fbStore.getReopenBankBillsForSession(session.id)

  async function handleBankFile(file: File) {
    setImportError(null); setImportNotice(null)
    const parsed = isExcelFileName(file.name) ? parseBankXlsxFile(file.name, await file.arrayBuffer()) : parseBankCsvFile(file.name, await file.text())
    const result = reopenStore.importBankFile({
      sessionId: session.id, fileName: file.name, parsed,
      actor: { id: currentUser!.id, name: currentUser!.displayName, role: currentUser!.role },
    })
    if (!result.ok) { setImportError(result.error); return }
    setImportNotice(`Đã import ${result.imported} Bill Bank (bỏ qua ${result.duplicates} trùng lặp, ${result.invalidRows} dòng lỗi${result.unresolvedOwnership > 0 ? `, ${result.unresolvedOwnership} dòng không xác định được CS phụ trách` : ''}).`)
  }

  const records = sessionDetails[session.id]
  const pct = session.bankTotal > 0 ? (session.reconciledAmount / session.bankTotal) * 100 : 0

  const availableCs = useMemo(() => {
    if (teamFilter === 'all') return csMembers
    return csMembers.filter(c => csTeamMap[c] === teamFilter)
  }, [teamFilter])

  function matchesFilter(r: { cs: string; team: string; tkqc: string; reference: string; last4: string }) {
    if (teamFilter !== 'all' && r.team !== teamFilter) return false
    if (csFilter !== 'all' && r.cs !== csFilter) return false
    if (tkqcSearch && !r.tkqc.toLowerCase().includes(tkqcSearch.toLowerCase())) return false
    if (last4Search && !r.last4.includes(last4Search)) return false
    if (refSearch && !r.reference.toLowerCase().includes(refSearch.toLowerCase())) return false
    return true
  }

  const filteredReconciled = records ? records.reconciled.filter(r => matchesFilter(r)) : []
  const filteredExceptions = records ? records.exceptions.filter(r => matchesFilter(r)) : []
  const filteredBankUnrecon = records ? records.bankUnreconciled.filter(r => matchesFilter(r)) : []
  const filteredFbUnrecon = records ? records.fbUnreconciled.filter(r => matchesFilter(r)) : []

  function handleExport() {
    const tabLabels: Record<TabKey, string> = {
      reconciled: 'Da_doi_soat',
      exceptions: 'Ngoai_le',
      bank_unreconciled: 'Bank_chua_doi_soat',
      fb_unreconciled: 'Facebook_chua_doi_soat',
      reopen_bank: 'Bo_sung_mo_lai',
    }
    const dateStr = session.date.replace(/-/g, '').slice(2)
    const filename = `Doi_soat_${dateStr}_${tabLabels[activeTab]}.xlsx`
    setExportNotice(`Đã xuất: ${filename}`)
    setTimeout(() => setExportNotice(''), 3000)
  }

  const tabs: { key: TabKey; label: string; bills: number; amount: number; icon: React.ReactNode }[] = [
    {
      key: 'reconciled', label: 'Đã đối soát', bills: session.reconciledBills, amount: session.reconciledAmount,
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      key: 'exceptions', label: 'Ngoại lệ', bills: session.exceptionsBills, amount: session.exceptionsAmount,
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 4v3M6.5 9.5v.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    },
    {
      key: 'bank_unreconciled', label: 'Bank chưa đối soát', bills: session.unreconciledBills, amount: session.unreconciledAmount,
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3.5" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4 3.5V3a2 2 0 014 0v.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
    },
    {
      key: 'fb_unreconciled', label: 'Facebook chưa đối soát', bills: session.fbUnreconciledBills, amount: session.fbUnreconciledAmount,
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M7 2H5C3.9 2 3 2.9 3 4v5c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2V6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9 2l2 2-4 4H5V6l4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    // Only shown once this session has ever been reopened (task §25/40) —
    // never a tab on a plain, never-reopened session.
    ...(cyclesForSession.length > 0 ? [{
      key: 'reopen_bank' as TabKey, label: 'Bổ sung (Mở lại)', bills: reopenBankRows.length,
      amount: Math.round(reopenBankRows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    }] : []),
  ]

  const isClosed = effectiveStatus === 'closed' || effectiveStatus === 'closed_pending'

  return (
    <div className="page-content">
      {/* Back button */}
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 13, padding: '0 0 14px 0', fontFamily: 'inherit' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Quay lại danh sách phiên
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Phiên đối soát {fmtDate(session.date)}</div>
            {statusBadge(effectiveStatus)}
            {session.status === 'closed_pending' && !isReopened && <Badge type="error">Còn tồn đọng</Badge>}
            {cyclesForSession.length > 0 && <span style={{ fontSize: 11.5, color: '#98A2B3' }}>Đã mở lại {cyclesForSession.length} lần</span>}
          </div>
          <div style={{ fontSize: 12.5, color: '#667085', display: 'flex', gap: 16 }}>
            {isReopened && openCycle ? (
              <>
                <span>Hạn xử lý (mở lại): <strong style={{ color: '#B42318' }}>{new Date(openCycle.deadline).toLocaleString('vi-VN')}</strong></span>
                <span>Mở lại bởi: <strong>{openCycle.reopenedByName}</strong> lúc {openCycle.reopenedAt}</span>
              </>
            ) : (
              <>
                <span>Hạn xử lý: <strong>{fmtDate(session.processingDeadline)}</strong></span>
                {!isClosed && <span style={{ color: session.hoursRemaining <= 6 ? '#F04438' : '#344054', fontWeight: 600 }}>Còn {session.hoursRemaining} giờ</span>}
                {isClosed && session.closedDate && <span style={{ color: '#667085' }}>Đã đóng ngày {fmtDate(session.closedDate)}</span>}
              </>
            )}
          </div>
          {isReopened && openCycle && (
            <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 4 }}>Lý do mở lại: {openCycle.reason}</div>
          )}
        </div>
        {canReopen && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {isClosed && !isReopened && (
              <button className="btn-primary" onClick={() => setShowReopenModal(true)}>Mở lại phiên</button>
            )}
            {isReopened && (
              <button className="btn-primary" style={{ background: '#B42318', borderColor: '#B42318' }} onClick={() => setShowCloseModal(true)}>Đóng lại phiên</button>
            )}
          </div>
        )}
      </div>

      {/* Bổ sung Bill Bank — only while a Reopen Cycle is open (task §19) */}
      {isReopened && canReopen && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#182230', marginBottom: 8 }}>Bổ sung Bill Bank</div>
          <label className="upload-zone" style={{ display: 'block', padding: '14px 16px', cursor: 'pointer', maxWidth: 360 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#182230', marginBottom: 3 }}>Chọn file Bank (.csv, .xlsx)</div>
            <div style={{ fontSize: 11.5, color: '#98A2B3' }}>Reuse định dạng Bank hiện có</div>
            <input
              type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleBankFile(f); e.target.value = '' }}
            />
          </label>
          {importNotice && <div style={{ fontSize: 12, color: '#027A48', marginTop: 8 }}>{importNotice}</div>}
          {importError && <div style={{ fontSize: 12, color: '#B42318', marginTop: 8 }}>{importError}</div>}
        </div>
      )}

      {/* KPI Cards — row 1: 3 totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Tổng chi tiêu Sheet', value: fmt(session.sheetTotal), sub: '' },
          { label: 'Tổng Bill Bank', value: fmt(session.bankTotal), sub: `Bank chưa ĐS: ${fmt(session.unreconciledAmount)}`, subColor: '#B54708' },
          { label: 'Tổng Bill Facebook', value: fmt(session.fbTotal), sub: `FB chưa ĐS: ${fmt(session.fbUnreconciledAmount)}`, subColor: '#7F56D9' },
        ].map(k => (
          <div key={k.label} className="kpi-card" style={{ cursor: 'default' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#182230', marginBottom: 2 }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 12, color: k.subColor || '#98A2B3', fontWeight: 500 }}>{k.sub}</div>}
          </div>
        ))}
      </div>
      {/* KPI Cards — row 2: 4 operational */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Đã đối soát', value: fmt(session.reconciledAmount), sub: `${session.reconciledBills.toLocaleString()} bill`, subColor: '#027A48' },
          { label: 'Bank chưa đối soát', value: fmt(session.unreconciledAmount), sub: `${session.unreconciledBills.toLocaleString()} bill`, subColor: '#B54708' },
          { label: 'Facebook chưa đối soát', value: fmt(session.fbUnreconciledAmount), sub: `${session.fbUnreconciledBills.toLocaleString()} bill`, subColor: '#7F56D9' },
          { label: 'Ngoại lệ', value: fmt(session.exceptionsAmount), sub: `${session.exceptionsBills.toLocaleString()} bill`, subColor: '#B42318' },
        ].map(k => (
          <div key={k.label} className="kpi-card" style={{ cursor: 'default' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#182230' }}>{pct.toFixed(1)}% đã đối soát</span>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>{fmt(session.reconciledAmount)} / {fmt(session.bankTotal)}</span>
        </div>
        <div className="progress-bar-track" style={{ height: 8 }}><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
        {session.unreconciledAmount > 0 && <div style={{ fontSize: 12, color: '#F79009', marginTop: 5, fontWeight: 500 }}>Còn lại {fmt(session.unreconciledAmount)} · {session.unreconciledBills.toLocaleString()} bill</div>}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10 }}>
        <select className="select-input" value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCsFilter('all') }}>
          <option value="all">Tất cả Team</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select-input" value={csFilter} onChange={e => setCsFilter(e.target.value)}>
          <option value="all">Tất cả CS</option>
          {availableCs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ width: 1, height: 20, background: '#E4E7EC' }} />
        <input className="text-input" placeholder="Tìm ID TKQC" value={tkqcSearch} onChange={e => setTkqcSearch(e.target.value)} style={{ width: 140 }} />
        <input className="text-input" placeholder="Tìm Last 4" value={last4Search} onChange={e => setLast4Search(e.target.value)} style={{ width: 110 }} />
        <input className="text-input" placeholder="Tìm mã tham chiếu" value={refSearch} onChange={e => setRefSearch(e.target.value)} style={{ width: 160 }} />
        {(teamFilter !== 'all' || csFilter !== 'all' || tkqcSearch || last4Search || refSearch) && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setTeamFilter('all'); setCsFilter('all'); setTkqcSearch(''); setLast4Search(''); setRefSearch('') }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="card">
        {/* Tab header — compact single-line */}
        <div style={{ display: 'flex', borderBottom: '2px solid #E4E7EC', padding: '0 4px' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  marginBottom: -2, fontFamily: 'inherit',
                  color: isActive ? '#2563EB' : '#667085',
                  fontWeight: isActive ? 600 : 500, fontSize: 13,
                  whiteSpace: 'nowrap',
                }}>
                <span style={{ opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
                {tab.label}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 20, height: 18, padding: '0 5px', borderRadius: 9,
                  fontSize: 11, fontWeight: 700, lineHeight: 1,
                  background: isActive ? '#2563EB' : '#F2F4F7',
                  color: isActive ? '#fff' : '#667085',
                }}>
                  {tab.bills.toLocaleString()}
                </span>
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
        </div>

        {/* Summary bar for active tab */}
        {(() => {
          const tab = tabs.find(t => t.key === activeTab)!
          return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #E4E7EC', background: '#FAFAFA' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#182230' }}>{tab.label}</span>
                <span style={{ fontSize: 12.5, color: '#667085', marginLeft: 10 }}>
                  {tab.bills.toLocaleString()} bill &nbsp;·&nbsp; Tổng giá trị <span className="mono" style={{ fontWeight: 600, color: '#344054' }}>{fmt(tab.amount)}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {exportNotice && <span style={{ fontSize: 12, color: '#027A48', fontWeight: 500 }}>{exportNotice}</span>}
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleExport}>
                  Xuất file
                </button>
              </div>
            </div>
          )
        })()}

        {/* Tab content */}
        <div style={{ overflowX: 'auto' }}>

          {/* TAB 1: Đã đối soát */}
          {activeTab === 'reconciled' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th>Ngày Bank</th><th>Ngày FB</th><th>CS</th><th>TKQC</th>
                <th>Mã tham chiếu</th><th>Last 4</th>
                <th style={{ textAlign: 'right' }}>Bill Bank</th>
                <th style={{ textAlign: 'right' }}>Bill FB</th>
                <th style={{ textAlign: 'right' }}>Chênh lệch</th>
                <th>Kết quả</th>
              </tr></thead>
              <tbody>
                {filteredReconciled.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px 14px' }}>
                    <div style={{ color: '#344054', fontWeight: 600, marginBottom: 4 }}>Không có Bill đã đối soát</div>
                    <div style={{ fontSize: 12, color: '#98A2B3' }}>Tất cả Bill Bank trong phạm vi hiện tại đã được đối soát.</div>
                  </td></tr>
                )}
                {filteredReconciled.map(r => (
                  <tr key={r.id} className="table-row-hover" onClick={() => setDrawerRecord({ kind: 'reconciled', data: r })}>
                    <td style={{ fontSize: 12.5 }}>{r.bankDate}</td>
                    <td style={{ fontSize: 12.5, color: '#667085' }}>{r.fbDate}</td>
                    <td style={{ fontWeight: 500 }}>{r.cs}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: '#667085' }}>{r.tkqc}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.reference}</td>
                    <td className="mono" style={{ fontSize: 12 }}>•••• {r.last4}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(r.bankAmount)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(r.fbAmount)}</td>
                    <td className="mono" style={{ textAlign: 'right', color: '#12B76A' }}>${r.diff.toFixed(2)}</td>
                    <td><Badge type="success">Đã khớp</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: Ngoại lệ */}
          {activeTab === 'exceptions' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th>Loại ngoại lệ</th><th>Ngày</th><th>CS</th><th>TKQC</th>
                <th>Mã tham chiếu</th><th>Last 4</th>
                <th style={{ textAlign: 'right' }}>Bill Bank</th>
                <th style={{ textAlign: 'right' }}>Bill FB</th>
                <th style={{ textAlign: 'right' }}>Chênh lệch</th>
                <th>Trạng thái</th>
              </tr></thead>
              <tbody>
                {filteredExceptions.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px 14px' }}>
                    <div style={{ color: '#344054', fontWeight: 600, marginBottom: 4 }}>Không có ngoại lệ</div>
                    <div style={{ fontSize: 12, color: '#98A2B3' }}>Không tìm thấy ngoại lệ nào phù hợp với bộ lọc.</div>
                  </td></tr>
                )}
                {filteredExceptions.map(r => (
                  <tr key={r.id} className="table-row-hover" onClick={() => setDrawerRecord({ kind: 'exception', data: r })}>
                    <td><Badge type={r.type === 'amount_mismatch' ? 'warning' : 'info'}>{r.type === 'amount_mismatch' ? 'Lệch Amount' : 'Trùng mã tham chiếu'}</Badge></td>
                    <td style={{ fontSize: 12.5 }}>{r.date}</td>
                    <td style={{ fontWeight: 500 }}>{r.cs}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: '#667085' }}>{r.tkqc}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.reference}</td>
                    <td className="mono" style={{ fontSize: 12 }}>•••• {r.last4}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(r.bankAmount)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(r.fbAmount)}</td>
                    <td className="mono" style={{ textAlign: 'right', color: r.diff > 0 ? '#F04438' : '#98A2B3' }}>{r.diff > 0 ? `$${r.diff.toFixed(2)}` : '—'}</td>
                    <td><Badge type={r.status === 'can_kiem_tra' ? 'warning' : 'info'}>{r.status === 'can_kiem_tra' ? 'Cần kiểm tra' : 'Cần xác minh'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: Bank chưa đối soát */}
          {activeTab === 'bank_unreconciled' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th>Ngày Bank</th><th>CS phụ trách</th><th>TKQC gợi ý</th>
                <th>Mã tham chiếu</th><th>Last 4</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Trạng thái CS</th>
                <th>Thời gian còn lại</th>
                <th></th>
              </tr></thead>
              <tbody>
                {filteredBankUnrecon.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 14px' }}>
                    <div style={{ color: '#344054', fontWeight: 600, marginBottom: 4 }}>Không có Bill Bank chưa đối soát</div>
                    <div style={{ fontSize: 12, color: '#98A2B3' }}>Tất cả Bill Bank trong phạm vi hiện tại đã được đối soát.</div>
                  </td></tr>
                )}
                {filteredBankUnrecon.map(r => (
                  <tr key={r.id} className="table-row-hover" onClick={() => setDrawerRecord({ kind: 'bankUnreconciled', data: r })}>
                    <td style={{ fontSize: 12.5 }}>{r.bankDate}</td>
                    <td style={{ fontWeight: 500 }}>{r.cs}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: '#667085' }}>{r.tkqc}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.reference}</td>
                    <td className="mono" style={{ fontSize: 12 }}>•••• {r.last4}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(r.amount)}</td>
                    <td>{csStatusBadge(r.csStatus)}</td>
                    <td className="mono" style={{ fontSize: 12.5, color: r.hoursRemaining > 0 && r.hoursRemaining <= 6 ? '#F04438' : r.hoursRemaining === 0 ? '#98A2B3' : '#344054', fontWeight: 600 }}>
                      {r.hoursRemaining > 0 ? `${r.hoursRemaining}h` : 'Đã hết hạn'}
                    </td>
                    <td>{r.hasMissingBillCase && <button className="btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={e => { e.stopPropagation(); onGoMissingBills() }}>Bill thiếu →</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 4: Facebook chưa đối soát */}
          {activeTab === 'fb_unreconciled' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th>Ngày FB</th><th>CS</th><th>TKQC</th>
                <th>Mã tham chiếu</th><th>Last 4</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Ngày upload</th>
                <th>Trạng thái</th>
              </tr></thead>
              <tbody>
                {filteredFbUnrecon.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 14px' }}>
                    <div style={{ color: '#344054', fontWeight: 600, marginBottom: 4 }}>Không có Bill Facebook chưa đối soát</div>
                    <div style={{ fontSize: 12, color: '#98A2B3' }}>Tất cả Bill Facebook trong phạm vi hiện tại đã được đối soát.</div>
                  </td></tr>
                )}
                {filteredFbUnrecon.map(r => (
                  <tr key={r.id} className="table-row-hover" onClick={() => setDrawerRecord({ kind: 'fbUnreconciled', data: r })}>
                    <td style={{ fontSize: 12.5 }}>{r.fbDate}</td>
                    <td style={{ fontWeight: 500 }}>{r.cs}</td>
                    <td className="mono" style={{ fontSize: 11.5, color: '#667085' }}>{r.tkqc}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.reference}</td>
                    <td className="mono" style={{ fontSize: 12 }}>•••• {r.last4}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(r.amount)}</td>
                    <td style={{ fontSize: 12, color: '#667085' }}>{r.uploadDate}</td>
                    <td>
                      {r.status === 'added_after_close'
                        ? <Badge type="warning">Bổ sung sau khi đóng</Badge>
                        : <Badge type="gray">Chưa tìm thấy Bank</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 5: Bổ sung (Mở lại) — only rendered when this session has ever been reopened */}
          {activeTab === 'reopen_bank' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th>Ngày giao dịch</th><th>CS phụ trách</th>
                <th>Mã tham chiếu</th><th>Last 4</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
              </tr></thead>
              <tbody>
                {reopenBankRows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 14px' }}>
                    <div style={{ color: '#344054', fontWeight: 600, marginBottom: 4 }}>Chưa có Bill Bank bổ sung nào</div>
                  </td></tr>
                )}
                {reopenBankRows.map(r => {
                  const resolved = fbStore.getResolvedBankTxnIds(r.ownerCsId, session.id).has(r.txnId)
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12.5 }}>{r.bankDate}</td>
                      <td style={{ fontWeight: 500 }}>{r.ownerCsName}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{r.reference}</td>
                      <td className="mono" style={{ fontSize: 12 }}>•••• {r.last4}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{fmt(r.amount)}</td>
                      <td style={{ fontSize: 11.5, color: '#98A2B3' }}>{r.sourceFileName}</td>
                      <td>{resolved ? <Badge type="success">Đã đối soát</Badge> : <Badge type="gray">Chưa đối soát</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
          Nhấn vào hàng để xem chi tiết · Bộ lọc được giữ khi đổi Tab
        </div>
      </div>

      {drawerRecord && (
        <RecordDrawer record={drawerRecord} onClose={() => setDrawerRecord(null)} onGoMissingBills={onGoMissingBills} />
      )}
      {showReopenModal && (
        <ReopenModal onClose={() => setShowReopenModal(false)} onReopened={() => setShowReopenModal(false)} />
      )}
      {showCloseModal && (
        <CloseSessionModal session={session} onClose={() => setShowCloseModal(false)} onClosed={() => setShowCloseModal(false)} />
      )}
    </div>
  )
}

// ─── Session List Page ─────────────────────────────────────────────────────────

type ViewMode = 'list' | 'detail'

export default function Sessions({ onGoMissingBills }: { onGoMissingBills?: () => void }) {
  const { currentUser } = useAuth()
  const reopenStore = useReopenStore()
  const [view, setView] = useState<ViewMode>('list')
  const [selectedSession, setSelectedSession] = useState<SessionV2 | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<EffectiveSessionStatus | 'all'>('all')
  const [showReopenModal, setShowReopenModal] = useState(false)

  const canReopen = canManageReopen(currentUser!.role)

  const filtered = sessionsV2.filter(s => {
    const effective = reopenStore.getEffectiveStatus(s)
    if (statusFilter !== 'all' && effective !== statusFilter) return false
    if (dateFilter && s.date !== dateFilter) return false
    return true
  })

  function openDetail(s: SessionV2) {
    setSelectedSession(s)
    setView('detail')
  }

  if (view === 'detail' && selectedSession) {
    return (
      <SessionDetailPage
        session={selectedSession}
        onBack={() => setView('list')}
        onGoMissingBills={() => { onGoMissingBills?.() }}
      />
    )
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Phiên đối soát</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
            Theo dõi tiến độ và kết quả đối soát theo từng ngày dữ liệu.
          </div>
        </div>
        {canReopen && <button className="btn-primary" onClick={() => setShowReopenModal(true)}>Mở lại phiên</button>}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="#667085" strokeWidth="1.3"/><path d="M1 5h12M4 1v2M10 1v2" stroke="#667085" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <label style={{ fontSize: 12, color: '#667085' }}>Ngày phiên:</label>
          <input type="date" className="text-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: 148 }} />
        </div>
        <div style={{ width: 1, height: 20, background: '#E4E7EC' }} />
        <div style={{ display: 'flex', gap: 4, background: '#F9FAFB', borderRadius: 7, padding: 3, flexWrap: 'wrap' }}>
          {([['all', 'Tất cả'], ['active', 'Đang đối soát'], ['closing_soon', 'Sắp đóng'], ['reopened', 'Đã mở lại'], ['closed', 'Đã đóng'], ['closed_pending', 'Đã đóng còn tồn đọng']] as [string, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val as EffectiveSessionStatus | 'all')}
              style={{ padding: '4px 11px', borderRadius: 5, border: 'none', cursor: 'pointer', background: statusFilter === val ? '#2563EB' : 'transparent', color: statusFilter === val ? '#fff' : '#667085', fontFamily: 'inherit', fontSize: 12, fontWeight: statusFilter === val ? 600 : 500, transition: 'all 0.12s', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
        {(dateFilter || statusFilter !== 'all') && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setDateFilter(''); setStatusFilter('all') }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Ngày phiên</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Tổng chi tiêu Sheet</th>
                <th style={{ textAlign: 'right' }}>Tổng Bill Bank</th>
                <th style={{ textAlign: 'right' }}>Tổng Bill FB</th>
                <th style={{ minWidth: 130 }}>Tiến độ</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Bank chưa ĐS</th>
                <th style={{ textAlign: 'right' }}>FB chưa ĐS</th>
                <th style={{ textAlign: 'right' }}>Ngoại lệ</th>
                <th>Hạn xử lý</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: '32px 14px' }}>
                  <div style={{ color: '#344054', fontWeight: 600, marginBottom: 4 }}>Không tìm thấy phiên nào</div>
                  <div style={{ fontSize: 12, color: '#98A2B3' }}>Thử xóa bộ lọc để xem tất cả phiên.</div>
                </td></tr>
              )}
              {filtered.map(s => {
                const pct = s.bankTotal > 0 ? (s.reconciledAmount / s.bankTotal) * 100 : 0
                const effective = reopenStore.getEffectiveStatus(s)
                const isClosed = effective === 'closed' || effective === 'closed_pending'
                return (
                  <tr key={s.id} className="table-row-hover" onClick={() => openDetail(s)}>
                    <td><span style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(s.date)}</span></td>
                    <td>{statusBadge(effective)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(s.sheetTotal)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(s.bankTotal)}</td>
                    <td style={{ textAlign: 'right' }} className="mono">{fmt(s.fbTotal)}</td>
                    <td style={{ minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar-track" style={{ flex: 1 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: isClosed && s.status !== 'closed_pending' ? '#12B76A' : undefined }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11.5, color: '#182230', minWidth: 42, textAlign: 'right', fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 600, color: '#027A48' }}>{fmt(s.reconciledAmount)}</div>
                      <div style={{ fontSize: 11, color: '#98A2B3' }}>{s.reconciledBills.toLocaleString()} bill</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.unreconciledAmount > 0 ? (
                        <>
                          <div className="mono" style={{ fontWeight: 600, color: '#B54708' }}>{fmt(s.unreconciledAmount)}</div>
                          <div style={{ fontSize: 11, color: '#98A2B3' }}>{s.unreconciledBills.toLocaleString()} bill</div>
                        </>
                      ) : <span style={{ fontSize: 12, color: '#12B76A', fontWeight: 600 }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.fbUnreconciledAmount > 0 ? (
                        <>
                          <div className="mono" style={{ fontWeight: 600, color: '#7F56D9' }}>{fmt(s.fbUnreconciledAmount)}</div>
                          <div style={{ fontSize: 11, color: '#98A2B3' }}>{s.fbUnreconciledBills.toLocaleString()} bill</div>
                        </>
                      ) : <span style={{ fontSize: 12, color: '#12B76A', fontWeight: 600 }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.exceptionsAmount > 0 ? (
                        <>
                          <div className="mono" style={{ fontWeight: 600, color: '#F04438' }}>{fmt(s.exceptionsAmount)}</div>
                          <div style={{ fontSize: 11, color: '#98A2B3' }}>{s.exceptionsBills.toLocaleString()} bill</div>
                        </>
                      ) : <span style={{ fontSize: 12, color: '#12B76A', fontWeight: 600 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12.5, color: !isClosed && s.hoursRemaining <= 6 ? '#F04438' : '#667085', fontWeight: !isClosed && s.hoursRemaining <= 6 ? 600 : 400 }}>
                      {fmtDate(s.processingDeadline)}
                      {!isClosed && <div style={{ fontSize: 11, color: s.hoursRemaining <= 6 ? '#F04438' : '#98A2B3', fontWeight: 500 }}>Còn {s.hoursRemaining}h</div>}
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }} onClick={e => { e.stopPropagation(); openDetail(s) }}>
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#667085' }}>{filtered.length} phiên</span>
          <span style={{ fontSize: 12, color: '#667085' }}>Nhấn hàng hoặc "Xem chi tiết" để drill-down</span>
        </div>
      </div>

      {showReopenModal && (
        <ReopenModal onClose={() => setShowReopenModal(false)} onReopened={() => setShowReopenModal(false)} />
      )}
    </div>
  )
}
