import { useAuth } from '../../auth/AuthContext'
import { teamScopeCsUsers } from '../../auth/permissions'
import type { CurrentUser } from '../../auth/types'
import { useAccountStore } from '../../domain/accountStore'
import { useCsScope, resolveScopeTarget } from '../../domain/csScope'
import type { CsScope } from '../../domain/csScope'
import PersonalDashboard from './PersonalDashboard'
import TeamDashboard from './TeamDashboard'
import { ReadOnlyBanner } from './shared'

interface Props {
  onNavigateMissingBills: () => void
}

export default function CsDashboard({ onNavigateMissingBills }: Props) {
  const { currentUser } = useAuth()
  const { scope, setScope, requestMissingBillFocus } = useCsScope()
  const { accounts } = useAccountStore()
  if (!currentUser) return null

  const isLeader = currentUser.role === 'LEADER'
  // teamScopeCsUsers already includes the Leader themself (they're also a CS
  // — §4) — the Team table shows everyone (§38-style "biết đủ toàn bộ thành
  // viên"), but the dropdown excludes self since "Cá nhân tôi" covers that (§7).
  // Resolved from the LIVE Account store (Cài đặt Finalize §11) — reflects an
  // Admin's Team reassignment immediately, no re-login required.
  const allTeamMembers = isLeader ? teamScopeCsUsers(currentUser, accounts) : []
  const memberOptions = allTeamMembers.filter(u => u.id !== currentUser.id)

  const selectValue = scope.kind === 'self' ? 'self' : scope.kind === 'team' ? 'team' : `member:${scope.csId}`

  function handleScopeChange(value: string) {
    if (value === 'self') setScope({ kind: 'self' })
    else if (value === 'team') setScope({ kind: 'team' })
    else setScope({ kind: 'member', csId: value.slice('member:'.length) })
  }

  // "Của ai người đó upload" (§24): Upload Bill Facebook never reads this
  // scope — it's wired straight to currentUser in CsUpload.tsx, independent
  // of whatever the Leader is currently looking at here.
  function goToMissingBills(csId: string, csName: string, sessionId: string | null, readOnly: boolean) {
    requestMissingBillFocus({ csId, csName, sessionId, readOnly })
    onNavigateMissingBills()
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Bảng điều hành</div>
          <div style={{ fontSize: 13, color: '#667085' }}>Việc cần xử lý, phiên cần ưu tiên và nơi để xử lý.</div>
        </div>
        {isLeader && (
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>
              Phạm vi xem
            </label>
            <select className="select-input" value={selectValue} onChange={e => handleScopeChange(e.target.value)}>
              <option value="self">Cá nhân tôi</option>
              <option value="team">Toàn Team</option>
              {memberOptions.map(m => (
                <option key={m.id} value={`member:${m.id}`}>{m.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {scope.kind === 'team' ? (
        <TeamDashboard
          members={allTeamMembers}
          onSelectMember={csId => setScope(csId === currentUser.id ? { kind: 'self' } : { kind: 'member', csId })}
        />
      ) : (
        <ScopedPersonalDashboard
          currentUser={currentUser}
          scope={scope}
          onProcess={(csId, csName, sessionId, readOnly) => goToMissingBills(csId, csName, sessionId, readOnly)}
        />
      )}
    </div>
  )
}

function ScopedPersonalDashboard({
  currentUser, scope, onProcess,
}: {
  currentUser: CurrentUser
  scope: CsScope
  onProcess: (csId: string, csName: string, sessionId: string | null, readOnly: boolean) => void
}) {
  const { accounts } = useAccountStore()
  const target = resolveScopeTarget(currentUser, scope, accounts)
  return (
    <>
      {target.readOnly && <ReadOnlyBanner name={target.displayName} />}
      <PersonalDashboard
        csId={target.csId}
        csName={target.displayName}
        readOnly={target.readOnly}
        onProcess={sessionId => onProcess(target.csId, target.displayName, sessionId, target.readOnly)}
      />
    </>
  )
}
