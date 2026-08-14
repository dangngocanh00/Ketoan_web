import { useMemo } from 'react'
import { fmt, fmtDate } from '../../data/sharedData'
import {
  getCsSessionRows, getPersonalKpis, getTodoItems, getCsRecentActivity,
} from '../../domain/csWorkload'
import { useCombinedLiveLookup } from '../../domain/liveWorkloadLookup'
import { Badge, KpiCard, SectionHeader, STATUS_META, formatHoursRemaining } from './shared'

interface Props {
  csId: string
  csName: string
  readOnly: boolean
  // sessionId === null means "no specific session" (e.g. "Xem tất cả Bill cần xử lý").
  onProcess: (sessionId: string | null) => void
}

export default function PersonalDashboard({ csId, csName, readOnly, onProcess }: Props) {
  const live = useCombinedLiveLookup(csId)
  const rows = useMemo(() => getCsSessionRows(csId, csName, live), [csId, csName, live])
  const kpis = useMemo(() => getPersonalKpis(rows), [rows])
  const todos = useMemo(() => getTodoItems(rows), [rows])
  const activity = useMemo(() => getCsRecentActivity(csName, 8), [csName])

  const actionLabel = readOnly ? 'Xem chi tiết' : 'Xử lý'

  return (
    <div>
      {/* KPI row — workload only, no system-wide admin metrics (§45) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Phiên đang xử lý" value={`${kpis.sessionsInProgress}`} sub="phiên active còn workload" />
        <KpiCard label="Bill còn thiếu" value={`${kpis.missingBills} Bill`} sub={fmt(kpis.missingAmount)} />
        <KpiCard
          label="Chờ duyệt giải trình"
          value={`${kpis.pendingExplanationCases} case`}
          sub={kpis.pendingExplanationCases ? `${kpis.pendingExplanationBills} Bill · ${fmt(kpis.pendingExplanationAmount)}` : undefined}
        />
        <KpiCard
          label="Sắp hết hạn"
          value={`${kpis.nearDeadlineSessions} phiên`}
          sub={kpis.nearestDeadlineHours != null ? `Còn ${formatHoursRemaining(kpis.nearestDeadlineHours)}` : undefined}
        />
      </div>

      {/* Việc cần làm */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeader title="Việc cần làm" />
        {todos.length === 0 ? (
          <div className="card" style={{ padding: '16px 18px', fontSize: 13, color: '#667085' }}>
            Không có việc cần làm ngay lúc này.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todos.map(item => (
              <div
                key={item.key}
                className="card"
                style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#182230', fontWeight: 600 }}>
                    Phiên {fmtDate(item.sessionDate)} · {item.detail}
                  </div>
                </div>
                <button className="btn-secondary" style={{ flexShrink: 0 }} onClick={() => onProcess(item.sessionId)}>
                  {readOnly ? 'Xem chi tiết' : item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <button className="btn-secondary" onClick={() => onProcess(null)}>Xem tất cả Bill cần xử lý</button>
        </div>
      </div>

      {/* Phiên cần xử lý */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeader title="Phiên cần xử lý" sub="Chỉ hiển thị phiên đang active và còn workload" />
        {rows.length === 0 ? (
          <div className="card" style={{ padding: '20px 18px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230', marginBottom: 4 }}>
              Bạn không có phiên nào cần xử lý.
            </div>
            <div style={{ fontSize: 12.5, color: '#667085' }}>
              Hiện không còn Bill thiếu hoặc giải trình cần xử lý trong các phiên đang hoạt động.
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Ngày phiên</th>
                    <th>Trạng thái của tôi</th>
                    <th>Bill thiếu</th>
                    <th>Amount thiếu</th>
                    <th>Giải trình</th>
                    <th>Hạn xử lý</th>
                    <th style={{ minWidth: 260 }}>Hành động gần nhất</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const meta = STATUS_META[row.status]
                    return (
                      <tr key={row.sessionId}>
                        <td className="mono">{fmtDate(row.sessionDate)}</td>
                        <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                        <td className="mono">{row.missingBills} Bill</td>
                        <td className="mono">{fmt(row.missingAmount)}</td>
                        <td>{row.explanationPending ? <Badge tone="purple">Chờ duyệt</Badge> : '—'}</td>
                        <td className="mono">{fmtDate(row.deadline)}</td>
                        <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.lastActionDesc}</td>
                        <td>
                          <button className="btn-secondary" onClick={() => onProcess(row.sessionId)}>{actionLabel}</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Hoạt động gần đây */}
      <div>
        <SectionHeader title="Hoạt động gần đây" />
        <div className="card" style={{ padding: '4px 0' }}>
          {activity.length === 0 ? (
            <div style={{ padding: '14px 18px', fontSize: 12.5, color: '#98A2B3' }}>Chưa có hoạt động nào.</div>
          ) : (
            activity.map(entry => (
              <div key={entry.id} className="timeline-item" style={{ padding: '10px 18px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#98A2B3', marginTop: 6, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 11, color: '#98A2B3' }}>{entry.timestamp}</div>
                  <div style={{ fontSize: 13, color: '#182230' }}>{entry.action} — {entry.detail}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
