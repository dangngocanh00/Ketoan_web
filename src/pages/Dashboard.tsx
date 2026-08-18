import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  dashboardSessions, csAttentionData, chartData,
  teams, csMembers, csTeamMap, teamFactors, csFactors,
  fmt, fmtDate,
} from '../data/sharedData'
import { exceptions, type DashboardSession, type CsAttentionItem, type ExceptionType } from '../data/mock'
import type { Page } from '../App'

interface Props {
  onNavigate: (page: Page) => void
}

type QuickFilter = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

const TODAY = '2026-08-12'

function calcRange(qf: QuickFilter, from: string, to: string) {
  if (qf === 'today') return { from: TODAY, to: TODAY }
  if (qf === 'yesterday') return { from: '2026-08-11', to: '2026-08-11' }
  if (qf === '7d') return { from: '2026-08-06', to: TODAY }
  if (qf === '30d') return { from: '2026-07-13', to: TODAY }
  return { from, to }
}

function chartDateToIso(d: string) {
  const [day, month] = d.split('/')
  return `2026-${month}-${day}`
}

function Badge({ type, children }: { type: string; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; color: string }> = {
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

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function FinancialCard({
  label, value, sub, subLabel, subValue, subValueColor, onClick, onSubClick,
}: {
  label: string; value: string; sub?: string;
  subLabel?: string; subValue?: string; subValueColor?: string;
  onClick?: () => void; onSubClick?: () => void;
}) {
  return (
    <div className="kpi-card" onClick={onClick}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: '#182230', lineHeight: 1.15, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#98A2B3' }}>{sub}</div>}
      {subLabel && subValue && (
        <div
          onClick={e => { e.stopPropagation(); onSubClick?.() }}
          style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: onSubClick ? 'pointer' : 'default' }}
        >
          <span style={{ fontSize: 12, color: '#667085' }}>{subLabel}</span>
          <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: subValueColor || '#182230' }}>{subValue}</span>
        </div>
      )}
    </div>
  )
}

function OpCard({
  label, value, sub, breakdown, onClick,
}: {
  label: string; value: string; sub?: string; breakdown?: { label: string; value: string | number }[];
  onClick?: () => void;
}) {
  return (
    <div className="kpi-card" onClick={onClick}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#182230', lineHeight: 1.2, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#98A2B3' }}>{sub}</div>}
      {breakdown && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E4E7EC', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {breakdown.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#667085' }}>
              <span>{b.label}</span>
              <span className="mono" style={{ fontWeight: 600, color: '#344054' }}>{b.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionRow({ s, onClick }: { s: DashboardSession; onClick: () => void }) {
  const pct = s.bankTotal > 0 ? (s.reconciledAmount / s.bankTotal) * 100 : 0
  const closingSoon = s.hoursRemaining <= 12
  return (
    <div className="table-row-hover" onClick={onClick} style={{ display: 'grid', gridTemplateColumns: '130px 90px 1fr 110px 90px 100px 24px', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #E4E7EC', cursor: 'pointer' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#182230' }}>Phiên {fmtDate(s.date)}</div>
        <div style={{ fontSize: 11.5, color: '#667085', marginTop: 1 }}>Ngày {s.dayOfProcessing}/{s.totalProcessingDays}</div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <Badge type="info">Đang mở</Badge>
        {closingSoon && <Badge type="error">Sắp đóng</Badge>}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11.5, color: '#667085' }}>
          <span>{pct.toFixed(1)}% đã đối soát</span>
          <span className="mono">{fmt(s.reconciledAmount)} / {fmt(s.bankTotal)}</span>
        </div>
        <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
        <div style={{ fontSize: 11, color: '#F79009', marginTop: 3, fontWeight: 500 }}>Còn {fmt(s.bankTotal - s.reconciledAmount)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: '#182230' }}>{fmt(s.bankTotal)}</div>
        <div style={{ fontSize: 11, color: '#667085' }}>Tổng Bank</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: s.csIncomplete > 10 ? '#F04438' : '#F79009' }}>{s.csIncomplete}</div>
        <div style={{ fontSize: 11, color: '#667085' }}>CS chưa xong</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: closingSoon ? '#F04438' : '#344054' }}>Còn {s.hoursRemaining}h</div>
        <div style={{ fontSize: 11, color: '#667085' }}>Hạn xử lý</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  )
}

function CsStatusBadge({ status }: { status: CsAttentionItem['status'] }) {
  if (status === 'chua_xu_ly') return <Badge type="error">Chưa xử lý</Badge>
  if (status === 'dang_xu_ly') return <Badge type="info">Đang xử lý</Badge>
  return <Badge type="warning">Đã nhắc</Badge>
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const map: Record<string, string> = { bank: 'Tổng Bank', facebook: 'Tổng Facebook', reconciled: 'Đã đối soát' }
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(16,24,40,0.1)', minWidth: 160 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#182230', marginBottom: 8 }}>{label}</div>
      {payload.map((e: any) => (
        <div key={e.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: e.stroke || e.fill, fontWeight: 500 }}>{map[e.dataKey] || e.dataKey}</span>
          <span className="mono" style={{ fontWeight: 700, color: '#182230' }}>{fmt(e.value)}</span>
        </div>
      ))}
    </div>
  )
}

function chartLegendFormatter(v: string) {
  const map: Record<string, string> = { bank: 'Tổng Bank', facebook: 'Tổng Facebook', reconciled: 'Đã đối soát' }
  return map[v] || v
}

export default function Dashboard({ onNavigate }: Props) {
  const [quick, setQuick] = useState<QuickFilter>('7d')
  const [customFrom, setCustomFrom] = useState('2026-08-06')
  const [customTo, setCustomTo] = useState(TODAY)
  const [teamFilter, setTeamFilter] = useState('all')
  const [csFilter, setCsFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [selectedSession, setSelectedSession] = useState<DashboardSession | null>(null)

  const range = useMemo(() => calcRange(quick, customFrom, customTo), [quick, customFrom, customTo])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 380)
    return () => clearTimeout(t)
  }, [quick, customFrom, customTo, teamFilter, csFilter])

  const scale = useMemo(() => {
    if (csFilter !== 'all') return csFactors[csFilter] ?? 1
    if (teamFilter !== 'all') return teamFactors[teamFilter] ?? 1
    return 1
  }, [teamFilter, csFilter])

  const filteredSessions = useMemo(
    () => dashboardSessions.filter(s => s.date >= range.from && s.date <= range.to),
    [range]
  )

  const fin = useMemo(() => {
    const bankTotal = Math.round(filteredSessions.reduce((s, r) => s + r.bankTotal, 0) * scale)
    const fbTotal = Math.round(filteredSessions.reduce((s, r) => s + r.fbTotal, 0) * scale)
    const reconciled = Math.round(filteredSessions.reduce((s, r) => s + r.reconciledAmount, 0) * scale)
    const bankBills = Math.round(filteredSessions.reduce((s, r) => s + r.bankBills, 0) * scale)
    const reconciledBills = Math.round(filteredSessions.reduce((s, r) => s + r.reconciledBills, 0) * scale)
    return {
      bankTotal, fbTotal, reconciled,
      bankUnreconciled: bankTotal - reconciled,
      fbUnreconciled: fbTotal - reconciled,
      bankBills, reconciledBills,
      unreconciledBills: bankBills - reconciledBills,
      progress: bankTotal > 0 ? (reconciled / bankTotal) * 100 : 0,
    }
  }, [filteredSessions, scale])

  const filteredExc = useMemo(() => exceptions.filter(e => {
    if (e.sessionDate < range.from || e.sessionDate > range.to) return false
    if (teamFilter !== 'all' && e.team !== teamFilter) return false
    if (csFilter !== 'all' && e.cs !== csFilter) return false
    return true
  }), [range, teamFilter, csFilter])

  const excByType: Record<ExceptionType, number> = useMemo(() => {
    const c = { missing_bill: 0, amount_mismatch: 0, duplicate_ref: 0, fb_without_bank: 0 } as Record<ExceptionType, number>
    filteredExc.forEach(e => c[e.type]++)
    return c
  }, [filteredExc])

  const waitingApproval = filteredExc.filter(e => e.status === 'explained' || e.status === 'pending_review').length

  const filteredCs = useMemo(() => csAttentionData.filter(c => {
    if (teamFilter !== 'all' && c.team !== teamFilter) return false
    if (csFilter !== 'all' && c.cs !== csFilter) return false
    return true
  }), [teamFilter, csFilter])

  const missingBillTotal = filteredCs.reduce((s, c) => s + c.missingBills, 0)
  const csHandling = filteredCs.filter(c => c.status === 'dang_xu_ly').length
  const csNoAction = filteredCs.filter(c => c.status === 'chua_xu_ly').length

  const availableCs = useMemo(() => {
    if (teamFilter === 'all') return csMembers
    return csMembers.filter(c => csTeamMap[c] === teamFilter)
  }, [teamFilter])

  const filteredChartData = useMemo(() =>
    chartData
      .filter(d => { const iso = chartDateToIso(d.date); return iso >= range.from && iso <= range.to })
      .map(d => ({ ...d, bank: Math.round(d.bank * scale), facebook: Math.round(d.facebook * scale), reconciled: Math.round(d.reconciled * scale) })),
    [range, scale]
  )

  const quickLabels: Record<QuickFilter, string> = {
    today: 'Hôm nay', yesterday: 'Hôm qua', '7d': '7 ngày', '30d': '30 ngày', custom: 'Tùy chỉnh',
  }

  return (
    <div className="page-content" style={{ position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Dashboard đối soát</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
            Theo dõi tình trạng đối soát, phiên đang xử lý và các công việc cần chú ý.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge" style={{ background: '#EFF8FF', color: '#175CD3', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6 }}>Admin</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: '#F9FAFB', borderRadius: 7, padding: 3 }}>
          {(Object.keys(quickLabels) as QuickFilter[]).map(q => (
            <button key={q} onClick={() => { setQuick(q); if (q !== 'custom') { setCustomFrom('2026-08-06'); setCustomTo(TODAY) } }}
              style={{ padding: '4px 11px', borderRadius: 5, border: 'none', cursor: 'pointer', background: quick === q ? '#2563EB' : 'transparent', color: quick === q ? '#fff' : '#667085', fontFamily: 'inherit', fontSize: 12, fontWeight: quick === q ? 600 : 500, transition: 'all 0.12s' }}>
              {quickLabels[q]}
            </button>
          ))}
        </div>
        {quick === 'custom' && (
          <>
            <input type="date" className="text-input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 138 }} />
            <span style={{ fontSize: 12, color: '#98A2B3' }}>đến</span>
            <input type="date" className="text-input" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 138 }} />
          </>
        )}
        <div style={{ width: 1, height: 20, background: '#E4E7EC', margin: '0 2px' }} />
        <select className="select-input" value={teamFilter} onChange={e => { setTeamFilter(e.target.value); setCsFilter('all') }}>
          <option value="all">Tất cả Team</option>
          {teams.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select-input" value={csFilter} onChange={e => setCsFilter(e.target.value)}>
          <option value="all">Tất cả CS</option>
          {availableCs.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(teamFilter !== 'all' || csFilter !== 'all') && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setTeamFilter('all'); setCsFilter('all') }}>
            Xóa bộ lọc
          </button>
        )}
        {loading && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: '#667085', fontSize: 12 }}>
            <div style={{ width: 14, height: 14, border: '2px solid #E4E7EC', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Đang tải...
          </div>
        )}
      </div>

      {loading && <div style={{ position: 'absolute', inset: 0, top: 130, background: 'rgba(245,247,251,0.45)', zIndex: 10, pointerEvents: 'none' }} />}

      {/* ── TỔNG QUAN ĐỐI SOÁT ── */}
      <SectionHeader title="Tổng quan đối soát" sub={`${filteredSessions.length} phiên trong khoảng đã chọn`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <FinancialCard label="Tổng đã đối soát" value={fin.reconciled > 0 ? fmt(fin.reconciled) : '—'} sub="Bank ↔ Facebook đã khớp" onClick={() => onNavigate('sessions')} />
        <FinancialCard label="Tổng chi tiêu Bank" value={fin.bankTotal > 0 ? fmt(fin.bankTotal) : '—'} sub={fin.bankBills > 0 ? `${fin.bankBills.toLocaleString()} bill đủ điều kiện` : undefined} subLabel="Chưa đối soát" subValue={fin.bankUnreconciled > 0 ? fmt(fin.bankUnreconciled) : '—'} subValueColor="#B54708" onClick={() => onNavigate('sessions')} onSubClick={() => onNavigate('sessions')} />
        <FinancialCard label="Tổng chi tiêu Facebook" value={fin.fbTotal > 0 ? fmt(fin.fbTotal) : '—'} sub="Bill Facebook đã upload" subLabel="Chưa đối soát" subValue={fin.fbUnreconciled > 0 ? fmt(fin.fbUnreconciled) : '—'} subValueColor="#B54708" onClick={() => onNavigate('sessions')} onSubClick={() => onNavigate('sessions')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        <OpCard label="Bill thiếu" value={missingBillTotal > 0 ? missingBillTotal.toLocaleString() : '0'} sub={`${filteredCs.length} CS đang cần xử lý`} onClick={() => onNavigate('missing-bills')} />
        <OpCard label="CS chưa hoàn thành" value={`${filteredCs.length} / 42 CS`} breakdown={[{ label: 'Đang xử lý', value: csHandling }, { label: 'Chưa có hành động', value: csNoAction }]} onClick={() => onNavigate('missing-bills')} />
        <OpCard label="Chờ duyệt giải trình" value={waitingApproval.toString()} sub="CS đã gửi, chờ Admin/Kế toán" onClick={() => onNavigate('missing-bills')} />
        <OpCard label="Exception" value={filteredExc.length.toString()} breakdown={[{ label: 'Lệch Amount', value: excByType.amount_mismatch }, { label: 'Trùng Reference', value: excByType.duplicate_ref }, { label: 'FB không có Bank', value: excByType.fb_without_bank }]} onClick={() => onNavigate('sessions')} />
      </div>

      {/* ── PHIÊN ĐANG ĐỐI SOÁT ── */}
      <SectionHeader title="Phiên đang đối soát" sub="Nhấn vào phiên để xem chi tiết" />
      <div className="card" style={{ marginBottom: 22 }}>
        {filteredSessions.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#667085', fontSize: 13 }}>Không có phiên nào trong khoảng ngày đã chọn.</div>
        ) : (
          filteredSessions.map(s => <SessionRow key={s.id} s={s} onClick={() => setSelectedSession(s)} />)
        )}
        {filteredSessions.length > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #E4E7EC', background: '#FAFAFA', borderRadius: '0 0 12px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#667085', fontWeight: 500 }}>Tổng tiến độ {filteredSessions.length} phiên</span>
              <span className="mono" style={{ fontSize: 12, color: '#182230', fontWeight: 700 }}>{fin.progress.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-track" style={{ height: 5 }}><div className="progress-bar-fill" style={{ width: `${fin.progress}%` }} /></div>
            <div style={{ fontSize: 11, color: '#667085', marginTop: 4 }}>
              {fmt(fin.reconciled)} / {fmt(fin.bankTotal)} đã đối soát &nbsp;·&nbsp; Còn {fmt(fin.bankUnreconciled)}
            </div>
          </div>
        )}
      </div>

      {/* ── CS CẦN CHÚ Ý + VIỆC CẦN XỬ LÝ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 22, alignItems: 'start' }}>
        <div className="card">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#182230' }}>CS cần chú ý</span>
            <span style={{ fontSize: 12, color: '#667085' }}>{filteredCs.length} CS chưa hoàn thành</span>
          </div>
          {filteredCs.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#667085', fontSize: 13 }}>Không có CS nào trong bộ lọc hiện tại.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th>CS</th><th>Team</th>
                  <th style={{ textAlign: 'right' }}>Bill thiếu</th>
                  <th style={{ textAlign: 'right' }}>Tiền thiếu</th>
                  <th>Trạng thái</th>
                  <th>TG hành động gần nhất</th>
                  <th>Phiên</th>
                </tr></thead>
                <tbody>
                  {filteredCs.map((c, i) => (
                    <tr key={i} className="table-row-hover" onClick={() => onNavigate('missing-bills')}>
                      <td style={{ fontWeight: 600 }}>{c.cs}</td>
                      <td style={{ color: '#667085', fontSize: 12.5 }}>{c.team}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: c.missingBills > 20 ? '#F04438' : '#F79009' }}>{c.missingBills}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>{fmt(c.missingAmount)}</td>
                      <td><CsStatusBadge status={c.status} /></td>
                      <td style={{ fontSize: 12, color: parseInt(c.lastActionAgo) >= 24 ? '#F04438' : '#667085' }}>{c.lastActionAgo}</td>
                      <td style={{ fontSize: 12, color: '#667085' }}>{c.session}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #E4E7EC', fontSize: 11.5, color: '#98A2B3' }}>
            Ưu tiên CS quá 24h chưa có hành động · Nhấn hàng để xem Bill thiếu
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#182230', marginBottom: 12 }}>Việc cần xử lý</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { count: excByType.amount_mismatch, label: 'Lệch Amount', sub: 'Cần kiểm tra', color: '#B54708', bg: '#FFFAEB' },
              { count: waitingApproval, label: 'Giải trình', sub: 'Chờ duyệt', color: '#5925DC', bg: '#F4F3FF' },
              { count: excByType.duplicate_ref, label: 'Trùng Reference', sub: 'Cần xác minh', color: '#175CD3', bg: '#EFF8FF' },
              { count: excByType.fb_without_bank, label: 'FB Bill chưa có Bank', sub: 'Cần kiểm tra', color: '#B42318', bg: '#FEF3F2' },
            ] as { count: number; label: string; sub: string; color: string; bg: string }[]).map((item, i) => (
              <div key={i} onClick={() => onNavigate('sessions')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: item.count > 0 ? item.bg : '#F9FAFB', border: `1px solid ${item.count > 0 ? item.bg : '#E4E7EC'}`, cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: item.count > 0 ? item.color : '#98A2B3' }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: item.count > 0 ? item.color : '#98A2B3', opacity: 0.8 }}>{item.sub}</div>
                </div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: item.count > 0 ? item.color : '#D0D5DD' }}>{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TIẾN ĐỘ ĐỐI SOÁT (Chart) ── */}
      <SectionHeader title="Tiến độ đối soát" sub="Tổng Bank · Tổng Facebook · Đã đối soát — theo ngày phiên" />
      <div className="card" style={{ padding: '16px 20px', marginBottom: 22 }}>
        {filteredChartData.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#667085', fontSize: 13 }}>Không có dữ liệu biểu đồ trong khoảng ngày đã chọn.</div>
        ) : filteredChartData.length === 1 ? (
          <div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 14 }}>So sánh — {filteredChartData[0].date}</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={filteredChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={chartLegendFormatter} />
                <Bar dataKey="bank" fill="#2563EB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="facebook" fill="#7F56D9" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reconciled" fill="#12B76A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filteredChartData} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#667085' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#98A2B3' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend formatter={chartLegendFormatter} />
              <Line dataKey="bank" stroke="#2563EB" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line dataKey="facebook" stroke="#7F56D9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line dataKey="reconciled" stroke="#12B76A" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── TÌNH TRẠNG DỮ LIỆU ── */}
      <SectionHeader title="Tình trạng dữ liệu" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {([
          { label: 'Sheet khách hàng', status: 'ok', time: '10:21' },
          { label: 'TKQC / Thẻ', status: 'ok', time: '10:18' },
          { label: 'Bill Bank', status: 'ok', time: '09:42' },
          { label: 'Bill Facebook', status: 'error', time: '10:24' },
        ] as { label: string; status: string; time: string }[]).map(src => (
          <div key={src.label} onClick={() => onNavigate('upload')} className="card" style={{ padding: '10px 14px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>{src.label}</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: src.status === 'ok' ? '#12B76A' : '#F04438', boxShadow: src.status === 'ok' ? '0 0 0 2px rgba(18,183,106,0.15)' : '0 0 0 2px rgba(240,68,56,0.15)' }} />
            </div>
            <div style={{ fontSize: 12, color: src.status === 'ok' ? '#027A48' : '#B42318', fontWeight: 500 }}>
              {src.status === 'ok' ? 'Đã đồng bộ' : 'Lỗi đồng bộ'}
            </div>
            <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 1 }}>Cập nhật lúc {src.time}</div>
          </div>
        ))}
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#182230' }}>Chi tiết phiên đối soát</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Ngày dữ liệu: {fmtDate(selectedSession.date)}</div>
              </div>
              <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 18, padding: '2px 6px' }}>×</button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge type="info">Đang mở</Badge>
                {selectedSession.hoursRemaining <= 12 && <Badge type="error">Sắp đóng</Badge>}
                <span style={{ fontSize: 12, color: '#667085' }}>
                  Ngày {selectedSession.dayOfProcessing}/{selectedSession.totalProcessingDays} · Hạn {fmtDate(selectedSession.processingDeadline)}
                </span>
              </div>
              <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Tiến độ Bill</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: '#182230' }}>{(selectedSession.bankTotal > 0 ? (selectedSession.reconciledAmount / selectedSession.bankTotal) * 100 : 0).toFixed(1)}% đã đối soát</span>
                  <span className="mono" style={{ fontSize: 12.5 }}>{fmt(selectedSession.reconciledAmount)} / {fmt(selectedSession.bankTotal)}</span>
                </div>
                <div className="progress-bar-track" style={{ height: 8 }}><div className="progress-bar-fill" style={{ width: `${selectedSession.bankTotal > 0 ? (selectedSession.reconciledAmount / selectedSession.bankTotal) * 100 : 0}%` }} /></div>
                <div style={{ fontSize: 12, color: '#F79009', marginTop: 5, fontWeight: 500 }}>
                  Còn {fmt(selectedSession.bankTotal - selectedSession.reconciledAmount)} · {selectedSession.csIncomplete} CS chưa hoàn thành
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Chỉ số tài chính</div>
                {[['Tổng đã đối soát', fmt(selectedSession.reconciledAmount), '#027A48'], ['Tổng Bank', fmt(selectedSession.bankTotal), '#182230'], ['Bank chưa đối soát', fmt(selectedSession.bankTotal - selectedSession.reconciledAmount), '#B54708'], ['Tổng Facebook', fmt(selectedSession.fbTotal), '#182230']].map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F2F4F7' }}>
                    <span style={{ fontSize: 13, color: '#667085' }}>{label}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: '#FFFAEB', border: '1px solid #FEC84B', borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ fontSize: 12, color: '#B54708', fontWeight: 600 }}>
                  {selectedSession.exceptions.toLocaleString()} ngoại lệ đang chờ · Còn {selectedSession.hoursRemaining}h
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setSelectedSession(null); onNavigate('missing-bills') }}>Xem Bill thiếu</button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setSelectedSession(null); onNavigate('sessions') }}>Xem phiên</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
