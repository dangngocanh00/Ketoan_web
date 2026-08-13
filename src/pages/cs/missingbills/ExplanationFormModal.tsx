import { useMemo, useState } from 'react'
import { fmt, fmtDate } from '../../../data/sharedData'
import { findCase, getUnresolvedBankRecords } from '../../../domain/bankBills'
import { useExplanationStore } from '../../../domain/explanationStore'
import { EXPLANATION_REASON_LABEL } from '../../../domain/explanationTypes'
import type { ExplanationReason } from '../../../domain/explanationTypes'
import type { EvidenceImage, MissingBillRecord } from '../../../data/mock'
import { Badge } from '../shared'
import EvidenceUploader from './EvidenceUploader'

const REASON_OPTIONS: ExplanationReason[] = ['acc_die', 'no_share', 'back']

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function summarize(records: MissingBillRecord[]) {
  return { bills: records.length, amount: round2(records.reduce((s, r) => s + r.amount, 0)) }
}

interface Prefill {
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
  prefill?: Prefill
  onClose: () => void
  onSubmitted: () => void
}

// §27-39: the explanation form — always covers the CS's ENTIRE unresolved
// Bank Bill set for this session (never a per-bill selection), with
// mandatory revalidation right before submit so a stale snapshot can never
// go out (§37-39).
export default function ExplanationFormModal({ csId, csName, teamName, sessionId, sessionDate, prefill, onClose, onSubmitted }: Props) {
  const { getLookup, submit } = useExplanationStore()
  const live = useMemo(() => getLookup(csId), [getLookup, csId])
  const mbc = useMemo(() => findCase(csId, sessionId), [csId, sessionId])

  const [billRecords, setBillRecords] = useState<MissingBillRecord[]>(() =>
    getUnresolvedBankRecords(mbc, live.getResolvedIds(sessionId)),
  )
  const [reasons, setReasons] = useState<ExplanationReason[]>(prefill?.reasons ?? [])
  const [note, setNote] = useState(prefill?.note ?? '')
  const [evidence, setEvidence] = useState<EvidenceImage[]>(prefill?.evidence ?? [])
  const [mode, setMode] = useState<'form' | 'confirm' | 'mismatch'>('form')
  const [mismatchRecords, setMismatchRecords] = useState<MissingBillRecord[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const summary = summarize(billRecords)

  function toggleReason(r: ExplanationReason) {
    setReasons(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]))
  }

  function handleReviewClick() {
    if (reasons.length === 0) { setErrorMsg('Vui lòng chọn ít nhất 1 lý do.'); return }
    if (evidence.length === 0) { setErrorMsg('Vui lòng đính kèm ít nhất 1 ảnh bằng chứng.'); return }
    setErrorMsg('')

    // §37: revalidate right before submit — never trust the snapshot taken
    // when the form was opened.
    const current = getUnresolvedBankRecords(mbc, live.getResolvedIds(sessionId))
    const openedIds = new Set(billRecords.map(r => r.txnId))
    const currentIds = new Set(current.map(r => r.txnId))
    const sameSet = openedIds.size === currentIds.size && [...openedIds].every(id => currentIds.has(id))
    if (!sameSet) {
      setMismatchRecords(current)
      setMode('mismatch')
      return
    }
    setMode('confirm')
  }

  function handleUpdateList() {
    // §38: keep reasons/note/evidence, only refresh the Bill list/count/amount.
    setBillRecords(mismatchRecords)
    setMode('form')
  }

  function handleConfirmSubmit() {
    setSubmitting(true)
    const result = submit({ csId, csName, teamName, sessionId, sessionDate, reasons, note, evidence })
    setSubmitting(false)
    if (result.ok) onSubmitted()
    else { setErrorMsg(result.error); setMode('form') }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ width: 760 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4E7EC' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>Giải trình Bill còn thiếu</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 3 }}>
            Phiên {fmtDate(sessionDate)} · {csName}
          </div>
        </div>

        <div style={{ padding: '18px 24px', flex: 1, overflowY: 'auto' }}>
          <div className="card" style={{ padding: '10px 14px', marginBottom: 18, display: 'inline-block' }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>{summary.bills} Bill</span>
            <span style={{ color: '#98A2B3', margin: '0 6px' }}>·</span>
            <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>{fmt(summary.amount)}</span>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 8 }}>
              Lý do giải trình <span style={{ color: '#F04438' }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {REASON_OPTIONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: '#182230' }}>
                  <input type="checkbox" checked={reasons.includes(r)} onChange={() => toggleReason(r)} style={{ width: 15, height: 15, accentColor: '#2563EB' }} />
                  {EXPLANATION_REASON_LABEL[r]}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 8 }}>Ghi chú</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Không bắt buộc"
              rows={3}
              className="text-input"
              style={{ width: '100%', height: 'auto', padding: 10, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 8 }}>
              Bằng chứng <span style={{ color: '#F04438' }}>*</span>
            </div>
            <EvidenceUploader evidence={evidence} onChange={setEvidence} />
          </div>

          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 8 }}>
              Danh sách Bill giải trình — {summary.bills} Bill · {fmt(summary.amount)}
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', maxHeight: 260 }}>
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
                    {billRecords.map(r => (
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
          </div>

          {errorMsg && (
            <div style={{ marginTop: 14, background: '#FEF3F2', color: '#B42318', border: '1px solid #FEE4E2', borderRadius: 8, padding: '9px 12px', fontSize: 12.5 }}>
              {errorMsg}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleReviewClick}>Gửi giải trình</button>
        </div>
      </div>

      {/* §37: revalidation mismatch */}
      {mode === 'mismatch' && (
        <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
          <div className="card" style={{ width: 440, padding: 22, background: '#fff' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#182230', marginBottom: 10 }}>Danh sách Bill đã thay đổi</div>
            <div style={{ fontSize: 13, color: '#344054', lineHeight: 1.6, marginBottom: 18 }}>
              Khi bạn bắt đầu giải trình có {summary.bills} Bill chưa đối soát.<br />
              Hiện tại còn {summarize(mismatchRecords).bills} Bill.<br />
              Vui lòng kiểm tra lại danh sách trước khi gửi.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setMode('form')}>Hủy</button>
              <button className="btn-primary" onClick={handleUpdateList}>Cập nhật danh sách</button>
            </div>
          </div>
        </div>
      )}

      {/* §36: submit confirm */}
      {mode === 'confirm' && (
        <div className="modal-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
          <div className="card" style={{ width: 420, padding: 22, background: '#fff' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#182230', marginBottom: 10 }}>Xác nhận gửi giải trình?</div>
            <div style={{ fontSize: 13, color: '#344054', lineHeight: 1.6, marginBottom: 18 }}>
              Giải trình này bao gồm {summary.bills} Bill · {fmt(summary.amount)} của phiên {fmtDate(sessionDate)}.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setMode('form')} disabled={submitting}>Hủy</button>
              <button className="btn-primary" onClick={handleConfirmSubmit} disabled={submitting}>
                {submitting ? 'Đang gửi…' : 'Gửi giải trình'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
