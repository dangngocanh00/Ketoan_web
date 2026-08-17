import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { canViewAccountsDirectory, roleLabel } from '../auth/permissions'
import AccountsTab from './settings/AccountsTab'
import ReconciliationTab from './settings/ReconciliationTab'

type SettingsTab = 'accounts' | 'reconciliation'

// "Team CS" tab is REMOVED from the structure entirely (not hidden via CSS)
// — Admin gets exactly 2 tabs (Tài khoản, Đối soát). Tài khoản is now a
// pure READ-ONLY synced-user directory (task Finalize, 3rd pass — AezCheck
// owns identity/role/status/Team/Leader/membership; there is no write
// capability for any of that left in this app, see accountStore.tsx).
export default function Settings() {
  const { currentUser } = useAuth()
  const role = currentUser!.role
  const showAccountsTab = canViewAccountsDirectory(role)
  const [tab, setTab] = useState<SettingsTab>(showAccountsTab ? 'accounts' : 'reconciliation')

  return (
    <div className="page-content">
      <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 2 }}>Cài đặt</div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 18 }}>
        {showAccountsTab
          ? 'Danh sách tài khoản (đồng bộ từ AezCheck) và cấu hình đối soát.'
          : 'Cấu hình đối soát cho toàn hệ thống.'}
      </div>

      {/* Accountant (không quản lý tài khoản) chỉ thấy nội dung Đối soát —
          không render tab switcher, không có tab ẩn/disabled nào trong DOM. */}
      {showAccountsTab && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #E4E7EC' }}>
          {([
            ['accounts', 'Tài khoản'],
            ['reconciliation', 'Đối soát'],
          ] as [SettingsTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600, padding: '9px 14px',
                color: tab === key ? '#2563EB' : '#667085',
                borderBottom: tab === key ? '2px solid #2563EB' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {showAccountsTab && tab === 'accounts' && <AccountsTab />}
      {(!showAccountsTab || tab === 'reconciliation') && (
        <ReconciliationTab actorRoleLabel={roleLabel[role]} />
      )}
    </div>
  )
}
