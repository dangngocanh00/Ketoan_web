import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { teamScopeCsUsers } from '../../auth/permissions'
import { useCsScope, resolveScopeTarget } from '../../domain/csScope'
import { listActiveSessions, listOpenSessionsForCs } from '../../domain/bankBills'
import { fmtDate, teamById } from '../../data/sharedData'
import PersonalMissingBills from './missingbills/PersonalMissingBills'
import TeamMissingBillsSummary from './missingbills/TeamMissingBillsSummary'

interface Props {
  onNavigateUpload: () => void
}

// Module 2 — Bill thiếu CS/Leader. Reuses Module 1's CsScopeContext (§5) so
// scope AND the Dashboard's drill-down target survive navigating here, and
// reuses the same session-lifecycle rules (§6/7/17) rather than re-deriving
// them: this module ONLY ever browses currently-open (active/closing_soon)
// sessions — closed/historical sessions belong to Module Lịch sử (not built
// yet), for every scope (CS, Leader personal, Leader member, Leader team).
export default function CsMissingBills({ onNavigateUpload }: Props) {
  const { currentUser } = useAuth()
  const {
    scope, setScope, missingBillFocus, requestUploadFocus,
    drillDownOrigin, beginTeamDrillDown, clearDrillDownOrigin,
  } = useCsScope()
  const [manualSessionId, setManualSessionId] = useState<string | null>(null)

  const isLeader = currentUser?.role === 'LEADER'
  const allTeamMembers = isLeader && currentUser ? teamScopeCsUsers(currentUser) : []
  const memberOptions = currentUser ? allTeamMembers.filter(u => u.id !== currentUser.id) : []

  const target = currentUser && scope.kind !== 'team' ? resolveScopeTarget(currentUser, scope) : null
  const targetCsId = target?.csId ?? ''

  // §11/17: Team scope has no single CS, so its session list is every
  // currently-open session system-wide; Personal/member scope stays scoped
  // to sessions that CS actually has a case in — same rule as before, just
  // now ALSO available (not hidden) when scope = Toàn Team.
  const sessionOptions = useMemo(
    () => (scope.kind === 'team' ? listActiveSessions() : targetCsId ? listOpenSessionsForCs(targetCsId) : []),
    [scope.kind, targetCsId],
  )

  // Only clear the current session pick when it's genuinely NOT selectable
  // in the new option set — never a blanket reset on every scope change.
  // This is what lets a drill-down (Team session A -> Xem Mạnh) land on the
  // SAME session A, and what lets "← Quay lại Toàn Team" come back to
  // exactly the session it left, since Team's session list is a superset of
  // any single CS's — the currently-picked session simply stays valid.
  useEffect(() => {
    if (manualSessionId && !sessionOptions.some(s => s.sessionId === manualSessionId)) {
      setManualSessionId(null)
    }
  }, [sessionOptions, manualSessionId])

  if (!currentUser) return null

  const selectValue = scope.kind === 'self' ? 'self' : scope.kind === 'team' ? 'team' : `member:${scope.csId}`

  // A direct dropdown switch is never a "drill-down from Team" — always
  // drop whatever origin might still be set, per §5.
  function handleScopeChange(value: string) {
    clearDrillDownOrigin()
    if (value === 'self') setScope({ kind: 'self' })
    else if (value === 'team') setScope({ kind: 'team' })
    else setScope({ kind: 'member', csId: value.slice('member:'.length) })
  }

  // §1: a Dashboard drill-down focus is only honored if that session is
  // STILL active — never silently resurrect a now-closed/historical session
  // into this module's selector just because Module 1 pointed at it earlier.
  const focusMatchesTarget = missingBillFocus && target && missingBillFocus.csId === target.csId
  const focusSessionId = focusMatchesTarget ? missingBillFocus!.sessionId : null
  const focusStillActive = focusSessionId != null && sessionOptions.some(s => s.sessionId === focusSessionId)
  const focusExpired = focusMatchesTarget && focusSessionId != null && !focusStillActive

  const sessionId = manualSessionId ?? (focusStillActive ? focusSessionId : null) ?? sessionOptions[0]?.sessionId ?? null

  // §24: Upload Bill Facebook always belongs to currentUser, never to
  // whatever scope/session-owner is being VIEWED here.
  function handleNavigateUpload() {
    if (sessionId) requestUploadFocus(sessionId)
    onNavigateUpload()
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
          <div style={{ fontSize: 13, color: '#667085' }}>Bank Bill chưa đối soát, TKQC cần kiểm tra và giải trình của phiên đang active.</div>
        </div>
        {/* §11/23: cả 2 selector luôn hiện song song, kể cả khi scope = Toàn Team;
            §4: nút Back không thay thế 2 selector này — vẫn dùng được để chuyển
            trực tiếp sang CS khác hoặc đổi phiên. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          {sessionOptions.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>
                Phiên đối soát
              </label>
              <select className="select-input" value={sessionId ?? ''} onChange={e => setManualSessionId(e.target.value)}>
                {sessionOptions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>{fmtDate(s.sessionDate)}</option>
                ))}
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

      {focusExpired && (
        <div style={{ background: '#FFFAEB', border: '1px solid #FEDF89', color: '#B54708', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, marginBottom: 16 }}>
          Phiên được mở từ Bảng điều hành không còn active — đang hiển thị phiên active gần nhất thay thế. Xem phiên đã đóng ở Module Lịch sử (đang phát triển).
        </div>
      )}

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
      ) : target && sessionId ? (
        <PersonalMissingBills
          csId={target.csId}
          csName={target.displayName}
          teamName={(currentUser.teamId && teamById[currentUser.teamId]?.team_name) || ''}
          sessionId={sessionId}
          sessionDate={sessionOptions.find(s => s.sessionId === sessionId)?.sessionDate ?? ''}
          readOnly={target.readOnly}
          onNavigateUpload={handleNavigateUpload}
        />
      ) : (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230', marginBottom: 4 }}>
            Không có phiên nào cần xử lý.
          </div>
          <div style={{ fontSize: 12.5, color: '#667085' }}>
            {target?.displayName ?? 'CS này'} hiện không có Bank Bill chưa đối soát trong các phiên đang hoạt động.
          </div>
        </div>
      )}
    </div>
  )
}
