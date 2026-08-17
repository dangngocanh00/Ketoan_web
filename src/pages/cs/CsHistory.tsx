import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { teamScopeCsUsers } from '../../auth/permissions'
import { fmt, fmtDate, sessionsV2, userById } from '../../data/sharedData'
import { useAccountStore } from '../../domain/accountStore'
import { getClosureSnapshot, getClosureSnapshotsForCs } from '../../domain/sessionHistory'
import type { ClosureSnapshot, FinalResult } from '../../domain/sessionHistory'
import { useFacebookUploadStore } from '../../domain/facebookUploadStore'
import { useReopenStore } from '../../domain/reopenStore'
import { Badge, SectionHeader } from './shared'
import SessionDetailView from './history/SessionDetailView'
import UploadHistoryTab from './history/UploadHistoryTab'

type HistoryScope = { kind: 'self' } | { kind: 'team' } | { kind: 'member'; csId: string }
type HistoryTab = 'sessions' | 'uploads'
type ResultFilter = 'all' | FinalResult

interface ViewingDetail {
  csId: string
  sessionId: string
  fromTeamTable: boolean
}

const RESULT_META: Record<FinalResult, { label: string; tone: 'success' | 'error' }> = {
  hoan_tat: { label: 'Hoàn tất', tone: 'success' },
  con_ngoai_le: { label: 'Còn ngoại lệ', tone: 'error' },
}

// Module 4 — Lịch sử. Deliberately self-contained (its own local scope/
// filter/drill-down state, NOT CsScopeContext) — Module 2's scope is a
// "who am I currently working on" concept tied to live workflow actions;
// History has no actions at all (100% read-only, task §6), and its own
// Team-table "Xem" always jumps straight to a specific (CS, session)
// detail rather than to "that member's own list" (task §37), so it never
// needs Module 2's drill-down-origin machinery — just remembering whether
// the currently-open detail came from the Team table.
export default function CsHistory() {
  const { currentUser } = useAuth()
  const { getAllBatchesForCs, getAllBatchesForCsIds } = useFacebookUploadStore()

  const [activeTab, setActiveTab] = useState<HistoryTab>('sessions')
  const [scope, setScope] = useState<HistoryScope>({ kind: 'self' })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [viewingDetail, setViewingDetail] = useState<ViewingDetail | null>(null)

  const { accounts } = useAccountStore()
  const isLeader = currentUser?.role === 'LEADER'
  // Resolved from the LIVE Account store (Cài đặt Finalize §11) — this only
  // decides which CS ids a Leader can PICK in the selector below; it never
  // touches `closureSnapshots`/`getClosureSnapshotsForCs`, which stay 100%
  // frozen at closure time regardless (see sessionHistory.ts).
  const allTeamMembers = useMemo(
    () => (isLeader && currentUser ? teamScopeCsUsers(currentUser, accounts) : []),
    [isLeader, currentUser, accounts],
  )
  const memberOptions = currentUser ? allTeamMembers.filter(u => u.id !== currentUser.id) : []

  // §17/18 (Cài đặt Finalize, 2nd pass): revalidate — a CS who just left this
  // Leader's team can no longer be picked; a still-open selection targeting
  // them resets to "Cá nhân tôi". Their own frozen History rows are
  // untouched either way (§20) — this only bounds what a Leader may SELECT.
  useEffect(() => {
    if (scope.kind !== 'member') return
    if (!allTeamMembers.some(m => m.id === scope.csId)) setScope({ kind: 'self' })
  }, [scope, allTeamMembers])

  if (!currentUser) return null

  // §7: CS never gets a scope selector at all — always their own history.
  const effectiveScope: HistoryScope = isLeader ? scope : { kind: 'self' }
  const validMemberIds = new Set(allTeamMembers.map(m => m.id))
  const targetCsId =
    effectiveScope.kind === 'member' && validMemberIds.has(effectiveScope.csId) ? effectiveScope.csId :
    effectiveScope.kind === 'self' ? currentUser.id : ''
  const targetName =
    effectiveScope.kind === 'member' && validMemberIds.has(effectiveScope.csId) ? (userById[effectiveScope.csId]?.full_name ?? '') :
    effectiveScope.kind === 'self' ? currentUser.displayName : ''

  function inDateRange(date: string): boolean {
    if (dateFrom && date < dateFrom) return false
    if (dateTo && date > dateTo) return false
    return true
  }

  // ── Tab 1: Phiên đối soát (Closed sessions only — see sessionHistory.ts) ──
  const personalSnapshots = useMemo(() => {
    if (effectiveScope.kind === 'team' || !targetCsId) return []
    return getClosureSnapshotsForCs(targetCsId).filter(
      s => inDateRange(s.sessionDate) && (resultFilter === 'all' || s.finalResult === resultFilter),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScope.kind, targetCsId, dateFrom, dateTo, resultFilter])

  interface TeamSnapshotRow extends ClosureSnapshot { csName: string }
  const teamSnapshots = useMemo<TeamSnapshotRow[]>(() => {
    if (effectiveScope.kind !== 'team') return []
    // §8/17: the row's CS name comes from the snapshot's OWN
    // `ownerCsNameAtClosure` (frozen at closure) — never from the current
    // team roster (`m.name`, live) — a session closed for CS1 must keep
    // showing CS1 even if current ownership/team assignment changes later.
    // `allTeamMembers` only decides WHICH CS ids to look up, never what
    // name to display for a given historical row.
    return allTeamMembers
      .flatMap(m => getClosureSnapshotsForCs(m.id).map(s => ({ ...s, csName: s.ownerCsNameAtClosure })))
      .filter(s => inDateRange(s.sessionDate) && (resultFilter === 'all' || s.finalResult === resultFilter))
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScope.kind, allTeamMembers, dateFrom, dateTo, resultFilter])

  // ── Tab 2: Lịch sử tải lên (not limited to Closed sessions — §41) ──────────
  const batches = useMemo(() => {
    const list = effectiveScope.kind === 'team'
      ? getAllBatchesForCsIds(allTeamMembers.map(m => m.id))
      : targetCsId ? getAllBatchesForCs(targetCsId) : []
    return list.filter(b => {
      const sessionDate = sessionsV2.find(s => s.id === b.sessionId)?.date
      return sessionDate ? inDateRange(sessionDate) : true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScope.kind, targetCsId, allTeamMembers, dateFrom, dateTo, getAllBatchesForCs, getAllBatchesForCsIds])

  function handleScopeChange(value: string) {
    setViewingDetail(null)
    if (value === 'self') setScope({ kind: 'self' })
    else if (value === 'team') setScope({ kind: 'team' })
    else setScope({ kind: 'member', csId: value.slice('member:'.length) })
  }

  const detailSnapshot = viewingDetail ? getClosureSnapshot(viewingDetail.csId, viewingDetail.sessionId) : null
  const selectValue = effectiveScope.kind === 'self' ? 'self' : effectiveScope.kind === 'team' ? 'team' : `member:${effectiveScope.csId}`

  if (detailSnapshot) {
    return (
      <div className="page-content">
        <SessionDetailView
          snapshot={detailSnapshot}
          backLabel={viewingDetail!.fromTeamTable ? 'Quay lại Toàn Team' : 'Quay lại danh sách phiên'}
          onBack={() => setViewingDetail(null)}
        />
      </div>
    )
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Lịch sử</div>
          <div style={{ fontSize: 13, color: '#667085' }}>Tra cứu các phiên đối soát đã đóng và lịch sử tải lên Bill Facebook — chỉ xem.</div>
        </div>
        {isLeader && (
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>Phạm vi xem</label>
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

      {/* §9: 2 tabs, default Phiên đối soát */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid #E4E7EC' }}>
        {(['sessions', 'uploads'] as HistoryTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '10px 14px', fontSize: 13.5, fontWeight: 600,
              color: activeTab === tab ? '#2563EB' : '#667085',
              borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {tab === 'sessions' ? 'Phiên đối soát' : 'Lịch sử tải lên'}
          </button>
        ))}
      </div>

      {/* Filters — §11/12/47 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>Từ ngày</label>
          <input type="date" className="text-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>Đến ngày</label>
          <input type="date" className="text-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {activeTab === 'sessions' && (
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#667085', marginBottom: 4 }}>Kết quả</label>
            <select className="select-input" value={resultFilter} onChange={e => setResultFilter(e.target.value as ResultFilter)}>
              <option value="all">Tất cả</option>
              <option value="hoan_tat">Hoàn tất</option>
              <option value="con_ngoai_le">Còn ngoại lệ</option>
            </select>
          </div>
        )}
        {(dateFrom || dateTo || resultFilter !== 'all') && (
          <button className="btn-secondary" onClick={() => { setDateFrom(''); setDateTo(''); setResultFilter('all') }}>Xóa bộ lọc</button>
        )}
      </div>

      {activeTab === 'sessions' ? (
        effectiveScope.kind === 'team' ? (
          <TeamSessionTable
            rows={teamSnapshots}
            onSelect={row => setViewingDetail({ csId: row.ownerCsIdAtClosure, sessionId: row.sessionId, fromTeamTable: true })}
          />
        ) : (
          <PersonalSessionTable
            rows={personalSnapshots}
            emptyLabel={
              dateFrom || dateTo || resultFilter !== 'all'
                ? 'Không có dữ liệu phù hợp với bộ lọc.'
                : 'Chưa có phiên đối soát nào trong lịch sử.'
            }
            onSelect={row => setViewingDetail({ csId: row.ownerCsIdAtClosure, sessionId: row.sessionId, fromTeamTable: false })}
          />
        )
      ) : (
        <UploadHistoryTab batches={batches} showCsColumn={effectiveScope.kind === 'team'} />
      )}

      {/* Personal/member scope's own name context (Team scope shows CS per row instead) */}
      {effectiveScope.kind !== 'team' && targetName && isLeader && effectiveScope.kind === 'member' && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#98A2B3' }}>Đang xem lịch sử của {targetName}.</div>
      )}
    </div>
  )
}

function PersonalSessionTable({
  rows, emptyLabel, onSelect,
}: {
  rows: ClosureSnapshot[]
  emptyLabel: string
  onSelect: (row: ClosureSnapshot) => void
}) {
  const reopenStore = useReopenStore()
  return (
    <div>
      <SectionHeader title="Phiên đối soát" />
      {rows.length === 0 ? (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>{emptyLabel}</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Phiên</th>
                  <th>Kết quả</th>
                  <th>Tổng Bill Bank</th>
                  <th>Đối soát Facebook</th>
                  <th>Giải trình</th>
                  <th>Còn ngoại lệ</th>
                  <th>Tổng Amount</th>
                  <th>Thời gian kết thúc</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => {
                  const cycles = reopenStore.getCyclesForSession(s.sessionId)
                  return (
                    <tr key={s.sessionId}>
                      <td className="mono">
                        {fmtDate(s.sessionDate)}
                        {cycles.length > 0 && <div style={{ fontSize: 10.5, color: '#7F56D9', fontWeight: 600, marginTop: 2 }}>Đã mở lại {cycles.length} lần</div>}
                      </td>
                      <td><Badge tone={RESULT_META[s.finalResult].tone}>{RESULT_META[s.finalResult].label}</Badge></td>
                      <td className="mono">{s.totalBankBills}</td>
                      <td className="mono">{s.fbMatchedCount}</td>
                      <td className="mono">{s.explanationResolvedCount}</td>
                      <td className="mono">{s.unresolvedCount}</td>
                      <td className="mono">{fmt(s.totalBankAmount)}</td>
                      <td className="mono">{s.closedAt}</td>
                      <td><button className="btn-secondary" onClick={() => onSelect(s)}>Xem</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TeamSessionTable({
  rows, onSelect,
}: {
  rows: (ClosureSnapshot & { csName: string })[]
  onSelect: (row: ClosureSnapshot) => void
}) {
  return (
    <div>
      <SectionHeader title="Phiên đối soát — Toàn Team" />
      {rows.length === 0 ? (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>Không có dữ liệu phù hợp với bộ lọc.</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Phiên</th>
                  <th>CS</th>
                  <th>Kết quả</th>
                  <th>Tổng Bill Bank</th>
                  <th>Đối soát Facebook</th>
                  <th>Giải trình</th>
                  <th>Còn ngoại lệ</th>
                  <th>Tổng Amount</th>
                  <th>Kết thúc</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={`${s.ownerCsIdAtClosure}-${s.sessionId}`}>
                    <td className="mono">{fmtDate(s.sessionDate)}</td>
                    <td style={{ fontWeight: 600 }}>{s.csName}</td>
                    <td><Badge tone={RESULT_META[s.finalResult].tone}>{RESULT_META[s.finalResult].label}</Badge></td>
                    <td className="mono">{s.totalBankBills}</td>
                    <td className="mono">{s.fbMatchedCount}</td>
                    <td className="mono">{s.explanationResolvedCount}</td>
                    <td className="mono">{s.unresolvedCount}</td>
                    <td className="mono">{fmt(s.totalBankAmount)}</td>
                    <td className="mono">{s.closedAt}</td>
                    <td><button className="btn-secondary" onClick={() => onSelect(s)}>Xem</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
