import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { teamScopeCsUsers } from '../../auth/permissions'
import { useAccountStore } from '../../domain/accountStore'
import { useCsScope, resolveScopeTarget } from '../../domain/csScope'
import { listActiveSessions } from '../../domain/bankBills'
import { useReopenStore } from '../../domain/reopenStore'
import { fmtDate } from '../../data/sharedData'
import PersonalMissingBills from './missingbills/PersonalMissingBills'
import TeamMissingBillsSummary from './missingbills/TeamMissingBillsSummary'

interface Props {
  onNavigateUpload: () => void
}

// Module 2 — Bill thiếu CS/Leader. Reuses Module 1's CsScopeContext (§5) so
// scope survives navigating here, and reuses the same session-lifecycle
// rules rather than re-deriving them: this module ONLY ever browses
// currently-open (active/closing_soon/reopened) sessions — closed/historical
// sessions belong to Module Lịch sử, for every scope (CS, Leader personal,
// Leader member, Leader team).
//
// Chọn Bill khi giải trình task §1/§9/§11: for scope self/member,
// PersonalMissingBills now shows ALL of that CS's ACTIVE+REOPENED sessions
// merged into ONE table by itself — so there is no more "which session" pick
// to make here, and no dropdown for it. Team scope is UNCHANGED — it's a
// per-CS roll-up that "aggregates STRICTLY within ONE selected session"
// (see TeamMissingBillsSummary's own header comment), so its own "Phiên đối
// soát" selector stays exactly as it was.
export default function CsMissingBills({ onNavigateUpload }: Props) {
  const { currentUser } = useAuth()
  const {
    scope, setScope,
    drillDownOrigin, beginTeamDrillDown, clearDrillDownOrigin,
  } = useCsScope()
  const [manualSessionId, setManualSessionId] = useState<string | null>(null)
  const { accounts, teams } = useAccountStore()

  const isLeader = currentUser?.role === 'LEADER'
  // Resolved from the LIVE Account store (Cài đặt Finalize §11) — see
  // permissions.ts's `teamScopeCsUsers` comment for why this can't use the
  // static sharedTeams seed or the cached currentUser.teamId.
  const allTeamMembers = isLeader && currentUser ? teamScopeCsUsers(currentUser, accounts) : []
  const memberOptions = currentUser ? allTeamMembers.filter(u => u.id !== currentUser.id) : []

  // Live team name for display (§11) — resolved from the Account store's own
  // current `teamId`, never the static seed.
  const liveOwnTeamId = currentUser ? accounts.find(a => a.userId === currentUser.id)?.teamId ?? null : null
  const liveTeamName = liveOwnTeamId ? (teams.find(t => t.teamId === liveOwnTeamId)?.teamName ?? '') : ''

  const target = currentUser && scope.kind !== 'team' ? resolveScopeTarget(currentUser, scope, accounts) : null

  // Team scope only — every currently-open session system-wide, its own
  // "Phiên đối soát" selector (unrelated to the CS/member merged table).
  const reopenStore = useReopenStore()
  const sessionOptions = useMemo(() => {
    if (scope.kind !== 'team') return []
    const base = listActiveSessions()
    const reopened = reopenStore.getAllReopenedSessions()
    const seen = new Set(base.map(s => s.sessionId))
    return [...base, ...reopened.filter(s => !seen.has(s.sessionId))]
  }, [scope.kind, reopenStore])

  useEffect(() => {
    if (manualSessionId && !sessionOptions.some(s => s.sessionId === manualSessionId)) {
      setManualSessionId(null)
    }
  }, [sessionOptions, manualSessionId])

  if (!currentUser) return null

  const sessionId = manualSessionId ?? sessionOptions[0]?.sessionId ?? null
  const selectValue = scope.kind === 'self' ? 'self' : scope.kind === 'team' ? 'team' : `member:${scope.csId}`

  // A direct dropdown switch is never a "drill-down from Team" — always
  // drop whatever origin might still be set, per §5.
  function handleScopeChange(value: string) {
    clearDrillDownOrigin()
    if (value === 'self') setScope({ kind: 'self' })
    else if (value === 'team') setScope({ kind: 'team' })
    else setScope({ kind: 'member', csId: value.slice('member:'.length) })
  }

  // Team table's "Xem" — the ONE place that records a drill-down origin, so
  // Member Detail knows it arrived from Team (and which session) and can
  // offer a real "← Quay lại Toàn Team" instead of forcing the dropdown.
  const handleDrillDownFromTeam = (csId: string) => {
    if (sessionId) beginTeamDrillDown(sessionId)
    setScope(csId === currentUser.id ? { kind: 'self' } : { kind: 'member', csId })
  }

  function handleBackToTeam() {
    const origin = drillDownOrigin
    clearDrillDownOrigin()
    setScope({ kind: 'team' })
    if (origin) setManualSessionId(origin.sessionId)
  }

  const showTeamBackLink = scope.kind === 'member' && !!drillDownOrigin

  return (
    <div className="page-content">
      {showTeamBackLink && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12.5 }}>
          <button
            onClick={handleBackToTeam}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#2563EB', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Quay lại Toàn Team
          </button>
          <span style={{ color: '#98A2B3' }}>/ {target?.displayName}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Bill thiếu</div>
          <div style={{ fontSize: 13, color: '#667085' }}>Bank Bill chưa đối soát, TKQC cần kiểm tra và giải trình của mọi phiên đang xử lý (active + đã mở lại).</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          {/* Team scope's own session selector — unrelated to/unaffected by
              the merged Bill thiếu table used for self/member scope. */}
          {scope.kind === 'team' && sessionOptions.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>
                Phiên đối soát
              </label>
              <select className="select-input" value={sessionId ?? ''} onChange={e => setManualSessionId(e.target.value)}>
                {sessionOptions.map(s => {
                  const isReopened = reopenStore.isSessionReopened(s.sessionId)
                  return (
                    <option key={s.sessionId} value={s.sessionId}>
                      {fmtDate(s.sessionDate)}{isReopened ? ' — Đã mở lại' : ''}
                    </option>
                  )
                })}
              </select>
            </div>
          )}
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
      </div>

      {scope.kind === 'team' ? (
        sessionId ? (
          <TeamMissingBillsSummary
            members={allTeamMembers}
            sessionId={sessionId}
            onSelectMember={handleDrillDownFromTeam}
          />
        ) : (
          <div className="card" style={{ padding: '20px 18px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>Không có phiên active nào.</div>
          </div>
        )
      ) : target ? (
        <PersonalMissingBills
          csId={target.csId}
          csName={target.displayName}
          teamName={liveTeamName}
          readOnly={target.readOnly}
          onNavigateUpload={onNavigateUpload}
        />
      ) : (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230', marginBottom: 4 }}>
            Không có phiên nào cần xử lý.
          </div>
        </div>
      )}
    </div>
  )
}
