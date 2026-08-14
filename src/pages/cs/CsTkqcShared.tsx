import { useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { teamScopeCsUsers } from '../../auth/permissions'
import { TODAY, userById } from '../../data/sharedData'
import { getSharedCardsForCs } from '../../domain/sheetTongHop'
import { useTkqcDeclarationStore } from '../../domain/tkqcDeclarationStore'
import { Badge, SectionHeader } from './shared'
import DeclareModal from './tkqc/DeclareModal'
import TeamTkqcSummary from './tkqc/TeamTkqcSummary'

type Scope = { kind: 'self' } | { kind: 'team' } | { kind: 'member'; csId: string }

type CsCardStatus = 'chua_khai' | 'da_khai' | 'can_kiem_tra'

const CS_STATUS_META: Record<CsCardStatus, { label: string; tone: 'gray' | 'success' | 'warning' }> = {
  chua_khai: { label: 'Chưa khai', tone: 'gray' },
  da_khai: { label: 'Đã khai', tone: 'success' },
  can_kiem_tra: { label: 'Cần kiểm tra', tone: 'warning' },
}

// TKQC Chạy Chung — CS/Leader. Self-contained local scope state, same
// design choice as CsHistory.tsx: this module has no drill-down-origin
// concept to preserve, so it doesn't need CsScopeContext.
export default function CsTkqcShared() {
  const { currentUser } = useAuth()
  const { getDeclaredTkqcIdsForCs, getResolutionsForCard } = useTkqcDeclarationStore()
  const [scope, setScope] = useState<Scope>({ kind: 'self' })
  const [declaringCard, setDeclaringCard] = useState<string | null>(null)

  const isLeader = currentUser?.role === 'LEADER'
  const allTeamMembers = useMemo(
    () => (isLeader && currentUser ? teamScopeCsUsers(currentUser) : []),
    [isLeader, currentUser],
  )
  const memberOptions = currentUser ? allTeamMembers.filter(u => u.id !== currentUser.id) : []

  if (!currentUser) return null

  const effectiveScope: Scope = isLeader ? scope : { kind: 'self' }
  const targetCsId = effectiveScope.kind === 'member' ? effectiveScope.csId : effectiveScope.kind === 'self' ? currentUser.id : ''
  const targetName =
    effectiveScope.kind === 'member' ? (userById[effectiveScope.csId]?.full_name ?? '') :
    effectiveScope.kind === 'self' ? currentUser.displayName : ''
  // §16: Leader can VIEW a member's cards from Team scope but never declare
  // for them — "của ai người đó khai". Own "Cá nhân tôi" scope always acts
  // as themselves.
  const readOnly = effectiveScope.kind === 'member'

  const cards = useMemo(() => (targetCsId ? getSharedCardsForCs(targetCsId) : []), [targetCsId])

  const selectValue = effectiveScope.kind === 'self' ? 'self' : effectiveScope.kind === 'team' ? 'team' : `member:${effectiveScope.csId}`
  function handleScopeChange(value: string) {
    if (value === 'self') setScope({ kind: 'self' })
    else if (value === 'team') setScope({ kind: 'team' })
    else setScope({ kind: 'member', csId: value.slice('member:'.length) })
  }

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>TKQC Chạy Chung</div>
          <div style={{ fontSize: 13, color: '#667085' }}>Khai TKQC của bạn trên các thẻ chạy chung nhiều CS theo Sheet tổng hợp.</div>
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

      {effectiveScope.kind === 'team' ? (
        <TeamTkqcSummary members={allTeamMembers} />
      ) : (
        <div>
          <SectionHeader
            title="Thẻ chạy chung của tôi"
            sub={readOnly ? `Đang xem thẻ chạy chung của ${targetName} — chỉ xem, không thể khai thay.` : undefined}
          />
          {cards.length === 0 ? (
            <div className="card" style={{ padding: '20px 18px' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>
                {readOnly
                  ? `${targetName} hiện không có thẻ chạy chung cần khai báo TKQC.`
                  : 'Bạn hiện không có thẻ chạy chung cần khai báo TKQC.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {cards.map(card => {
                const declaredIds = getDeclaredTkqcIdsForCs(targetCsId, card.cardLast4)
                const resolutions = getResolutionsForCard(card.cardLast4, TODAY)
                const myConflicts = resolutions.filter(r => r.status === 'conflict' && r.declaredCsIds.includes(targetCsId))
                const status: CsCardStatus = declaredIds.length === 0 ? 'chua_khai' : myConflicts.length > 0 ? 'can_kiem_tra' : 'da_khai'
                const others = card.eligibleCsNames.filter(n => n !== targetName)
                return (
                  <div key={card.cardLast4} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#182230' }}>Thẻ •••• {card.cardLast4}</div>
                      <Badge tone={CS_STATUS_META[status].tone}>{CS_STATUS_META[status].label}</Badge>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 12 }}>
                      Chạy chung với: <b style={{ color: '#344054' }}>{others.join(', ')}</b>
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#98A2B3' }}>TKQC theo Sheet</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>{card.tkqcIds.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#98A2B3' }}>TKQC tôi đã khai</div>
                        <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#182230' }}>{declaredIds.length}</div>
                      </div>
                    </div>
                    {!readOnly && (
                      <button className="btn-secondary" onClick={() => setDeclaringCard(card.cardLast4)}>
                        {declaredIds.length === 0 ? 'Khai TKQC của tôi' : 'Sửa TKQC của tôi'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* The modal can only ever open when !readOnly, i.e. targetCsId is
          already currentUser.id (self scope) — but passing `currentUser`
          itself (rather than a separately-threaded csId/csName pair) makes
          the "actor === declaration owner" invariant self-evident here,
          not just enforced deep in the store (task §10/13). */}
      {declaringCard && (
        <DeclareModal
          cardLast4={declaringCard}
          currentUser={currentUser}
          onClose={() => setDeclaringCard(null)}
          onSaved={() => setDeclaringCard(null)}
        />
      )}
    </div>
  )
}
