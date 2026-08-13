import React, { useState, useMemo } from 'react'
import { sessionsV2, missingBillCases, explanationCases, fmt, fmtDate, mbTeams, mbCsTeamMap } from '../data/sharedData'
import type { SessionV2 } from '../data/mock'

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

// §3: Luôn dùng NGÀY PHIÊN
function getMonday(dateStr: string): string {
  const d = parseDate(dateStr)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

function getSunday(dateStr: string): string {
  const d = parseDate(getMonday(dateStr))
  d.setDate(d.getDate() + 6)
  return d.toISOString().slice(0, 10)
}

function getISOWeek(dateStr: string): number {
  const d = parseDate(dateStr)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1))
  const diff = d.getTime() - startOfWeek1.getTime()
  return Math.floor(diff / (7 * 86400000)) + 1
}

function weekLabel(dateStr: string): string {
  const w = getISOWeek(dateStr)
  const mon = formatDate(getMonday(dateStr))
  const sun = formatDate(getSunday(dateStr))
  return `Tuần ${w} · ${mon} – ${sun}`
}

function weekKey(dateStr: string): string {
  const mon = getMonday(dateStr)
  return `${mon.slice(0, 4)}-W${String(getISOWeek(dateStr)).padStart(2, '0')}`
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // "2026-08"
}

function monthLabel(mk: string): string {
  const [y, m] = mk.split('-')
  return `Tháng ${m}/${y}`
}

function progressPct(reconciled: number, bank: number): number {
  if (bank <= 0) return 0
  return Math.round((reconciled / bank) * 100 * 10) / 10
}

// §2: Snapshots = phiên đã đóng
const snapshots: SessionV2[] = sessionsV2.filter(
  s => s.status === 'closed' || s.status === 'closed_pending'
)

// CS tồn đọng per session (từ missingBillCases)
function getCsPending(sessionDate: string) {
  return missingBillCases.filter(c => c.sessionDate === sessionDate && c.remainingBills > 0)
}

// Report status
function reportStatus(s: SessionV2): 'done' | 'pending' | 'none' {
  if (s.status === 'active' || s.status === 'closing_soon') return 'none'
  const pending = getCsPending(s.date)
  return pending.length > 0 ? 'pending' : 'done'
}

// CS breakdown per session (derived from missingBillCases + hardcoded team spread)
function getCsBreakdown(session: SessionV2) {
  const totalCS = Object.keys(mbCsTeamMap)
  return totalCS.map(cs => {
    const team = mbCsTeamMap[cs]
    const pending = missingBillCases.filter(c => c.sessionDate === session.date && c.cs === cs && c.remainingBills > 0)
    const hasPending = pending.length > 0
    const pendingAmt = pending.reduce((s, c) => s + c.remainingAmount, 0)
    const pendingBills = pending.reduce((s, c) => s + c.remainingBills, 0)
    // Allocate session totals proportionally (demo: uniform spread across 13 CS)
    const csCount = totalCS.length
    const csBank = Math.round(session.bankTotal / csCount)
    const csFb = Math.round(session.fbTotal / csCount)
    const csRec = hasPending
      ? Math.round((session.reconciledAmount / csCount) * 0.85)
      : Math.round(session.reconciledAmount / csCount)
    return {
      cs, team,
      bank: csBank, fb: csFb, reconciled: csRec,
      bankUnrec: hasPending ? pendingAmt : Math.round(session.unreconciledAmount / csCount * 0.3),
      fbUnrec: Math.round(session.fbUnreconciledAmount / csCount * (hasPending ? 1.2 : 0.7)),
      exceptions: Math.round(session.exceptionsBills / csCount),
      pendingBills, pendingAmt,
      done: !hasPending,
    }
  })
}

// Team breakdown
function getTeamBreakdown(session: SessionV2) {
  const teams = mbTeams
  return teams.map(team => {
    const csInTeam = Object.entries(mbCsTeamMap).filter(([, t]) => t === team).map(([cs]) => cs)
    const csCount = csInTeam.length
    const totalCS = Object.keys(mbCsTeamMap).length
    const ratio = csCount / totalCS
    const pending = missingBillCases.filter(c => c.sessionDate === session.date && csInTeam.includes(c.cs) && c.remainingBills > 0)
    return {
      team,
      bank: Math.round(session.bankTotal * ratio),
      fb: Math.round(session.fbTotal * ratio),
      reconciled: Math.round(session.reconciledAmount * ratio),
      unreconciled: Math.round(session.unreconciledAmount * ratio),
      csPending: pending.length,
    }
  })
}

// ── Shared Badges / UI ───────────────────────────────────────────────────────

function Badge({ type, children }: { type: 'success' | 'warning' | 'error' | 'gray' | 'info'; children: React.ReactNode }) {
  const m: Record<string, [string, string]> = {
    success: ['#ECFDF3', '#027A48'], warning: ['#FFFAEB', '#B54708'],
    error: ['#FEF3F2', '#B42318'], gray: ['#F2F4F7', '#344054'],
    info: ['#EFF8FF', '#175CD3'],
  }
  const [bg, color] = m[type]
  return <span className="badge" style={{ background: bg, color }}>{children}</span>
}

function ProgressBar({ pct, color = '#2563EB' }: { pct: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#E4E7EC', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: '#344054', minWidth: 40, textAlign: 'right' }}>{pct}%</span>
    </div>
  )
}

function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12.5, fontFamily: 'inherit', padding: 0, marginBottom: 12 }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {label}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Daily Report Detail Page (§8–17)
// ══════════════════════════════════════════════════════════════════════════════

function DailyDetail({ session, onBack, onGoSession }: {
  session: SessionV2
  onBack: () => void
  onGoSession?: () => void
}) {
  const [teamFilter, setTeamFilter] = useState('all')
  const csBreakdown = useMemo(() => getCsBreakdown(session), [session])
  const teamBreakdown = useMemo(() => getTeamBreakdown(session), [session])
  const csPending = getCsPending(session.date)

  const filteredCS = teamFilter === 'all' ? csBreakdown : csBreakdown.filter(c => c.team === teamFilter)
  const filteredTeam = teamFilter === 'all' ? teamBreakdown : teamBreakdown.filter(t => t.team === teamFilter)

  const pct = progressPct(session.reconciledAmount, session.bankTotal)
  const snapshotId = `RPT-${session.date.replace(/-/g, '')}`
  const closedDateDisplay = session.closedDate ? formatDate(session.closedDate) + ' 23:59' : '—'

  return (
    <div className="page-content">
      <BackBtn label="Quay lại Báo cáo" onClick={onBack} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Báo cáo phiên {formatDate(session.date)}</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>Snapshot · Kết quả đã chốt tại thời điểm phiên đóng</div>
        </div>
        <button className="btn-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7m0 0L3.5 5.5M6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v1A1.5 1.5 0 002.5 12h7A1.5 1.5 0 0011 10.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          Xuất báo cáo XLSX
        </button>
      </div>

      {/* §17: Snapshot notice */}
      <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 12, color: '#667085' }}>
          <span style={{ fontWeight: 600, color: '#344054' }}>Snapshot {snapshotId}</span>
          {' · '}Ngày phiên: <strong>{formatDate(session.date)}</strong>
          {' · '}Thời điểm chốt: <strong>{closedDateDisplay}</strong>
          {' · '}Báo cáo được tạo từ Snapshot tại thời điểm phiên đóng.
        </div>
        {onGoSession && (
          <button className="btn-secondary" style={{ fontSize: 11.5 }} onClick={onGoSession}>
            Xem dữ liệu hiện tại →
          </button>
        )}
      </div>

      {/* §9: KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Tổng chi tiêu Sheet', value: fmt(session.sheetTotal), sub: null, color: '#344054', bg: '#F9FAFB' },
          { label: 'Tổng chi tiêu Bank', value: fmt(session.bankTotal), sub: `Chưa ĐS: ${fmt(session.unreconciledAmount)}`, color: '#175CD3', bg: '#EFF8FF' },
          { label: 'Tổng chi tiêu Facebook', value: fmt(session.fbTotal), sub: `Chưa ĐS: ${fmt(session.fbUnreconciledAmount)}`, color: '#5925DC', bg: '#F4F3FF' },
          { label: 'Đã đối soát', value: fmt(session.reconciledAmount), sub: null, color: '#027A48', bg: '#ECFDF3' },
          { label: 'Tiến độ đối soát', value: `${pct}%`, sub: 'Theo Amount', color: pct >= 95 ? '#027A48' : '#B54708', bg: pct >= 95 ? '#ECFDF3' : '#FFFAEB' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
            <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: k.color }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11, color: k.color, opacity: 0.7, marginTop: 3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <select className="select-input" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">Tất cả Team</option>
          {mbTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* §10: Breakdown theo Team */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo Team</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 140 }}>Tiến độ</th>
                <th style={{ textAlign: 'center' }}>CS tồn đọng</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map(t => (
                <tr key={t.team}>
                  <td style={{ fontWeight: 600 }}>{t.team}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(t.bank)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(t.fb)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48', fontWeight: 500 }}>{fmt(t.reconciled)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: t.unreconciled > 0 ? '#B42318' : '#667085' }}>{fmt(t.unreconciled)}</td>
                  <td><ProgressBar pct={progressPct(t.reconciled, t.bank)} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {t.csPending > 0
                      ? <Badge type="warning">{t.csPending} CS</Badge>
                      : <Badge type="success">Hoàn tất</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §11: Breakdown theo CS */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo CS</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th>CS</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Bank chưa ĐS</th>
                <th style={{ textAlign: 'right' }}>FB chưa ĐS</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredCS.map(c => (
                <tr key={c.cs}>
                  <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                  <td style={{ fontWeight: 500 }}>{c.cs}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(c.bank)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(c.fb)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{fmt(c.reconciled)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: c.bankUnrec > 0 ? '#B42318' : '#667085' }}>{fmt(c.bankUnrec)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: c.fbUnrec > 0 ? '#B54708' : '#667085' }}>{fmt(c.fbUnrec)}</td>
                  <td>{c.done ? <Badge type="success">Hoàn thành</Badge> : <Badge type="warning">Còn tồn đọng</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §13: CS còn tồn đọng */}
      {csPending.length > 0 && (
        <div className="card" style={{ marginBottom: 14, border: '1px solid #FEF0C7' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #FEF0C7', background: '#FFFAEB', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B54708', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CS còn tồn đọng</span>
            <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
              <span style={{ fontSize: 12, color: '#B54708' }}>{csPending.length} CS</span>
              <span style={{ fontSize: 12, color: '#B54708' }}>·</span>
              <span className="mono" style={{ fontSize: 12, color: '#B54708', fontWeight: 600 }}>
                {fmt(csPending.reduce((s, c) => s + c.remainingBills, 0))} bill · {fmt(csPending.reduce((s, c) => s + c.remainingAmount, 0))}
              </span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>CS</th>
                  <th style={{ textAlign: 'right' }}>Số Bill thiếu</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Giải trình</th>
                  <th>Trạng thái cuối phiên</th>
                </tr>
              </thead>
              <tbody>
                {csPending.map(c => {
                  const expCase = explanationCases.find(e => e.caseId === c.id)
                  return (
                    <tr key={c.id}>
                      <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                      <td style={{ fontWeight: 500 }}>{c.cs}</td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>{c.remainingBills}</td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>{fmt(c.remainingAmount)}</td>
                      <td>
                        {expCase ? <Badge type="warning">Chờ duyệt</Badge> : <Badge type="gray">Chưa giải trình</Badge>}
                      </td>
                      <td>{c.status === 'qua_han' ? <Badge type="error">Quá hạn</Badge> : <Badge type="info">Đang xử lý</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* §15-16: Ngoại lệ */}
      <div className="card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngoại lệ trong phiên</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Loại</th>
                <th style={{ textAlign: 'right' }}>Số case</th>
                <th style={{ textAlign: 'right' }}>Amount liên quan</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'Bill Bank chưa đối soát', cases: session.unreconciledBills, amount: session.unreconciledAmount },
                { type: 'Bill Facebook chưa đối soát', cases: session.fbUnreconciledBills, amount: session.fbUnreconciledAmount },
                { type: 'Lệch Amount / Ngoại lệ', cases: session.exceptionsBills, amount: session.exceptionsAmount },
                { type: 'Case giải trình liên quan', cases: explanationCases.filter(e => e.sessionDate === session.date).length, amount: explanationCases.filter(e => e.sessionDate === session.date).reduce((s, e) => s + e.totalAmount, 0) },
              ].filter(r => r.cases > 0).map(r => (
                <tr key={r.type}>
                  <td style={{ fontSize: 13 }}>{r.type}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 500 }}>{r.cases}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, fontWeight: 500, color: '#B54708' }}>{fmt(r.amount)}</td>
                  <td><button className="btn-secondary" style={{ fontSize: 11.5, padding: '3px 8px' }}>Xem chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Ngày (§4–17)
// ══════════════════════════════════════════════════════════════════════════════

function DailyTab({ onGoSession }: { onGoSession?: () => void }) {
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'pending' | 'none'>('all')
  const [detailSession, setDetailSession] = useState<SessionV2 | null>(null)

  // §2: Only closed sessions have proper snapshots
  const filtered = useMemo(() => {
    return sessionsV2.filter(s => {
      if (dateFilter && s.date !== dateFilter) return false
      if (statusFilter !== 'all') {
        const st = reportStatus(s)
        if (st !== statusFilter) return false
      }
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [dateFilter, statusFilter])

  if (detailSession) {
    return <DailyDetail session={detailSession} onBack={() => setDetailSession(null)} onGoSession={onGoSession} />
  }

  function statusLabel(s: SessionV2) {
    const st = reportStatus(s)
    if (st === 'none') return <Badge type="gray">Chưa có báo cáo</Badge>
    if (st === 'pending') return <Badge type="warning">Đóng còn tồn đọng</Badge>
    return <Badge type="success">Đã hoàn thành</Badge>
  }

  return (
    <div>
      {/* Filters — §4: chỉ Ngày phiên + Trạng thái */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" className="text-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: 148, fontSize: 12.5 }} title="Ngày phiên" />
        <select className="select-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="none">Chưa có báo cáo</option>
          <option value="done">Đã hoàn thành</option>
          <option value="pending">Đóng còn tồn đọng</option>
        </select>
        {(dateFilter || statusFilter !== 'all') && (
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setDateFilter(''); setStatusFilter('all') }}>Xóa bộ lọc</button>
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
                <th>Ngày phiên</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Tổng Bank</th>
                <th style={{ textAlign: 'right' }}>Tổng Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ textAlign: 'right' }}>Ngoại lệ</th>
                <th style={{ minWidth: 130 }}>Tiến độ</th>
                <th style={{ textAlign: 'center' }}>CS tồn đọng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', color: '#667085', padding: '28px' }}>Không có phiên nào phù hợp với bộ lọc.</td></tr>
              )}
              {filtered.map(s => {
                const pct = progressPct(s.reconciledAmount, s.bankTotal)
                const pending = getCsPending(s.date)
                const isClosed = s.status === 'closed' || s.status === 'closed_pending'
                return (
                  <tr key={s.id} className="table-row-hover" onClick={() => isClosed && setDetailSession(s)} style={{ cursor: isClosed ? 'pointer' : 'default' }}>
                    <td style={{ fontWeight: 600, color: '#182230' }}>{formatDate(s.date)}</td>
                    <td>{statusLabel(s)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(s.bankTotal)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(s.fbTotal)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48', fontWeight: 500 }}>{isClosed ? fmt(s.reconciledAmount) : '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: s.unreconciledAmount > 0 ? '#B42318' : '#667085' }}>{isClosed ? fmt(s.unreconciledAmount) : '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B54708' }}>{isClosed ? s.exceptionsBills : '—'}</td>
                    <td>{isClosed ? <ProgressBar pct={pct} /> : <span style={{ fontSize: 12, color: '#98A2B3' }}>Chưa đóng</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      {isClosed
                        ? pending.length > 0
                          ? <Badge type="warning">{pending.length} CS</Badge>
                          : <Badge type="success">Sạch</Badge>
                        : '—'}
                    </td>
                    <td>
                      {isClosed && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11.5, padding: '4px 10px', whiteSpace: 'nowrap' }}
                          onClick={e => { e.stopPropagation(); setDetailSession(s) }}
                        >
                          Xem chi tiết
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
          {filtered.length} phiên · {filtered.filter(s => s.status === 'closed' || s.status === 'closed_pending').length} có Snapshot
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Tuần (§18–28)
// ══════════════════════════════════════════════════════════════════════════════

function WeeklyTab() {
  // Default: week containing today (2026-08-13)
  const today = '2026-08-13'
  const [selectedWeek, setSelectedWeek] = useState(weekKey(today))
  const [teamFilter, setTeamFilter] = useState('all')

  // All available weeks from snapshots
  const allWeeks = useMemo(() => {
    const wks = new Map<string, string>()
    for (const s of snapshots) {
      const k = weekKey(s.date)
      if (!wks.has(k)) wks.set(k, weekLabel(s.date))
    }
    // Also include current week (may not have full snapshots)
    const cur = weekKey(today)
    if (!wks.has(cur)) wks.set(cur, weekLabel(today))
    return [...wks.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [])

  const weekSessions = useMemo(() => {
    return sessionsV2.filter(s => weekKey(s.date) === selectedWeek)
  }, [selectedWeek])

  const weekSnapshots = weekSessions.filter(s => s.status === 'closed' || s.status === 'closed_pending')
  const isCurrentWeek = selectedWeek === weekKey(today)
  const allDays = 7
  const closedDays = weekSnapshots.length

  // Aggregate KPIs from snapshots
  const kpi = useMemo(() => weekSnapshots.reduce((acc, s) => ({
    sheet: acc.sheet + s.sheetTotal,
    bank: acc.bank + s.bankTotal,
    bankUnrec: acc.bankUnrec + s.unreconciledAmount,
    fb: acc.fb + s.fbTotal,
    fbUnrec: acc.fbUnrec + s.fbUnreconciledAmount,
    reconciled: acc.reconciled + s.reconciledAmount,
  }), { sheet: 0, bank: 0, bankUnrec: 0, fb: 0, fbUnrec: 0, reconciled: 0 }), [weekSnapshots])

  const weekPct = progressPct(kpi.reconciled, kpi.bank)

  // §22: Tiến độ phiên
  const completedSessions = weekSnapshots.filter(s => getCsPending(s.date).length === 0).length
  const pendingSessions = weekSnapshots.filter(s => getCsPending(s.date).length > 0).length
  const notClosedSessions = weekSessions.filter(s => s.status === 'active' || s.status === 'closing_soon').length

  // Breakdown by day in week
  const dayRange = useMemo(() => {
    const mon = getMonday(weekSessions[0]?.date ?? today)
    return Array.from({ length: 7 }, (_, i) => {
      const d = parseDate(mon)
      d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [selectedWeek, weekSessions])

  // Team aggregates
  const teamAgg = useMemo(() => {
    return mbTeams.map(team => {
      const csInTeam = Object.entries(mbCsTeamMap).filter(([, t]) => t === team).map(([cs]) => cs)
      const ratio = csInTeam.length / Object.keys(mbCsTeamMap).length
      return {
        team,
        bank: Math.round(kpi.bank * ratio),
        fb: Math.round(kpi.fb * ratio),
        reconciled: Math.round(kpi.reconciled * ratio),
        unreconciled: Math.round(kpi.bankUnrec * ratio),
        phienTonDong: weekSnapshots.filter(s => getCsPending(s.date).some(c => csInTeam.includes(c.cs))).length,
      }
    })
  }, [kpi, weekSnapshots])

  // CS aggregates
  const csAgg = useMemo(() => {
    const csList = Object.keys(mbCsTeamMap)
    return csList.map(cs => {
      const team = mbCsTeamMap[cs]
      const ratio = 1 / csList.length
      const phienTonDong = weekSnapshots.filter(s => getCsPending(s.date).some(c => c.cs === cs)).length
      return {
        cs, team,
        bank: Math.round(kpi.bank * ratio),
        fb: Math.round(kpi.fb * ratio),
        reconciled: Math.round(kpi.reconciled * ratio),
        unreconciled: Math.round(kpi.bankUnrec * ratio),
        phienTonDong,
      }
    })
  }, [kpi, weekSnapshots])

  const filteredTeam = teamFilter === 'all' ? teamAgg : teamAgg.filter(t => t.team === teamFilter)
  const filteredCS = teamFilter === 'all' ? csAgg : csAgg.filter(c => c.team === teamFilter)

  // §27: Tồn đọng trong tuần
  const tonDong = weekSnapshots.flatMap(s => getCsPending(s.date).map(c => ({ ...c, sessionDate: s.date })))

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="select-input" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} style={{ minWidth: 260 }}>
          {allWeeks.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select className="select-input" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">Tất cả Team</option>
          {mbTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn-secondary" style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7m0 0L3.5 5.5M6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v1A1.5 1.5 0 002.5 12h7A1.5 1.5 0 0011 10.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          Xuất XLSX
        </button>
      </div>

      {isCurrentWeek && (
        <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#667085' }}>
          <span style={{ fontWeight: 600, color: '#344054' }}>TUẦN ĐANG DIỄN RA</span>
          {' · '}{closedDays}/{allDays} phiên đã đóng · Số liệu hiện tại chỉ bao gồm các phiên đã đóng.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 14, alignItems: 'start' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Tổng Bank', value: fmt(kpi.bank), sub: `Chưa ĐS: ${fmt(kpi.bankUnrec)}`, color: '#175CD3', bg: '#EFF8FF' },
            { label: 'Tổng Facebook', value: fmt(kpi.fb), sub: `Chưa ĐS: ${fmt(kpi.fbUnrec)}`, color: '#5925DC', bg: '#F4F3FF' },
            { label: 'Đã đối soát', value: fmt(kpi.reconciled), sub: null, color: '#027A48', bg: '#ECFDF3' },
            { label: 'Tiến độ đối soát', value: `${weekPct}%`, sub: 'Theo Amount', color: weekPct >= 95 ? '#027A48' : '#B54708', bg: weekPct >= 95 ? '#ECFDF3' : '#FFFAEB' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: 11, color: k.color, opacity: 0.7, marginTop: 3 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* §22: Tiến độ phiên — card riêng */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 10, padding: '14px 18px', minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Tiến độ phiên trong tuần</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#182230', marginBottom: 8 }}>{closedDays} / {weekSessions.length || 7} phiên đã đóng</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#667085' }}>Phiên hoàn thành</span>
              <span style={{ fontWeight: 600, color: '#027A48' }}>{completedSessions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#667085' }}>Đóng còn tồn đọng</span>
              <span style={{ fontWeight: 600, color: '#B54708' }}>{pendingSessions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#667085' }}>Chưa đóng</span>
              <span style={{ fontWeight: 600, color: '#98A2B3' }}>{notClosedSessions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* §24: Kết quả theo ngày */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kết quả theo ngày</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Ngày phiên</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 120 }}>Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {dayRange.map(day => {
                const s = sessionsV2.find(sv => sv.date === day)
                const isClosed = s && (s.status === 'closed' || s.status === 'closed_pending')
                return (
                  <tr key={day}>
                    <td style={{ fontWeight: 500 }}>{formatDate(day)}</td>
                    <td>
                      {!s ? <Badge type="gray">Không có phiên</Badge>
                        : isClosed
                          ? getCsPending(day).length > 0 ? <Badge type="warning">Đóng còn tồn đọng</Badge> : <Badge type="success">Hoàn thành</Badge>
                          : <Badge type="info">Chưa đóng</Badge>}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{s ? fmt(s.bankTotal) : '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{s ? fmt(s.fbTotal) : '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{isClosed ? fmt(s!.reconciledAmount) : '—'}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: isClosed && s!.unreconciledAmount > 0 ? '#B42318' : '#667085' }}>{isClosed ? fmt(s!.unreconciledAmount) : '—'}</td>
                    <td>{isClosed ? <ProgressBar pct={progressPct(s!.reconciledAmount, s!.bankTotal)} /> : <span style={{ fontSize: 12, color: '#98A2B3' }}>Chưa chốt</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* §25: Theo Team */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo Team</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 120 }}>Tiến độ</th>
                <th style={{ textAlign: 'center' }}>Phiên tồn đọng</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map(t => (
                <tr key={t.team}>
                  <td style={{ fontWeight: 600 }}>{t.team}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(t.bank)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(t.fb)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{fmt(t.reconciled)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: t.unreconciled > 0 ? '#B42318' : '#667085' }}>{fmt(t.unreconciled)}</td>
                  <td><ProgressBar pct={progressPct(t.reconciled, t.bank)} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {t.phienTonDong > 0 ? <Badge type="warning">{t.phienTonDong} phiên</Badge> : <Badge type="success">Sạch</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §26: Theo CS */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo CS</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th>CS</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 120 }}>Tiến độ</th>
                <th style={{ textAlign: 'center' }}>Phiên tồn đọng</th>
              </tr>
            </thead>
            <tbody>
              {filteredCS.map(c => (
                <tr key={c.cs}>
                  <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                  <td style={{ fontWeight: 500 }}>{c.cs}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(c.bank)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(c.fb)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{fmt(c.reconciled)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: c.unreconciled > 0 ? '#B42318' : '#667085' }}>{fmt(c.unreconciled)}</td>
                  <td><ProgressBar pct={progressPct(c.reconciled, c.bank)} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {c.phienTonDong > 0 ? <Badge type="warning">{c.phienTonDong}</Badge> : <Badge type="success">0</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §27: Tồn đọng trong tuần */}
      {tonDong.length > 0 && (
        <div className="card" style={{ border: '1px solid #FEF0C7' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #FEF0C7', background: '#FFFAEB', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B54708', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tồn đọng trong tuần</span>
            <span style={{ fontSize: 12, color: '#B54708' }}>{new Set(tonDong.map(c => c.cs)).size} CS · {tonDong.reduce((s, c) => s + c.remainingBills, 0)} bill · {fmt(tonDong.reduce((s, c) => s + c.remainingAmount, 0))}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>CS</th>
                  <th>Phiên</th>
                  <th style={{ textAlign: 'right' }}>Bill thiếu</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Giải trình</th>
                </tr>
              </thead>
              <tbody>
                {tonDong.map(c => {
                  const exp = explanationCases.find(e => e.caseId === c.id)
                  return (
                    <tr key={c.id}>
                      <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                      <td style={{ fontWeight: 500 }}>{c.cs}</td>
                      <td style={{ fontSize: 12.5 }}>{fmtDate(c.sessionDate)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>{c.remainingBills}</td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>{fmt(c.remainingAmount)}</td>
                      <td>{exp ? <Badge type="warning">Chờ duyệt</Badge> : <Badge type="gray">Chưa giải trình</Badge>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab Tháng (§29–38)
// ══════════════════════════════════════════════════════════════════════════════

function MonthlyTab() {
  const today = '2026-08-13'
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today))
  const [teamFilter, setTeamFilter] = useState('all')

  const allMonths = useMemo(() => {
    const months = new Map<string, string>()
    for (const s of sessionsV2) {
      const mk = monthKey(s.date)
      if (!mk) continue
      months.set(mk, monthLabel(mk))
    }
    return [...months.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [])

  // §3 + §34: Sử dụng ngày phiên để xác định tháng
  const monthSessions = useMemo(() => {
    return sessionsV2.filter(s => monthKey(s.date) === selectedMonth)
  }, [selectedMonth])

  const monthSnapshots = monthSessions.filter(s => s.status === 'closed' || s.status === 'closed_pending')
  const isCurrentMonth = selectedMonth === monthKey(today)

  const kpi = useMemo(() => monthSnapshots.reduce((acc, s) => ({
    sheet: acc.sheet + s.sheetTotal,
    bank: acc.bank + s.bankTotal,
    bankUnrec: acc.bankUnrec + s.unreconciledAmount,
    fb: acc.fb + s.fbTotal,
    fbUnrec: acc.fbUnrec + s.fbUnreconciledAmount,
    reconciled: acc.reconciled + s.reconciledAmount,
  }), { sheet: 0, bank: 0, bankUnrec: 0, fb: 0, fbUnrec: 0, reconciled: 0 }), [monthSnapshots])

  const monthPct = progressPct(kpi.reconciled, kpi.bank)

  // §32: Tiến độ phiên trong tháng
  const completedSessions = monthSnapshots.filter(s => getCsPending(s.date).length === 0).length
  const pendingSessions = monthSnapshots.filter(s => getCsPending(s.date).length > 0).length
  const notClosedSessions = monthSessions.filter(s => s.status === 'active' || s.status === 'closing_soon').length

  // §33: Breakdown theo tuần trong tháng
  const weekBreakdown = useMemo(() => {
    const wks = new Map<string, SessionV2[]>()
    for (const s of monthSessions) {
      const k = weekKey(s.date)
      if (!wks.has(k)) wks.set(k, [])
      wks.get(k)!.push(s)
    }
    return [...wks.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, sessions]) => {
      const snaps = sessions.filter(s => s.status === 'closed' || s.status === 'closed_pending')
      // §34: only count sessions with session date in this month
      const rec = snaps.reduce((s, sv) => s + sv.reconciledAmount, 0)
      const bank = snaps.reduce((s, sv) => s + sv.bankTotal, 0)
      const unrec = snaps.reduce((s, sv) => s + sv.unreconciledAmount, 0)
      const isComplete = snaps.length === sessions.length && sessions.length > 0
      return {
        weekKey: k,
        label: weekLabel(sessions[0].date),
        closedCount: snaps.length, totalCount: sessions.length,
        rec, bank, unrec, pct: progressPct(rec, bank),
        status: isComplete && snaps.every(s => getCsPending(s.date).length === 0) ? 'done' : snaps.length < sessions.length ? 'partial' : 'pending',
      }
    })
  }, [monthSessions])

  // Team & CS aggregates
  const teamAgg = useMemo(() => mbTeams.map(team => {
    const csInTeam = Object.entries(mbCsTeamMap).filter(([, t]) => t === team).map(([cs]) => cs)
    const ratio = csInTeam.length / Object.keys(mbCsTeamMap).length
    return {
      team,
      bank: Math.round(kpi.bank * ratio),
      fb: Math.round(kpi.fb * ratio),
      reconciled: Math.round(kpi.reconciled * ratio),
      unreconciled: Math.round(kpi.bankUnrec * ratio),
      phienTonDong: monthSnapshots.filter(s => getCsPending(s.date).some(c => csInTeam.includes(c.cs))).length,
    }
  }), [kpi, monthSnapshots])

  const csAgg = useMemo(() => Object.keys(mbCsTeamMap).map(cs => {
    const team = mbCsTeamMap[cs]
    const ratio = 1 / Object.keys(mbCsTeamMap).length
    return {
      cs, team,
      bank: Math.round(kpi.bank * ratio),
      fb: Math.round(kpi.fb * ratio),
      reconciled: Math.round(kpi.reconciled * ratio),
      unreconciled: Math.round(kpi.bankUnrec * ratio),
      phienTonDong: monthSnapshots.filter(s => getCsPending(s.date).some(c => c.cs === cs)).length,
    }
  }), [kpi, monthSnapshots])

  const filteredTeam = teamFilter === 'all' ? teamAgg : teamAgg.filter(t => t.team === teamFilter)
  const filteredCS = teamFilter === 'all' ? csAgg : csAgg.filter(c => c.team === teamFilter)

  // §37: Tồn đọng tháng
  const tonDong = monthSnapshots.flatMap(s => getCsPending(s.date).map(c => ({ ...c, sessionDate: s.date })))

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="select-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ minWidth: 180 }}>
          {allMonths.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select className="select-input" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">Tất cả Team</option>
          {mbTeams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn-secondary" style={{ marginLeft: 'auto', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7m0 0L3.5 5.5M6 8l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 9.5v1A1.5 1.5 0 002.5 12h7A1.5 1.5 0 0011 10.5v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          Xuất XLSX
        </button>
      </div>

      {isCurrentMonth && (
        <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '8px 14px', marginBottom: 12, fontSize: 12, color: '#667085' }}>
          <span style={{ fontWeight: 600, color: '#344054' }}>THÁNG ĐANG DIỄN RA</span>
          {' · '}{monthSnapshots.length}/{monthSessions.length} phiên đã đóng · Số liệu hiện tại chỉ bao gồm các phiên đã đóng.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 14, alignItems: 'start' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Tổng Bank', value: fmt(kpi.bank), sub: `Chưa ĐS: ${fmt(kpi.bankUnrec)}`, color: '#175CD3', bg: '#EFF8FF' },
            { label: 'Tổng Facebook', value: fmt(kpi.fb), sub: `Chưa ĐS: ${fmt(kpi.fbUnrec)}`, color: '#5925DC', bg: '#F4F3FF' },
            { label: 'Đã đối soát', value: fmt(kpi.reconciled), sub: null, color: '#027A48', bg: '#ECFDF3' },
            { label: 'Tiến độ đối soát', value: `${monthPct}%`, sub: 'Theo Amount', color: monthPct >= 95 ? '#027A48' : '#B54708', bg: monthPct >= 95 ? '#ECFDF3' : '#FFFAEB' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: k.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{k.label}</div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: 11, color: k.color, opacity: 0.7, marginTop: 3 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* §32: Tiến độ phiên trong tháng */}
        <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 10, padding: '14px 18px', minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Tiến độ phiên trong tháng</div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#182230', marginBottom: 8 }}>{monthSnapshots.length} / {monthSessions.length} phiên đã đóng</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Phiên hoàn thành', val: completedSessions, color: '#027A48' },
              { label: 'Đóng còn tồn đọng', val: pendingSessions, color: '#B54708' },
              { label: 'Chưa đóng', val: notClosedSessions, color: '#98A2B3' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#667085' }}>{r.label}</span>
                <span style={{ fontWeight: 600, color: r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* §33: Breakdown theo tuần */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kết quả theo tuần</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ minWidth: 240 }}>Tuần</th>
                <th style={{ textAlign: 'center' }}>Số phiên đã đóng</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 130 }}>Tiến độ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {weekBreakdown.map(w => (
                <tr key={w.weekKey}>
                  <td style={{ fontSize: 12.5, fontWeight: 500 }}>{w.label}</td>
                  <td className="mono" style={{ textAlign: 'center', fontSize: 12.5 }}>{w.closedCount}/{w.totalCount}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{w.rec > 0 ? fmt(w.rec) : '—'}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: w.unrec > 0 ? '#B42318' : '#667085' }}>{w.rec > 0 ? fmt(w.unrec) : '—'}</td>
                  <td>{w.rec > 0 ? <ProgressBar pct={w.pct} /> : <span style={{ fontSize: 12, color: '#98A2B3' }}>Chưa có dữ liệu</span>}</td>
                  <td>
                    {w.status === 'done' ? <Badge type="success">Hoàn tất</Badge>
                      : w.status === 'pending' ? <Badge type="warning">Còn tồn đọng</Badge>
                      : <Badge type="info">Đang diễn ra</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §35: Theo Team */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo Team</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 120 }}>Tiến độ</th>
                <th style={{ textAlign: 'center' }}>Phiên tồn đọng</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeam.map(t => (
                <tr key={t.team}>
                  <td style={{ fontWeight: 600 }}>{t.team}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(t.bank)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(t.fb)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{fmt(t.reconciled)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: t.unreconciled > 0 ? '#B42318' : '#667085' }}>{fmt(t.unreconciled)}</td>
                  <td><ProgressBar pct={progressPct(t.reconciled, t.bank)} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {t.phienTonDong > 0 ? <Badge type="warning">{t.phienTonDong} phiên</Badge> : <Badge type="success">Sạch</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §36: Theo CS */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', fontSize: 12, fontWeight: 700, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theo CS</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Team</th>
                <th>CS</th>
                <th style={{ textAlign: 'right' }}>Bank</th>
                <th style={{ textAlign: 'right' }}>Facebook</th>
                <th style={{ textAlign: 'right' }}>Đã đối soát</th>
                <th style={{ textAlign: 'right' }}>Chưa đối soát</th>
                <th style={{ minWidth: 120 }}>Tiến độ</th>
                <th style={{ textAlign: 'center' }}>Phiên tồn đọng</th>
              </tr>
            </thead>
            <tbody>
              {filteredCS.map(c => (
                <tr key={c.cs}>
                  <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                  <td style={{ fontWeight: 500 }}>{c.cs}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(c.bank)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmt(c.fb)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#027A48' }}>{fmt(c.reconciled)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: c.unreconciled > 0 ? '#B42318' : '#667085' }}>{fmt(c.unreconciled)}</td>
                  <td><ProgressBar pct={progressPct(c.reconciled, c.bank)} /></td>
                  <td style={{ textAlign: 'center' }}>
                    {c.phienTonDong > 0 ? <Badge type="warning">{c.phienTonDong}</Badge> : <Badge type="success">0</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* §37: Tồn đọng tháng */}
      {tonDong.length > 0 && (
        <div className="card" style={{ border: '1px solid #FEF0C7' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #FEF0C7', background: '#FFFAEB', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#B54708', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tồn đọng tháng</span>
            <span style={{ fontSize: 12, color: '#B54708' }}>{new Set(tonDong.map(c => c.cs)).size} CS · {tonDong.reduce((s, c) => s + c.remainingBills, 0)} bill · {fmt(tonDong.reduce((s, c) => s + c.remainingAmount, 0))}</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>CS</th>
                  <th>Phiên</th>
                  <th style={{ textAlign: 'right' }}>Bill thiếu</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {tonDong.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontSize: 12.5, color: '#667085' }}>{c.team}</td>
                    <td style={{ fontWeight: 500 }}>{c.cs}</td>
                    <td style={{ fontSize: 12.5 }}>{fmtDate(c.sessionDate)}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>{c.remainingBills}</td>
                    <td className="mono" style={{ textAlign: 'right', fontSize: 12.5, color: '#B42318', fontWeight: 600 }}>{fmt(c.remainingAmount)}</td>
                    <td>{c.status === 'qua_han' ? <Badge type="error">Quá hạn</Badge> : <Badge type="warning">Tồn đọng</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Main Reports Component
// ══════════════════════════════════════════════════════════════════════════════

type ReportTab = 'daily' | 'weekly' | 'monthly'

export default function Reports({ onGoSession }: { onGoSession?: () => void }) {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily')

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'daily', label: 'Ngày' },
    { key: 'weekly', label: 'Tuần' },
    { key: 'monthly', label: 'Tháng' },
  ]

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Báo cáo</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>Kết quả đã chốt của các phiên đối soát theo ngày, tuần, tháng.</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#F2F4F7', borderRadius: 9, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {tabs.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: active ? '#fff' : 'transparent',
                color: active ? '#182230' : '#667085',
                fontFamily: 'inherit', fontSize: 13,
                fontWeight: active ? 600 : 500,
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'daily' && <DailyTab onGoSession={onGoSession} />}
      {activeTab === 'weekly' && <WeeklyTab />}
      {activeTab === 'monthly' && <MonthlyTab />}
    </div>
  )
}
