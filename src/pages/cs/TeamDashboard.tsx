import { useMemo, useState } from 'react'
import { fmt } from '../../data/sharedData'
import {
  getTeamMemberRows, getTeamKpis, getTeamRecentActivity, sortTeamRows,
} from '../../domain/csWorkload'
import { Badge, KpiCard, SectionHeader, TEAM_STATUS_META, formatHoursRemaining } from './shared'

type FilterKind = 'missing' | 'pending' | 'urgent' | null

interface Props {
  members: { id: string; name: string }[]
  onSelectMember: (csId: string) => void
}

export default function TeamDashboard({ members, onSelectMember }: Props) {
  const [filter, setFilter] = useState<FilterKind>(null)

  const rows = useMemo(() => sortTeamRows(getTeamMemberRows(members)), [members])
  const kpis = useMemo(() => getTeamKpis(rows), [rows])
  const activity = useMemo(() => getTeamRecentActivity(members.map(m => m.name), 5), [members])

  const filteredRows = rows.filter(r => {
    if (filter === 'missing') return r.missingBills > 0
    if (filter === 'pending') return r.pendingExplanation > 0
    if (filter === 'urgent') return r.status === 'sap_het_han'
    return true
  })

  const alertParts: string[] = []
  if (kpis.nearDeadlineCsCount) alertParts.push(`${kpis.nearDeadlineCsCount} CS sắp hết hạn`)
  if (kpis.notStartedCsCount) alertParts.push(`${kpis.notStartedCsCount} CS chưa bắt đầu xử lý`)

  return (
    <div>
      {/* Team KPI — never "Phiên đang xử lý" here (that's a Personal-only KPI, §34) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
        <KpiCard
          label="Thành viên còn Bill thiếu"
          value={`${kpis.membersWithMissing}/${kpis.totalMembers}`}
          onClick={() => setFilter(f => (f === 'missing' ? null : 'missing'))}
          active={filter === 'missing'}
        />
        <KpiCard label="Tổng Bill thiếu" value={`${kpis.totalMissingBills} Bill`} sub={fmt(kpis.totalMissingAmount)} />
        <KpiCard
          label="Chờ duyệt giải trình"
          value={`${kpis.pendingExplanationCsCount} CS`}
          onClick={() => setFilter(f => (f === 'pending' ? null : 'pending'))}
          active={filter === 'pending'}
        />
        <KpiCard
          label="Sắp hết hạn"
          value={`${kpis.nearDeadlineCsCount} CS`}
          onClick={() => setFilter(f => (f === 'urgent' ? null : 'urgent'))}
          active={filter === 'urgent'}
        />
      </div>

      {/* Alert tổng hợp — Team Dashboard has no "Việc cần làm"; Leader monitors, doesn't act for members (§35, §43) */}
      {alertParts.length > 0 && (
        <div
          style={{
            background: '#FFFAEB', border: '1px solid #FEDF89', color: '#B54708',
            borderRadius: 8, padding: '9px 14px', fontSize: 12.5, marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <span>{alertParts.join(' · ')}</span>
          {filter && <button className="btn-secondary" onClick={() => setFilter(null)}>Xóa bộ lọc</button>}
        </div>
      )}
      {alertParts.length === 0 && filter && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn-secondary" onClick={() => setFilter(null)}>Xóa bộ lọc</button>
        </div>
      )}

      {/* Bảng theo dõi Team */}
      <div style={{ marginBottom: 22 }}>
        <SectionHeader title="Theo dõi Team" sub="Leader chỉ theo dõi và hỗ trợ — không xử lý thay CS" />
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>CS</th>
                  <th>Trạng thái</th>
                  <th>Phiên active</th>
                  <th>Bill thiếu</th>
                  <th>Amount thiếu</th>
                  <th>Chờ duyệt</th>
                  <th>Hạn gần nhất</th>
                  <th style={{ minWidth: 260 }}>Hành động gần nhất</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(row => {
                  const meta = TEAM_STATUS_META[row.status]
                  return (
                    <tr key={row.csId}>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      <td><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="mono">{row.activeSessions}</td>
                      <td className="mono">{row.missingBills} Bill</td>
                      <td className="mono">{fmt(row.missingAmount)}</td>
                      <td className="mono">{row.pendingExplanation}</td>
                      <td className="mono">{row.nearestDeadlineHours != null ? `Còn ${formatHoursRemaining(row.nearestDeadlineHours)}` : '—'}</td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.lastActionDesc}</td>
                      <td>
                        <button className="btn-secondary" onClick={() => onSelectMember(row.csId)}>Xem</button>
                      </td>
                    </tr>
                  )
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: '#98A2B3', padding: '18px 14px' }}>
                      Không có CS nào khớp bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hoạt động gần đây (Team) */}
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
