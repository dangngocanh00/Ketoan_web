import React, { useState, useMemo } from 'react'
import {
  missingBillCases, missingBillRecords, explanationCases, fbSurplusBills,
  mbTeams, mbCsTeamMap, sessionsV2, fmt, fmtDate,
} from '../data/sharedData'
import type { MissingBillCase, MissingBillRecord, ExplanationCase, FbSurplusBill } from '../data/mock'

type MainTab = 'missing' | 'approval' | 'surplus'
type ViewMode = 'list' | 'case_detail' | 'approval_detail'
type StatusFilter = 'all' | 'chua_xu_ly' | 'dang_xu_ly' | 'cho_duyet' | 'qua_han'

// Sessions đã đóng (closed / closed_pending)
const closedSessionIds = new Set(
  sessionsV2.filter(s => s.status === 'closed' || s.status === 'closed_pending').map(s => s.id)
)

// §1 Quá hạn = phiên đã đóng + còn bill chưa đối soát
function getEffectiveStatus(
  c: MissingBillCase,
  rejectedExpIds: string[]
): MissingBillCase['status'] {
  const wasRejected = rejectedExpIds.some(id => {
    const exp = explanationCases.find(e => e.id === id)
    return exp?.caseId === c.id
  })
  if (wasRejected) return 'dang_xu_ly'
  const sessionClosed = closedSessionIds.has(c.sessionId)
  if (sessionClosed && c.remainingBills > 0) return 'qua_han'
  // Phiên còn mở → không bao giờ quá hạn
  if (!sessionClosed && c.status === 'qua_han') return 'dang_xu_ly'
  return c.status
}

// ══════════════════════════════════════════════════════════════════════════════
// §16: Suggestion service — tách riêng để thay thuật toán không sửa UI
// ══════════════════════════════════════════════════════════════════════════════

interface TkqcSuggestion {
  tkqcId: string
  last4: string
  sheetSpend: number
  fbAlready: number
  gap: number
  level: 'cao' | 'can_kiem_tra'
}

// §19: Suggestion ở cấp CS + Phiên, không map từng Bank Transaction → TKQC
function getSuggestedAccountsForMissingBills(
  records: MissingBillRecord[]
): TkqcSuggestion[] {
  // Group unreconciled records by tkqcId — derived từ shared data
  const grouped = new Map<string, { last4: string; missingAmount: number }>()
  for (const r of records) {
    if (!grouped.has(r.tkqcId)) {
      grouped.set(r.tkqcId, { last4: r.last4, missingAmount: 0 })
    }
    grouped.get(r.tkqcId)!.missingAmount += r.amount
  }

  const suggestions: TkqcSuggestion[] = []
  for (const [tkqcId, { last4, missingAmount }] of grouped) {
    if (missingAmount <= 0) continue
    // Deterministic factor từ tkqcId để sheetSpend > missingAmount
    const seed = tkqcId.split('').reduce((a, c) => a + c.charCodeAt(0), 31)
    const factor = 1.35 + ((seed * 1234567 >>> 8) % 40) / 100  // 1.35–1.75
    const sheetSpend = Math.round(missingAmount * factor)
    const fbAlready = sheetSpend - missingAmount
    suggestions.push({
      tkqcId,
      last4,
      sheetSpend,
      fbAlready,
      gap: missingAmount,
      level: missingAmount >= 100 ? 'cao' : 'can_kiem_tra',
    })
  }
  // §18: Sort chênh lệch giảm dần
  return suggestions.sort((a, b) => b.gap - a.gap)
}

// ── TKQC Suggestion Section Component ────────────────────────────────────────
// §24: Reusable — Admin/Kế toán + CS sau này

function TkqcSuggestionSection({ suggestions }: { suggestions: TkqcSuggestion[] }) {
  const totalGap = suggestions.reduce((s, r) => s + r.gap, 0)

  return (
    <div className="card" style={{ padding: 0, marginBottom: 14 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#B54708" strokeWidth="1.3" /><path d="M7 4v3.5M7 9.5v.5" stroke="#B54708" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.06em' }}>TKQC gợi ý cần kiểm tra</span>
        </div>
        <div style={{ fontSize: 12, color: '#667085', marginBottom: 8, lineHeight: 1.5 }}>
          Hệ thống gợi ý các TKQC nên kiểm tra dựa trên dữ liệu chi tiêu, quyền sử dụng TKQC, thẻ và Bill Facebook đã tải lên.
        </div>
        <div style={{ fontSize: 11.5, color: '#98A2B3', fontStyle: 'italic' }}>
          Đây là gợi ý hỗ trợ tìm Bill, không phải kết quả đối soát chính thức.
        </div>

        {suggestions.length > 0 && (
          <div style={{ display: 'flex', gap: 20, marginTop: 10, paddingTop: 10, borderTop: '1px solid #F2F4F7' }}>
            <div>
              <div style={{ fontSize: 11, color: '#667085', marginBottom: 2 }}>TKQC nên kiểm tra</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#344054' }}>{suggestions.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#667085', marginBottom: 2 }}>Chênh lệch gợi ý</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#B54708' }}>{fmt(totalGap)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Table / Empty state */}
      {suggestions.length === 0 ? (
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#667085', marginBottom: 4 }}>Chưa xác định được TKQC gợi ý từ dữ liệu hiện tại.</div>
          <div style={{ fontSize: 12, color: '#98A2B3' }}>CS vẫn có thể kiểm tra danh sách TKQC đã sử dụng trong ngày phiên.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>TKQC</th>
                <th>Thẻ sử dụng</th>
                <th style={{ textAlign: 'right' }}>Chi tiêu Sheet</th>
                <th style={{ textAlign: 'right' }}>Bill FB đã có</th>
                <th style={{ textAlign: 'right', minWidth: 120 }}>Chênh lệch gợi ý</th>
                <th>Mức độ</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(s => (
                <tr key={s.tkqcId}>
                  <td>
                    <span
                      className="mono"
                      title={s.tkqcId}
                      style={{ fontSize: 11.5, cursor: 'default',
                        display: 'inline-block', maxWidth: 130, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                    >
                      {s.tkqcId}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>•••• {s.last4}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(s.sheetSpend)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{fmt(s.fbAlready)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#B42318' }}>{fmt(s.gap)}</td>
                  <td>
                    {s.level === 'cao'
                      ? <span className="badge" style={{ background: '#FEF3F2', color: '#B42318' }}>Cao</span>
                      : <span className="badge" style={{ background: '#FFFAEB', color: '#B54708' }}>Cần kiểm tra</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Shared Badge ─────────────────────────────────────────────────────────────

function Badge({ type, children }: { type: 'error' | 'warning' | 'success' | 'info' | 'gray' | 'purple'; children: React.ReactNode }) {
  const m: Record<string, [string, string]> = {
    error: ['#FEF3F2', '#B42318'], warning: ['#FFFAEB', '#B54708'],
    success: ['#ECFDF3', '#027A48'], info: ['#EFF8FF', '#175CD3'],
    gray: ['#F2F4F7', '#344054'], purple: ['#F4F3FF', '#5925DC'],
  }
  const [bg, color] = m[type]
  return <span className="badge" style={{ background: bg, color }}>{children}</span>
}

function statusBadge(s: MissingBillCase['status']) {
  if (s === 'chua_xu_ly') return <Badge type="gray">Chưa xử lý</Badge>
  if (s === 'dang_xu_ly') return <Badge type="info">Đang xử lý</Badge>
  if (s === 'cho_duyet') return <Badge type="warning">Chờ duyệt</Badge>
  return <Badge type="error">Quá hạn</Badge>
}

function billRecordStatusBadge(s: MissingBillRecord['status']) {
  if (s === 'da_doi_soat') return <Badge type="success">Đã đối soát</Badge>
  if (s === 'cho_duyet_giai_trinh') return <Badge type="warning">Chờ duyệt giải trình</Badge>
  return <Badge type="gray">Chưa bổ sung</Badge>
}

// ── Record Drawer (individual bank txn) ──────────────────────────────────────
// §4: TKQC không thuộc Thông tin giao dịch Bank — hiển thị ở section riêng

function BillRecordDrawer({ record, onClose }: { record: MissingBillRecord; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1 }} />
      <div
        style={{ width: 420, height: '100%', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>Chi tiết giao dịch Bank</div>
            <div className="mono" style={{ fontSize: 11, color: '#667085', marginTop: 1 }}>{record.txnId}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>{billRecordStatusBadge(record.status)}</div>
          {/* §4: Chỉ raw Bank data — không có TKQC */}
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Thông tin giao dịch Bank</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['Transaction ID', record.txnId, true],
                ['Ngày giao dịch', record.bankDate, false],
                ['Mô tả', record.bankDesc, false],
                ['Mã tham chiếu', record.reference, true],
                ['Last 4', `•••• ${record.last4}`, true],
                ['Amount', fmt(record.amount), true],
                ['Currency', 'USD', false],
              ] as [string, string, boolean][]).map(([k, v, mono]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#667085', flexShrink: 0 }}>{k}</span>
                  <span className={mono ? 'mono' : ''} style={{ fontSize: 12.5, fontWeight: 500, color: '#182230', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>
          <section style={{ borderTop: '1px solid #E4E7EC', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Nguồn dữ liệu</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['Source file', record.bankSourceFile],
                ['Thời gian upload', record.bankUploadTime],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#667085' }}>{k}</span>
                  <span className="mono" style={{ fontSize: 12, color: '#344054' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>
          {/* §4: TKQC là derived data — tách section riêng */}
          <section style={{ borderTop: '1px solid #E4E7EC', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Thông tin đối chiếu</div>
            <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 7, padding: '10px 12px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12, color: '#667085' }}>TKQC suy luận</span>
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 500, color: '#344054' }}>{record.tkqcId}</span>
              </div>
              <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 6 }}>Được suy luận từ thẻ ngân hàng — không phải raw Bank data</div>
            </div>
            <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#B42318', fontWeight: 500 }}>
              Chưa tìm được Facebook Bill tương ứng
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── FB Surplus Bill Drawer ───────────────────────────────────────────────────

function SurplusBillDrawer({ bill, onClose }: { bill: FbSurplusBill; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex' }} onClick={onClose}>
      <div style={{ flex: 1 }} />
      <div
        style={{ width: 420, height: '100%', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>Chi tiết Bill Facebook thừa</div>
            <div className="mono" style={{ fontSize: 11, color: '#667085', marginTop: 1 }}>{bill.billId}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div><Badge type="warning">Chưa tìm thấy Bank</Badge></div>
          <section>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Thông tin Facebook Bill</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['Bill ID', bill.billId, true],
                ['Ngày Facebook', bill.fbDate, false],
                ['ID TKQC', bill.tkqcId, true],
                ['Mã tham chiếu', bill.reference, true],
                ['Last 4', `•••• ${bill.last4}`, true],
                ['Amount', fmt(bill.amount), true],
                ['CS upload', bill.cs, false],
                ['Team', bill.team, false],
                ['Source file', bill.sourceFile, true],
                ['Upload lúc', bill.uploadedAt, false],
                ['Nguồn upload', bill.uploadSource, false],
              ] as [string, string, boolean][]).map(([k, v, mono]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#667085', flexShrink: 0 }}>{k}</span>
                  <span className={mono ? 'mono' : ''} style={{ fontSize: 12.5, fontWeight: 500, color: '#182230', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          </section>
          <section style={{ borderTop: '1px solid #E4E7EC', paddingTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Kết quả matching</div>
            <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#B42318', fontWeight: 500 }}>
              Không tìm thấy Bank Transaction tương ứng
            </div>
            <div style={{ fontSize: 11.5, color: '#667085', marginTop: 8 }}>Bill này chỉ được theo dõi, không có action xử lý thủ công.</div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Case Detail Page ─────────────────────────────────────────────────────────

function CaseDetailPage({
  caseData, records, onBack,
}: {
  caseData: MissingBillCase
  records: MissingBillRecord[]
  onBack: () => void
}) {
  const [drawerRecord, setDrawerRecord] = useState<MissingBillRecord | null>(null)
  const [copyDone, setCopyDone] = useState(false)

  const remaining = records.filter(r => r.status === 'chua_bo_sung' || r.status === 'cho_duyet_giai_trinh')
  // §5 of spec: derive suggestions từ actual records (chỉ unreconciled)
  const suggestions = useMemo(() => getSuggestedAccountsForMissingBills(remaining), [remaining])
  const supplemented = records.filter(r => r.status === 'da_doi_soat')

  const progress = caseData.initialBills > 0
    ? Math.round((caseData.supplementedBills / caseData.initialBills) * 100)
    : 0

  function handleCopy() {
    const lines = remaining
      .map(r => `${r.reference} | ${r.last4} | ${fmt(r.amount)}`)
      .join('\n')
    navigator.clipboard.writeText(lines).catch(() => {})
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }

  const deadlineDate = caseData.processingDeadline.slice(5).split('-').reverse().join('/')

  return (
    <div className="page-content" style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12.5, fontFamily: 'inherit', padding: 0, marginBottom: 10 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Quay lại Bill thiếu
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Bill thiếu — {caseData.cs}</div>
            <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
              Phiên {fmtDate(caseData.sessionDate)} · {caseData.team}
            </div>
            {/* §3: Hành động gần nhất với timestamp đầy đủ */}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: '#98A2B3', flexShrink: 0, marginTop: 1 }}>Hành động gần nhất:</span>
              {caseData.lastActionDesc && caseData.lastActionDesc !== 'Chưa có hành động' ? (
                <span style={{ fontSize: 12, fontWeight: 500, color: '#344054' }}>{caseData.lastActionDesc}</span>
              ) : (
                <span style={{ fontSize: 12, color: '#98A2B3', fontStyle: 'italic' }}>Chưa có hành động</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {statusBadge(caseData.status)}
            <div style={{ fontSize: 12, color: '#667085' }}>
              Hạn xử lý: <span style={{ fontWeight: 600, color: caseData.hoursRemaining <= 12 ? '#B42318' : '#182230' }}>{deadlineDate}</span>
              {caseData.hoursRemaining > 0 && (
                <span style={{ color: caseData.hoursRemaining <= 12 ? '#B42318' : '#667085' }}> · còn {caseData.hoursRemaining}h</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Thiếu ban đầu', bills: caseData.initialBills, amount: caseData.initialAmount, color: '#344054', bg: '#F2F4F7' },
          { label: 'Đã bổ sung thành công', bills: caseData.supplementedBills, amount: caseData.supplementedAmount, color: '#027A48', bg: '#ECFDF3' },
          { label: 'Còn thiếu', bills: caseData.remainingBills, amount: caseData.remainingAmount, color: '#B42318', bg: '#FEF3F2' },
          { label: 'Chờ duyệt giải trình', bills: caseData.pendingExplanationBills, amount: caseData.pendingExplanationAmount, color: '#B54708', bg: '#FFFAEB' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{fmt(k.amount)}</div>
            <div style={{ fontSize: 11.5, color: k.color, opacity: 0.75, marginTop: 2 }}>{k.bills} bill</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#344054' }}>Tiến độ bổ sung Bill</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#2563EB' }}>{progress}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ fontSize: 12, color: '#667085', marginTop: 5 }}>
          {caseData.supplementedBills} / {caseData.initialBills} bill đã bổ sung thành công
        </div>
      </div>

      {/* §5 spec: TKQC gợi ý — sau Progress, trước danh sách bill */}
      <TkqcSuggestionSection suggestions={suggestions} />

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, color: '#667085' }}>
          {remaining.length} bill còn thiếu · Tổng <span className="mono">{fmt(caseData.remainingAmount)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={handleCopy}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M2 8.5H1.5A1.5 1.5 0 010 7V1.5A1.5 1.5 0 011.5 0H7a1.5 1.5 0 011.5 1.5V2" stroke="currentColor" strokeWidth="1.3" /></svg>
            {copyDone ? 'Đã copy!' : 'Copy danh sách'}
          </button>
          <button className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7m0 0L3.5 5.5M6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v1A1.5 1.5 0 002.5 12h7A1.5 1.5 0 0011 10.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            Xuất file
          </button>
        </div>
      </div>

      {/* Bill Records Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Ngày Giao Dịch</th>
                <th>Mã tham chiếu</th>
                <th>Last 4</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Trạng thái Bank</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#667085', padding: '24px' }}>Không có dữ liệu bill.</td></tr>
              )}
              {records.map(r => (
                <tr key={r.id} className="table-row-hover" onClick={() => setDrawerRecord(r)}>
                  <td style={{ fontSize: 12.5 }}>{r.bankDate}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{r.reference}</td>
                  <td className="mono" style={{ fontSize: 12 }}>•••• {r.last4}</td>
                  <td style={{ fontSize: 12, color: '#667085', maxWidth: 180 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.bankDesc}</span>
                  </td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 500 }}>{fmt(r.amount)}</td>
                  <td><span className="badge" style={{ background: '#EFF8FF', color: '#175CD3' }}>Đã ghi nhận</span></td>
                  <td>{billRecordStatusBadge(r.status)}</td>
                  <td style={{ color: '#98A2B3', fontSize: 11 }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {supplemented.length > 0 && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
            {supplemented.length} bill đã đối soát không hiển thị trong bảng · {fmt(caseData.supplementedAmount)} đã bổ sung
          </div>
        )}
      </div>

      {drawerRecord && <BillRecordDrawer record={drawerRecord} onClose={() => setDrawerRecord(null)} />}
    </div>
  )
}

// ── Approval Detail Page ─────────────────────────────────────────────────────

function ApprovalDetailPage({
  explanation,
  onBack,
  onAccepted,
  onRejected,
}: {
  explanation: ExplanationCase
  onBack: () => void
  onAccepted: (id: string) => void
  onRejected: (id: string) => void
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showAcceptModal, setShowAcceptModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionDone, setActionDone] = useState<'accepted' | 'rejected' | null>(null)
  // §5: click bill row → drawer
  const [drawerRecord, setDrawerRecord] = useState<MissingBillRecord | null>(null)

  const reasonLabels: Record<string, string> = {
    acc_die: 'ACC DIE', no_share: 'Không có quyền SHARE', back: 'BACK', other: 'Lý do khác',
  }

  // §5: Look up full MissingBillRecord for each bill in the explanation
  const billRecords = useMemo(() => {
    return explanation.billList.map(b => {
      const rec = missingBillRecords.find(r => r.id === b.id || r.reference === b.reference)
      return { bill: b, rec }
    })
  }, [explanation])

  function handleRejectConfirm() {
    if (!rejectReason.trim()) return
    setShowRejectModal(false)
    setActionDone('rejected')
    setTimeout(() => onRejected(explanation.id), 1400)
  }

  function handleAcceptConfirm() {
    setShowAcceptModal(false)
    setActionDone('accepted')
    setTimeout(() => onAccepted(explanation.id), 1400)
  }

  const sessionDateFormatted = fmtDate(explanation.sessionDate)

  return (
    <div className="page-content" style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12.5, fontFamily: 'inherit', padding: 0, marginBottom: 10 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Quay lại Chờ duyệt giải trình
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Chi tiết giải trình — {explanation.cs}</div>
            <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
              Phiên {sessionDateFormatted} · {explanation.team}
            </div>
          </div>
          <Badge type="warning">Chờ duyệt</Badge>
        </div>
      </div>

      {actionDone === 'accepted' && (
        <div style={{ background: '#ECFDF3', border: '1px solid #6CE9A6', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#027A48' }}>Đã chấp nhận giải trình</div>
          <div style={{ fontSize: 12.5, color: '#027A48', marginTop: 2 }}>{explanation.bills} bill · {fmt(explanation.totalAmount)} đã được ghi nhận là Đã đối soát qua giải trình.</div>
        </div>
      )}
      {actionDone === 'rejected' && (
        <div style={{ background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#B42318' }}>Đã từ chối giải trình</div>
          <div style={{ fontSize: 12.5, color: '#B42318', marginTop: 2 }}>Đã gửi thông báo cho CS. Case quay lại trạng thái Đang xử lý.</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* §6: Info summary */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Thông tin chung</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['CS', explanation.cs],
                ['Team', explanation.team],
                ['Phiên', sessionDateFormatted],
                ['Số Bill giải trình', `${explanation.bills} bill`],
                ['Tổng Amount', fmt(explanation.totalAmount)],
                ['Gửi lúc', explanation.submittedAt],
                ['Thời gian chờ', explanation.waitingDuration],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#667085' }}>{k}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: '#182230' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reasons */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Lý do giải trình</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: explanation.otherReason ? 10 : 0 }}>
              {explanation.reasons.map(r => (
                <Badge key={r} type={r === 'acc_die' ? 'error' : r === 'back' ? 'warning' : 'gray'}>{reasonLabels[r]}</Badge>
              ))}
            </div>
            {explanation.otherReason && (
              <div style={{ fontSize: 12.5, color: '#344054', background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 7, padding: '8px 10px', marginTop: 6 }}>
                {explanation.otherReason}
              </div>
            )}
          </div>

          {/* §7: Evidence gallery */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Bằng chứng đính kèm ({explanation.evidenceImages.length} ảnh)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {explanation.evidenceImages.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => setLightboxIdx(idx)}
                  style={{ width: 80, height: 64, borderRadius: 7, background: img.colorBg, border: '1px solid #E4E7EC', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'opacity 0.15s' }}
                  title={img.name}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="#667085" strokeWidth="1.3" /><circle cx="7" cy="8.5" r="1.5" stroke="#667085" strokeWidth="1.3" /><path d="M2 13l4-4 3 3 3-2 4 3" stroke="#667085" strokeWidth="1.3" strokeLinejoin="round" /></svg>
                  <span style={{ fontSize: 9.5, color: '#667085', textAlign: 'center', padding: '0 4px', lineHeight: 1.2 }}>{idx + 1}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: '#98A2B3', marginTop: 8 }}>Nhấn ảnh để xem toàn màn hình</div>
          </div>
        </div>

        {/* §5: Right column – bill list as Bank Transactions */}
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 11, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Danh sách Bank Transaction giải trình ({explanation.bills} bill · {fmt(explanation.totalAmount)})
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 480, flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC', whiteSpace: 'nowrap' }}>Ngày GD</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC', whiteSpace: 'nowrap' }}>Mã tham chiếu</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC', whiteSpace: 'nowrap' }}>Last 4</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC', whiteSpace: 'nowrap' }}>Amount</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Currency</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #E4E7EC' }}></th>
                </tr>
              </thead>
              <tbody>
                {billRecords.map(({ bill, rec }) => (
                  <tr key={bill.id} style={{ borderBottom: '1px solid #F2F4F7' }}>
                    <td style={{ padding: '7px 10px', fontSize: 12.5, whiteSpace: 'nowrap' }}>{rec?.bankDate ?? '—'}</td>
                    <td style={{ padding: '7px 10px' }} className="mono"><span style={{ fontSize: 11.5 }}>{bill.reference}</span></td>
                    <td style={{ padding: '7px 10px' }} className="mono"><span style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>•••• {bill.last4}</span></td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: '#667085', maxWidth: 180 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                        {rec?.bankDesc ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap' }} className="mono">
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{fmt(bill.amount)}</span>
                    </td>
                    <td style={{ padding: '7px 10px', fontSize: 12, color: '#667085' }}>USD</td>
                    <td style={{ padding: '7px 10px' }}>
                      {rec ? billRecordStatusBadge(rec.status) : <span style={{ fontSize: 12, color: '#98A2B3' }}>—</span>}
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      {rec && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '3px 8px', whiteSpace: 'nowrap' }}
                          onClick={() => setDrawerRecord(rec)}
                        >
                          Xem chi tiết
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
            <span style={{ fontSize: 12, color: '#667085' }}>Nhấn hàng để xem chi tiết giao dịch</span>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#182230' }} className="mono">{fmt(explanation.totalAmount)}</div>
          </div>
        </div>
      </div>

      {/* Action footer */}
      {!actionDone && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #E4E7EC' }}>
          <button
            className="btn-secondary"
            style={{ color: '#B42318', borderColor: '#FEE4E2', fontSize: 13, padding: '8px 18px' }}
            onClick={() => setShowRejectModal(true)}
          >
            Từ chối giải trình
          </button>
          <button
            className="btn-primary"
            style={{ fontSize: 13, padding: '8px 18px' }}
            onClick={() => setShowAcceptModal(true)}
          >
            Chấp nhận giải trình
          </button>
        </div>
      )}

      {/* §7: Lightbox */}
      {lightboxIdx !== null && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightboxIdx(null)}
        >
          <div style={{ position: 'absolute', top: 16, right: 20, color: '#fff', fontSize: 13 }}>
            {lightboxIdx + 1} / {explanation.evidenceImages.length}
          </div>
          <div
            style={{ width: 480, height: 340, borderRadius: 12, background: explanation.evidenceImages[lightboxIdx].colorBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onClick={e => e.stopPropagation()}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="9" width="40" height="30" rx="4" stroke="#667085" strokeWidth="2" /><circle cx="16" cy="20" r="4" stroke="#667085" strokeWidth="2" /><path d="M4 31l12-10 8 8 7-5 13 8" stroke="#667085" strokeWidth="2" strokeLinejoin="round" /></svg>
            <div style={{ fontSize: 12.5, color: '#667085', textAlign: 'center' }}>
              <div>{explanation.evidenceImages[lightboxIdx].name}</div>
              <div style={{ fontSize: 11.5, marginTop: 2 }}>Upload lúc {explanation.evidenceImages[lightboxIdx].uploadedAt}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
            <button
              disabled={lightboxIdx === 0}
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => Math.max(0, (i ?? 0) - 1)) }}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', cursor: lightboxIdx === 0 ? 'not-allowed' : 'pointer', opacity: lightboxIdx === 0 ? 0.4 : 1, fontFamily: 'inherit', fontSize: 13 }}
            >
              ← Ảnh trước
            </button>
            <button
              disabled={lightboxIdx === explanation.evidenceImages.length - 1}
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => Math.min(explanation.evidenceImages.length - 1, (i ?? 0) + 1)) }}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', cursor: lightboxIdx === explanation.evidenceImages.length - 1 ? 'not-allowed' : 'pointer', opacity: lightboxIdx === explanation.evidenceImages.length - 1 ? 0.4 : 1, fontFamily: 'inherit', fontSize: 13 }}
            >
              Ảnh tiếp →
            </button>
          </div>
          <button
            onClick={() => setLightboxIdx(null)}
            style={{ marginTop: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Reject modal — §14 */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-panel" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E4E7EC' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>Từ chối giải trình</div>
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 4 }}>{explanation.cs} · Phiên {sessionDateFormatted} · {explanation.bills} bill · {fmt(explanation.totalAmount)}</div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>
                Lý do từ chối <span style={{ color: '#B42318' }}>*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối giải trình..."
                style={{ width: '100%', height: 100, padding: '8px 10px', resize: 'none', border: '1px solid #E4E7EC', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#182230', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>Hủy</button>
                <button
                  className="btn-primary"
                  style={{ background: '#B42318', borderColor: '#B42318' }}
                  disabled={!rejectReason.trim()}
                  onClick={handleRejectConfirm}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* §8-11: Accept confirm modal — full bill list */}
      {showAcceptModal && (
        <div className="modal-overlay" onClick={() => setShowAcceptModal(false)}>
          <div
            className="modal-panel"
            style={{ maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E4E7EC', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#182230' }}>XÁC NHẬN CHẤP NHẬN GIẢI TRÌNH</div>
              <div style={{ fontSize: 12.5, color: '#667085', marginTop: 4 }}>
                {explanation.cs} · {explanation.team} · Phiên {sessionDateFormatted}
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Summary */}
              <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                {([
                  ['CS', explanation.cs],
                  ['Team', explanation.team],
                  ['Phiên', sessionDateFormatted],
                  ['Hình thức đối soát', 'Duyệt giải trình'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#667085' }}>{k}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#182230' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* §9: Full bill list */}
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Danh sách Bill sẽ được ghi nhận đã đối soát
              </div>
              <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                {/* §10: Sticky header inside scrollable table */}
                <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#F9FAFB', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Ngày GD</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Reference</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Last 4</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Amount</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: '#667085', borderBottom: '1px solid #E4E7EC' }}>Currency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billRecords.map(({ bill, rec }) => (
                        <tr key={bill.id} style={{ borderBottom: '1px solid #F2F4F7' }}>
                          <td style={{ padding: '7px 12px', fontSize: 12 }}>{rec?.bankDate ?? '—'}</td>
                          <td style={{ padding: '7px 12px' }} className="mono"><span style={{ fontSize: 11.5 }}>{bill.reference}</span></td>
                          <td style={{ padding: '7px 12px' }} className="mono"><span style={{ fontSize: 11.5 }}>•••• {bill.last4}</span></td>
                          <td style={{ padding: '7px 12px', textAlign: 'right' }} className="mono"><span style={{ fontSize: 12.5, fontWeight: 500 }}>{fmt(bill.amount)}</span></td>
                          <td style={{ padding: '7px 12px', fontSize: 12, color: '#667085' }}>USD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Total row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F2F4F7', borderTop: '1px solid #E4E7EC' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#344054' }}>TỔNG · {explanation.bills} Bill</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>{fmt(explanation.totalAmount)}</span>
                </div>
              </div>

              {/* §11: Warning */}
              <div style={{ background: '#FFFAEB', border: '1px solid #FEF0C7', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#B54708' }}>
                Sau khi xác nhận, toàn bộ <strong>{explanation.bills} Bill · {fmt(explanation.totalAmount)}</strong> phía trên sẽ được ghi nhận là <strong>ĐÃ ĐỐI SOÁT QUA GIẢI TRÌNH</strong>. Không tạo Facebook Bill giả.
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #E4E7EC', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button className="btn-secondary" onClick={() => setShowAcceptModal(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleAcceptConfirm}>Xác nhận chấp nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* §5: Bill detail drawer */}
      {drawerRecord && <BillRecordDrawer record={drawerRecord} onClose={() => setDrawerRecord(null)} />}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════════

export default function MissingBills() {
  const [activeTab, setActiveTab] = useState<MainTab>('missing')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [selectedExplanationId, setSelectedExplanationId] = useState<string | null>(null)

  // Shared filters
  const [dateFilter, setDateFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [csFilter, setCsFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Surplus-specific search
  const [tkqcSearch, setTkqcSearch] = useState('')
  const [refSearch, setRefSearch] = useState('')
  const [last4Search, setLast4Search] = useState('')

  // State changes after actions
  const [closedExplanationIds, setClosedExplanationIds] = useState<string[]>([])
  const [rejectedExplanationIds, setRejectedExplanationIds] = useState<string[]>([])

  // Derived CS list (filtered by team)
  const csList = useMemo(() => {
    const all = Object.keys(mbCsTeamMap)
    return teamFilter === 'all' ? all : all.filter(cs => mbCsTeamMap[cs] === teamFilter)
  }, [teamFilter])

  // §1: Filtered missing bill cases with correct quá hạn logic
  const filteredCases = useMemo(() => {
    return missingBillCases.filter(c => {
      // Accepted explanation → case biến mất
      if (closedExplanationIds.some(id => {
        const exp = explanationCases.find(e => e.id === id)
        return exp?.caseId === c.id
      })) return false
      if (dateFilter && c.sessionDate !== dateFilter) return false
      if (teamFilter !== 'all' && c.team !== teamFilter) return false
      if (csFilter !== 'all' && c.cs !== csFilter) return false
      if (statusFilter !== 'all') {
        const eff = getEffectiveStatus(c, rejectedExplanationIds)
        if (eff !== statusFilter) return false
      }
      return true
    })
  }, [dateFilter, teamFilter, csFilter, statusFilter, closedExplanationIds, rejectedExplanationIds])

  // Filtered explanations
  const filteredExplanations = useMemo(() => {
    return explanationCases.filter(e => {
      if (closedExplanationIds.includes(e.id)) return false
      if (rejectedExplanationIds.includes(e.id)) return false
      if (dateFilter && e.sessionDate !== dateFilter) return false
      if (teamFilter !== 'all' && e.team !== teamFilter) return false
      if (csFilter !== 'all' && e.cs !== csFilter) return false
      return true
    })
  }, [dateFilter, teamFilter, csFilter, closedExplanationIds, rejectedExplanationIds])

  // Filtered surplus bills
  const filteredSurplus = useMemo(() => {
    return fbSurplusBills.filter(b => {
      if (dateFilter) {
        const bDate = b.fbDate === '08/08' ? '2026-08-08' : b.fbDate === '09/08' ? '2026-08-09' : ''
        if (bDate !== dateFilter) return false
      }
      if (teamFilter !== 'all' && b.team !== teamFilter) return false
      if (csFilter !== 'all' && b.cs !== csFilter) return false
      if (tkqcSearch && !b.tkqcId.includes(tkqcSearch)) return false
      if (refSearch && !b.reference.toLowerCase().includes(refSearch.toLowerCase())) return false
      if (last4Search && !b.last4.includes(last4Search)) return false
      return true
    })
  }, [dateFilter, teamFilter, csFilter, tkqcSearch, refSearch, last4Search])

  // KPI aggregates
  const totalBills = filteredCases.reduce((s, c) => s + c.remainingBills, 0)
  const totalAmount = filteredCases.reduce((s, c) => s + c.remainingAmount, 0)
  const csCount = new Set(filteredCases.map(c => c.cs)).size
  const pendingCount = filteredExplanations.length

  const [surplusDrawer, setSurplusDrawer] = useState<FbSurplusBill | null>(null)

  function clearFilters() {
    setDateFilter('')
    setTeamFilter('all')
    setCsFilter('all')
    setStatusFilter('all')
    setTkqcSearch('')
    setRefSearch('')
    setLast4Search('')
  }

  function openCaseDetail(id: string) {
    setSelectedCaseId(id)
    setViewMode('case_detail')
  }

  function openApprovalDetail(id: string) {
    setSelectedExplanationId(id)
    setViewMode('approval_detail')
  }

  function handleBack() {
    setViewMode('list')
    setSelectedCaseId(null)
    setSelectedExplanationId(null)
  }

  function handleAccepted(expId: string) {
    setClosedExplanationIds(prev => [...prev, expId])
    handleBack()
  }

  function handleRejected(expId: string) {
    setRejectedExplanationIds(prev => [...prev, expId])
    handleBack()
  }

  // Render sub-pages
  if (viewMode === 'case_detail' && selectedCaseId) {
    const caseData = missingBillCases.find(c => c.id === selectedCaseId)
    if (caseData) {
      const records = missingBillRecords.filter(r => r.caseId === selectedCaseId)
      return <CaseDetailPage caseData={caseData} records={records} onBack={handleBack} />
    }
  }

  if (viewMode === 'approval_detail' && selectedExplanationId) {
    const explanation = explanationCases.find(e => e.id === selectedExplanationId)
    if (explanation) {
      return (
        <ApprovalDetailPage
          explanation={explanation}
          onBack={handleBack}
          onAccepted={handleAccepted}
          onRejected={handleRejected}
        />
      )
    }
  }

  // ── Shared filter bar ──────────────────────────────────────────────────────
  const FilterBar = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="date"
        className="text-input"
        value={dateFilter}
        onChange={e => setDateFilter(e.target.value)}
        style={{ width: 148, fontSize: 12.5 }}
        title="Ngày phiên"
      />
      <select className="select-input" value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCsFilter('all') }}>
        <option value="all">Tất cả Team</option>
        {mbTeams.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <select className="select-input" value={csFilter} onChange={e => setCsFilter(e.target.value)}>
        <option value="all">Tất cả CS</option>
        {csList.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {(dateFilter || teamFilter !== 'all' || csFilter !== 'all') && (
        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={clearFilters}>Xóa bộ lọc</button>
      )}
    </div>
  )

  // ── Tab 1: Bill thiếu ──────────────────────────────────────────────────────
  const MissingTab = (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Tổng Bill thiếu', value: `${totalBills} bill`, color: '#B42318', bg: '#FEF3F2' },
          { label: 'Tổng tiền thiếu', value: fmt(totalAmount), color: '#344054', bg: '#F2F4F7' },
          { label: 'CS cần xử lý', value: `${csCount} CS`, color: '#175CD3', bg: '#EFF8FF' },
          { label: 'Chờ duyệt giải trình', value: `${pendingCount} case`, color: '#B54708', bg: '#FFFAEB' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="date"
          className="text-input"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ width: 148, fontSize: 12.5 }}
        />
        <select className="select-input" value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCsFilter('all') }}>
          <option value="all">Tất cả Team</option>
          {mbTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select-input" value={csFilter} onChange={e => setCsFilter(e.target.value)}>
          <option value="all">Tất cả CS</option>
          {csList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="chua_xu_ly">Chưa xử lý</option>
          <option value="dang_xu_ly">Đang xử lý</option>
          <option value="cho_duyet">Chờ duyệt</option>
          <option value="qua_han">Quá hạn</option>
        </select>
        {(dateFilter || teamFilter !== 'all' || csFilter !== 'all' || statusFilter !== 'all') && (
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={clearFilters}>Xóa bộ lọc</button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7m0 0L3.5 5.5M6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v1A1.5 1.5 0 002.5 12h7A1.5 1.5 0 0011 10.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            Xuất tất cả
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>CS</th>
                <th>Team</th>
                <th>Phiên</th>
                <th style={{ textAlign: 'right' }}>Bill thiếu ban đầu</th>
                <th style={{ textAlign: 'right' }}>Tiền thiếu ban đầu</th>
                <th style={{ textAlign: 'right' }}>Đã bổ sung</th>
                <th style={{ textAlign: 'right' }}>Còn thiếu</th>
                <th>Trạng thái</th>
                {/* §2: Hành động gần nhất — không truncate */}
                <th style={{ minWidth: 200 }}>Hành động gần nhất</th>
                <th>Hạn xử lý</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', color: '#667085', padding: '28px' }}>Không có case Bill thiếu nào phù hợp với bộ lọc.</td></tr>
              )}
              {filteredCases.map(c => {
                const effectiveStatus = getEffectiveStatus(c, rejectedExplanationIds)
                const dl = c.processingDeadline.slice(5).split('-').reverse().join('/')
                return (
                  <tr key={c.id} className="table-row-hover" onClick={() => openCaseDetail(c.id)}>
                    <td style={{ fontWeight: 600, color: '#182230' }}>{c.cs}</td>
                    <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                    <td style={{ fontSize: 12.5 }}>{fmtDate(c.sessionDate)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{c.initialBills} bill</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 12.5, fontWeight: 500 }}>{fmt(c.initialAmount)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 12.5, color: '#027A48', fontWeight: 500 }}>{c.supplementedBills} bill</div>
                      <div className="mono" style={{ fontSize: 11, color: '#667085' }}>{fmt(c.supplementedAmount)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: c.remainingBills > 0 ? '#B42318' : '#027A48' }}>{fmt(c.remainingAmount)}</div>
                      <div className="mono" style={{ fontSize: 11, color: '#667085' }}>{c.remainingBills} bill</div>
                    </td>
                    <td>{statusBadge(effectiveStatus)}</td>
                    {/* §2: wrap tối đa 2 dòng, không ellipsis */}
                    <td style={{ fontSize: 12, color: '#667085', minWidth: 200 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                        {c.lastActionDesc || 'Chưa có hành động'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12.5, color: c.hoursRemaining <= 12 ? '#B42318' : '#344054', whiteSpace: 'nowrap', fontWeight: c.hoursRemaining <= 12 ? 600 : 400 }}>{dl}</td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'nowrap' }}
                        onClick={e => { e.stopPropagation(); openCaseDetail(c.id) }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
          {filteredCases.length} case · Nhấn hàng để xem chi tiết
        </div>
      </div>
    </div>
  )

  // ── Tab 2: Chờ duyệt giải trình ───────────────────────────────────────────
  const ApprovalTab = (
    <div>
      {FilterBar}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>CS</th>
                <th>Team</th>
                <th>Phiên</th>
                <th style={{ textAlign: 'right' }}>Bill giải trình</th>
                <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                <th>Lý do</th>
                <th>Gửi lúc</th>
                <th>Thời gian chờ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredExplanations.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: '#667085', padding: '28px' }}>Không có giải trình nào đang chờ duyệt.</td></tr>
              )}
              {filteredExplanations.map(e => (
                <tr key={e.id} className="table-row-hover" onClick={() => openApprovalDetail(e.id)}>
                  <td style={{ fontWeight: 600, color: '#182230' }}>{e.cs}</td>
                  <td style={{ fontSize: 12.5, color: '#667085' }}>{e.team}</td>
                  <td style={{ fontSize: 12.5 }}>{fmtDate(e.sessionDate)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 500 }}>{e.bills} bill</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: '#182230' }}>{fmt(e.totalAmount)}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {e.reasons.map(r => (
                        <Badge key={r} type={r === 'acc_die' ? 'error' : r === 'back' ? 'warning' : 'gray'}>
                          {r === 'acc_die' ? 'ACC DIE' : r === 'back' ? 'BACK' : r === 'no_share' ? 'Không SHARE' : 'Lý do khác'}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: '#667085' }}>{e.submittedAt}</td>
                  <td style={{ fontSize: 12, color: '#B54708', fontWeight: 500 }}>{e.waitingDuration}</td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'nowrap' }}
                      onClick={ev => { ev.stopPropagation(); openApprovalDetail(e.id) }}
                    >
                      Xem giải trình
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
          {filteredExplanations.length} giải trình đang chờ duyệt
        </div>
      </div>
    </div>
  )

  // ── Tab 3: Bill Facebook thừa ──────────────────────────────────────────────
  const SurplusTab = (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#344054' }}>
          <span style={{ fontWeight: 600 }}>Bill Facebook thừa</span>
          <span style={{ color: '#667085', marginLeft: 8 }}>{filteredSurplus.length} bill · Tổng giá trị <span className="mono">{fmt(filteredSurplus.reduce((s, b) => s + b.amount, 0))}</span></span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="date"
          className="text-input"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          style={{ width: 148, fontSize: 12.5 }}
        />
        <select className="select-input" value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCsFilter('all') }}>
          <option value="all">Tất cả Team</option>
          {mbTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select-input" value={csFilter} onChange={e => setCsFilter(e.target.value)}>
          <option value="all">Tất cả CS</option>
          {csList.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="text"
          className="text-input"
          placeholder="ID TKQC"
          value={tkqcSearch}
          onChange={e => setTkqcSearch(e.target.value)}
          style={{ width: 110, fontSize: 12.5 }}
        />
        <input
          type="text"
          className="text-input"
          placeholder="Mã tham chiếu"
          value={refSearch}
          onChange={e => setRefSearch(e.target.value)}
          style={{ width: 130, fontSize: 12.5 }}
        />
        <input
          type="text"
          className="text-input"
          placeholder="Last 4"
          value={last4Search}
          onChange={e => setLast4Search(e.target.value)}
          style={{ width: 80, fontSize: 12.5 }}
        />
        {(dateFilter || teamFilter !== 'all' || csFilter !== 'all' || tkqcSearch || refSearch || last4Search) && (
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={clearFilters}>Xóa bộ lọc</button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Ngày Facebook</th>
                <th>CS upload</th>
                <th>Team</th>
                <th>ID TKQC</th>
                <th>Mã tham chiếu</th>
                <th>Last 4</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Upload lúc</th>
                <th>Nguồn upload</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredSurplus.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#667085', padding: '28px' }}>Không có Bill Facebook thừa nào phù hợp.</td></tr>
              )}
              {filteredSurplus.map(b => (
                <tr key={b.id} className="table-row-hover" onClick={() => setSurplusDrawer(b)}>
                  <td style={{ fontSize: 12.5 }}>{b.fbDate}</td>
                  <td style={{ fontWeight: 500 }}>{b.cs}</td>
                  <td style={{ fontSize: 12.5, color: '#667085' }}>{b.team}</td>
                  <td className="mono" style={{ fontSize: 11.5, color: '#667085' }}>{b.tkqcId}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{b.reference}</td>
                  <td className="mono" style={{ fontSize: 12 }}>•••• {b.last4}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 500 }}>{fmt(b.amount)}</td>
                  <td style={{ fontSize: 12, color: '#667085' }}>{b.uploadedAt}</td>
                  <td style={{ fontSize: 12 }}>{b.uploadSource}</td>
                  <td><Badge type="warning">Chưa tìm thấy Bank</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
          {filteredSurplus.length} bill · Chỉ theo dõi, không có action xử lý thủ công
        </div>
      </div>

      {surplusDrawer && <SurplusBillDrawer bill={surplusDrawer} onClose={() => setSurplusDrawer(null)} />}
    </div>
  )

  // ── Tab count badges ───────────────────────────────────────────────────────
  const tabCounts: Record<MainTab, number> = {
    missing: filteredCases.length,
    approval: filteredExplanations.length,
    surplus: filteredSurplus.length,
  }

  const tabDefs: { key: MainTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'missing',
      label: 'Bill thiếu',
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3" /><path d="M6.5 4v3M6.5 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
    },
    {
      key: 'approval',
      label: 'Chờ duyệt giải trình',
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="2" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M4 5h5M4 7.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
    },
    {
      key: 'surplus',
      label: 'Bill Facebook thừa',
      icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 6.5h11M6.5 1v11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>,
    },
  ]

  return (
    <div className="page-content">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Bill thiếu</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>Theo dõi các Bill Bank chưa tìm được Facebook Bill và tiến độ xử lý của CS.</div>
        </div>
      </div>

      {/* Compact tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#F2F4F7', borderRadius: 9, padding: 3, marginBottom: 18, width: 'fit-content' }}>
        {tabDefs.map(tab => {
          const active = activeTab === tab.key
          const count = tabCounts[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: active ? '#fff' : 'transparent',
                color: active ? '#182230' : '#667085',
                fontFamily: 'inherit', fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: active ? '#2563EB' : '#98A2B3' }}>{tab.icon}</span>
              {tab.label}
              <span style={{
                background: active ? '#2563EB' : '#D0D5DD',
                color: active ? '#fff' : '#667085',
                fontSize: 10.5, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10,
                minWidth: 18, textAlign: 'center',
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'missing' && MissingTab}
      {activeTab === 'approval' && ApprovalTab}
      {activeTab === 'surplus' && SurplusTab}
    </div>
  )
}
