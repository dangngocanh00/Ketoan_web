import { useMemo, useState } from 'react'
import { getSharedCardsForCs } from '../../../domain/sheetTongHop'
import { useTkqcDeclarationStore } from '../../../domain/tkqcDeclarationStore'
import { TODAY, userById } from '../../../data/sharedData'
import { SectionHeader } from '../shared'

interface Props {
  members: { id: string; name: string }[]
}

// §16/17: Leader monitors — sees who declared, who hasn't, which TKQC is
// unassigned/conflict. NEVER an action to declare/edit/resolve on a
// member's behalf ("của ai người đó khai") — this component renders no
// input, no save button, nothing member-editable at all.
export default function TeamTkqcSummary({ members }: Props) {
  const { getResolutionsForCard } = useTkqcDeclarationStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  const cards = useMemo(() => {
    const seen = new Map<string, ReturnType<typeof getSharedCardsForCs>[number]>()
    for (const m of members) {
      for (const c of getSharedCardsForCs(m.id)) seen.set(c.cardLast4, c)
    }
    return [...seen.values()]
  }, [members])

  return (
    <div>
      <SectionHeader title="Thẻ chạy chung — Toàn Team" sub="Leader chỉ theo dõi — của ai người đó khai" />
      {cards.length === 0 ? (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>Team hiện không có thẻ chạy chung.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cards.map(card => {
            const resolutions = getResolutionsForCard(card.cardLast4, TODAY)
            const resolved = resolutions.filter(r => r.status === 'resolved')
            const unassigned = resolutions.filter(r => r.status === 'unassigned')
            const conflict = resolutions.filter(r => r.status === 'conflict')
            const isOpen = expanded === card.cardLast4

            const byOwner = new Map<string, string[]>()
            for (const r of resolved) {
              const name = r.resolvedOwnerCsId ? (userById[r.resolvedOwnerCsId]?.full_name ?? r.resolvedOwnerCsId) : ''
              if (!byOwner.has(name)) byOwner.set(name, [])
              byOwner.get(name)!.push(r.tkqcId)
            }

            return (
              <div key={card.cardLast4} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#182230' }}>Thẻ •••• {card.cardLast4}</div>
                    <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
                      CS theo Sheet: <b style={{ color: '#344054' }}>{card.eligibleCsNames.join(', ')}</b>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <MiniStat label="Tổng TKQC" value={card.tkqcIds.length} />
                    <MiniStat label="Đã xác định" value={resolved.length} />
                    <MiniStat label="Chưa xác định" value={unassigned.length} />
                    <MiniStat label="Conflict" value={conflict.length} tone={conflict.length > 0 ? 'error' : undefined} />
                  </div>
                  <button className="btn-secondary" onClick={() => setExpanded(isOpen ? null : card.cardLast4)}>
                    {isOpen ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                  </button>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, borderTop: '1px solid #E4E7EC', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...byOwner.entries()].map(([name, tkqcIds]) => (
                      <div key={name} style={{ fontSize: 13, color: '#182230' }}>
                        <b>{name}:</b> <span className="mono">{tkqcIds.join(', ')}</span>
                      </div>
                    ))}
                    {conflict.length > 0 && (
                      <div style={{ fontSize: 13, color: '#B42318' }}>
                        <b>Conflict:</b> <span className="mono">{conflict.map(r => r.tkqcId).join(', ')}</span>
                        {' '}
                        <span style={{ fontSize: 12, color: '#7A271A' }}>
                          ({conflict.map(r => `${r.tkqcId}: ${r.declaredCsIds.map(id => userById[id]?.full_name ?? id).join(' + ')}`).join('; ')})
                        </span>
                      </div>
                    )}
                    {unassigned.length > 0 && (
                      <div style={{ fontSize: 13, color: '#667085' }}>
                        <b>Chưa xác định:</b> <span className="mono">{unassigned.map(r => r.tkqcId).join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: 'error' }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 10.5, color: '#98A2B3' }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: tone === 'error' && value > 0 ? '#B42318' : '#182230' }}>{value}</div>
    </div>
  )
}
