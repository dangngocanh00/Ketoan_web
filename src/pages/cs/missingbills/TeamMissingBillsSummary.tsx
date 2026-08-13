import { useMemo, useState } from 'react'
import { fmt } from '../../../data/sharedData'
import { getCsRecentActivity, getCsSessionRows } from '../../../domain/csWorkload'
import type { TeamMemberStatus } from '../../../domain/csWorkload'
import { useExplanationStore } from '../../../domain/explanationStore'
import { Badge, KpiCard, SectionHeader, TEAM_STATUS_META, formatHoursRemaining } from '../shared'

type FilterKind = 'missing' | 'pending' | 'urgent' | null

interface Props {
  members: { id: string; name: string }[]
  sessionId: string
  onSelectMember: (csId: string) => void
}

interface SessionRow {
  csId: string
  name: string
  status: TeamMemberStatus
  missingBills: number
  missingAmount: number
  pendingExplanation: boolean
  hoursRemaining: number | null
  lastActionDesc: string
}

const STATUS_PRIORITY: Record<TeamMemberStatus, number> = {
  sap_het_han: 0, cho_duyet: 1, dang_xu_ly: 2, chua_xu_ly: 3, hoan_tat: 4,
}

// §11-14/23: Team Summary — always paired with a "Phiên đối soát" selector
// (never hidden), and aggregates STRICTLY within that one selected session —
// never re-combines multiple active sessions into one row.
export default function TeamMissingBillsSummary({ members, sessionId, onSelectMember }: Props) {
  const [filter, setFilter] = useState<FilterKind>(null)
  const { getLookup } = useExplanationStore()

  const rows = useMemo<SessionRow[]>(() => {
    const built = members.map(m => {
      const live = getLookup(m.id)
      const row = getCsSessionRows(m.id, m.name, live).find(r => r.sessionId === sessionId)
      if (!row) {
        const recent = getCsRecentActivity(m.name, 1)[0]
        const time = recent?.timestamp.split(' ')[1]
        return {
          csId: m.id, name: m.name, status: 'hoan_tat' as const,
          missingBills: 0, missingAmount: 0, pendingExplanation: false, hoursRemaining: null,
          lastActionDesc: recent ? `${recent.action}${time ? ` lúc ${time}` : ''}` : 'Chưa có hoạt động',
        }
      }
      return {
        csId: m.id, name: m.name, status: row.status,
        missingBills: row.missingBills, missingAmount: row.missingAmount,
        pendingExplanation: row.explanationPending, hoursRemaining: row.hoursRemaining,
        lastActionDesc: row.lastActionDesc,
      }
    })
    return [...built].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status], pb = STATUS_PRIORITY[b.status]
      if (pa !== pb) return pa - pb
      const ha = a.hoursRemaining ?? Infinity, hb = b.hoursRemaining ?? Infinity
      return ha - hb
    })
  }, [members, sessionId, getLookup])

  const kpis = useMemo(() => {
    const withMissing = rows.filter(r => r.missingBills > 0)
    return {
      totalMembers: rows.length,
      membersWithMissing: withMissing.length,
      totalMissingBills: rows.reduce((s, r) => s + r.missingBills, 0),
      totalMissingAmount: Math.round(rows.reduce((s, r) => s + r.missingAmount, 0) * 100) / 100,
      pendingCount: rows.filter(r => r.pendingExplanation).length,
    }
  }, [rows])

  const filteredRows = rows.filter(r => {
    if (filter === 'missing') return r.missingBills > 0
    if (filter === 'pending') return r.pendingExplanation
    if (filter === 'urgent') return r.status === 'sap_het_han'
    return true
  })

  return (
    <div>
      {/* Team KPI — §13 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard
          label="CS còn Bill thiếu"
          value={`${kpis.membersWithMissing}/${kpis.totalMembers}`}
          onClick={() => setFilter(f => (f === 'missing' ? null : 'missing'))}
          active={filter === 'missing'}
        />
        <KpiCard label="Bill chưa đối soát" value={`${kpis.totalMissingBills} Bill`} />
        <KpiCard label="Amount chưa đối soát" value={fmt(kpis.totalMissingAmount)} />
        <KpiCard
          label="Chờ duyệt"
          value={`${kpis.pendingCount} CS`}
          onClick={() => setFilter(f => (f === 'pending' ? null : 'pending'))}
          active={filter === 'pending'}
        />
      </div>

      {filter && (
        <div style={{ marginBottom: 16 }}>
          <button className="btn-secondary" onClick={() => setFilter(null)}>Xóa bộ lọc</button>
        </div>
      )}

      {/* §14: KHÔNG có cột "TKQC cần tìm" ở overview Team — chỉ xem trong member detail. */}
      <div>
        <SectionHeader title="Bill thiếu theo CS" sub="Leader chỉ theo dõi — click Xem để mở Bill thiếu cá nhân ở chế độ chỉ xem" />
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>CS</th>
                  <th>Trạng thái</th>
                  <th>Bill chưa đối soát</th>
                  <th>Amount chưa đối soát</th>
                  <th>Hạn xử lý</th>
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
                      <td className="mono">{row.missingBills} Bill</td>
                      <td className="mono">{fmt(row.missingAmount)}</td>
                      <td className="mono">{row.hoursRemaining != null ? `Còn ${formatHoursRemaining(row.hoursRemaining)}` : '—'}</td>
                      <td style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{row.lastActionDesc}</td>
                      <td><button className="btn-secondary" onClick={() => onSelectMember(row.csId)}>Xem</button></td>
                    </tr>
                  )
                })}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#98A2B3', padding: '18px 14px' }}>
                      Không có CS nào khớp bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
