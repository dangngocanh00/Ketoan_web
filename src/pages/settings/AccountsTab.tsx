import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useAccountStore } from '../../domain/accountStore'
import type { AccountStatus } from '../../domain/accountStore'
import { roleLabel } from '../../auth/permissions'
import type { Role } from '../../auth/types'

function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className="badge" style={{ background: ok ? '#ECFDF3' : '#F2F4F7', color: ok ? '#027A48' : '#667085' }}>
      {children}
    </span>
  )
}

const NO_TEAM = '__no_team__'
type RoleFilter = 'all' | Role
type TeamFilter = 'all' | typeof NO_TEAM | string
type StatusFilter = 'all' | AccountStatus

// Team assignment only applies to CS/Leader in AezCheck's own model — Admin/
// Accountant simply never carry a Team, shown as "—" rather than "Chưa phân
// Team" (which would imply an assignable-but-empty state that doesn't apply
// to these roles).
function eligibleForTeam(role: Role): boolean {
  return role === 'CS' || role === 'LEADER'
}

// Read-only synced-user directory (task Finalize, 3rd pass) — Team, Role,
// Trạng thái, Họ tên, Username are ALL AezCheck-owned data mirrored here.
// There is no create/edit/status/role/Team action anywhere on this page —
// search/filter are the only interactive controls.
export default function AccountsTab() {
  const store = useAccountStore()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return store.accounts.filter(a => {
      if (q && !a.fullName.toLowerCase().includes(q) && !a.username.toLowerCase().includes(q)) return false
      if (roleFilter !== 'all' && a.role !== roleFilter) return false
      if (teamFilter === NO_TEAM && a.teamId !== null) return false
      else if (teamFilter !== 'all' && teamFilter !== NO_TEAM && a.teamId !== teamFilter) return false
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      return true
    })
  }, [store.accounts, search, roleFilter, teamFilter, statusFilter])

  return (
    <div>
      <div style={{ background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#667085' }}>
        Thông tin tài khoản, vai trò, trạng thái và Team được đồng bộ từ AezCheck. Mọi thay đổi được thực hiện trên hệ thống AezCheck.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="text-input" style={{ width: 240 }}
          placeholder="Tìm theo tên hoặc username..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className="select-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value as RoleFilter)}>
          <option value="all">Tất cả Role</option>
          <option value="ADMIN">Admin</option>
          <option value="ACCOUNTANT">Kế toán</option>
          <option value="LEADER">Leader</option>
          <option value="CS">CS</option>
        </select>
        <select className="select-input" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">Tất cả Team</option>
          {store.teams.map(t => <option key={t.teamId} value={t.teamId}>{t.teamName}</option>)}
          <option value={NO_TEAM}>Chưa phân Team</option>
        </select>
        <select className="select-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="disabled">Ngừng hoạt động</option>
        </select>
        {(search || roleFilter !== 'all' || teamFilter !== 'all' || statusFilter !== 'all') && (
          <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setSearch(''); setRoleFilter('all'); setTeamFilter('all'); setStatusFilter('all') }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Username</th>
                <th>Role</th>
                <th>Team</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#98A2B3', padding: 24 }}>Không có tài khoản nào phù hợp với bộ lọc.</td></tr>
              )}
              {filteredAccounts.map(a => {
                const team = a.teamId ? store.teams.find(t => t.teamId === a.teamId) : null
                const canHaveTeam = eligibleForTeam(a.role)
                return (
                  <tr key={a.userId}>
                    <td style={{ fontWeight: 600 }}>{a.fullName}</td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{a.username}</td>
                    <td style={{ fontSize: 12.5 }}>{roleLabel[a.role]}</td>
                    <td style={{ fontSize: 12.5, color: canHaveTeam ? (team ? '#182230' : '#98A2B3') : '#C4C9D2' }}>
                      {canHaveTeam ? (team ? team.teamName : 'Chưa phân Team') : '—'}
                    </td>
                    <td>
                      <Badge ok={a.status === 'active'}>{a.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', fontSize: 12, color: '#667085' }}>
          {filteredAccounts.length} / {store.accounts.length} tài khoản
        </div>
      </div>
    </div>
  )
}
