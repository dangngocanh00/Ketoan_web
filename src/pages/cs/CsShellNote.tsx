import { useAuth } from '../../auth/AuthContext'
import { teamScopeCsNames } from '../../auth/permissions'

interface Props {
  title: string
  description: string
}

// Shared placeholder shell for the CS/Leader pages. Detailed UI for these
// screens is a separate follow-up task — this only proves the auth/role
// wiring (current user + team scope) reaches the page correctly.
export default function CsShellNote({ title, description }: Props) {
  const { currentUser } = useAuth()
  if (!currentUser) return null

  const teamScope = currentUser.role === 'LEADER' ? teamScopeCsNames(currentUser) : null

  return (
    <div className="page-content">
      <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#667085', marginBottom: 18 }}>{description}</div>

      <div className="card" style={{ padding: '16px 18px', maxWidth: 480 }}>
        <div style={{ fontSize: 12.5, color: '#344054' }}>
          Đăng nhập với <b>{currentUser.displayName}</b> · {currentUser.role === 'LEADER' ? 'Leader' : 'CS'}
        </div>
        {teamScope && teamScope.length > 0 && (
          <div style={{ fontSize: 12.5, color: '#667085', marginTop: 6 }}>
            Phạm vi quản lý (Team): {teamScope.join(', ')}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 10 }}>
          Giao diện chi tiết sẽ được bổ sung ở bước tiếp theo.
        </div>
      </div>
    </div>
  )
}
