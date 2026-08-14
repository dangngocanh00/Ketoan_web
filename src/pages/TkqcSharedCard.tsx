import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { TODAY, userById } from '../data/sharedData'
import { sharedCardsSheet } from '../domain/sheetTongHop'
import { useTkqcDeclarationStore } from '../domain/tkqcDeclarationStore'
import type { TkqcMasterStatus, TkqcResolution } from '../domain/sharedCardOwnership'

function Badge({ type, children }: { type: 'error' | 'warning' | 'success' | 'gray'; children: ReactNode }) {
  const m: Record<string, [string, string]> = {
    error: ['#FEF3F2', '#B42318'], warning: ['#FFFAEB', '#B54708'],
    success: ['#ECFDF3', '#027A48'], gray: ['#F2F4F7', '#344054'],
  }
  const [bg, color] = m[type]
  return <span className="badge" style={{ background: bg, color }}>{children}</span>
}

const STATUS_META: Record<TkqcMasterStatus, { label: string; badge: 'success' | 'gray' | 'error' }> = {
  resolved: { label: 'Đã xác định', badge: 'success' },
  unassigned: { label: 'Chưa xác định', badge: 'gray' },
  conflict: { label: 'Conflict', badge: 'error' },
}

type StatusFilter = 'all' | TkqcMasterStatus

function csName(csId: string): string {
  return userById[csId]?.full_name ?? csId
}

// §18-24: Accountant/Admin master monitoring for "TKQC Chạy Chung" — READ
// ONLY (task §24: no declare-for-CS, no edit, no manual conflict resolve —
// Conflict is only ever resolved by the CS themselves editing their own
// declaration, see tkqcDeclarationStore.submitOwnDeclaration, which itself
// rejects an ADMIN/ACCOUNTANT actor outright — task §12/21). Reads the SAME
// live TkqcDeclarationStore Context every other role reads (task §0: one
// shared domain, never a separate Admin dataset). "Master ALL view" is
// always the CURRENT state (as of TODAY) — historical resolution is
// Module 4's job, not this monitoring page's.
export default function TkqcSharedCard() {
  const { getAllResolutions } = useTkqcDeclarationStore()
  const [cardFilter, setCardFilter] = useState<string>('all')
  const [csFilter, setCsFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const allResolutions = getAllResolutions(TODAY)

  const allCsIds = useMemo(
    () => [...new Set(sharedCardsSheet.flatMap(c => c.eligibleCsIds))],
    [],
  )

  // §20: two DIFFERENT concepts, never merged — "CS theo Sheet" (card-level
  // eligibility) vs "CS đã khai" (row-level, who actually declared this
  // specific TKQC).
  const filtered = useMemo(() => {
    return allResolutions.filter(r => {
      if (cardFilter !== 'all' && r.cardLast4 !== cardFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (csFilter !== 'all') {
        const card = sharedCardsSheet.find(c => c.cardLast4 === r.cardLast4)!
        const onSheet = card.eligibleCsIds.includes(csFilter)
        const declared = r.declaredCsIds.includes(csFilter)
        if (!onSheet && !declared) return false
      }
      return true
    })
  }, [allResolutions, cardFilter, csFilter, statusFilter])

  // §22: summary derived from the SAME filtered dataset — never hard-coded.
  const cardLast4sInView = new Set(filtered.map(r => r.cardLast4))
  const summary = {
    cards: cardLast4sInView.size,
    tkqc: filtered.length,
    resolved: filtered.filter(r => r.status === 'resolved').length,
    unassigned: filtered.filter(r => r.status === 'unassigned').length,
    conflict: filtered.filter(r => r.status === 'conflict').length,
  }

  const cardsToRender = sharedCardsSheet.filter(c => cardLast4sInView.has(c.cardLast4))

  return (
    <div className="page-content">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>TKQC Chạy Chung</div>
        <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
          Giám sát toàn bộ thẻ chạy chung, TKQC và declaration của CS theo Sheet tổng hợp — chỉ xem.
        </div>
      </div>

      {/* §22: summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 18 }}>
        <SummaryCard label="Thẻ chạy chung" value={summary.cards} />
        <SummaryCard label="TKQC" value={summary.tkqc} />
        <SummaryCard label="Đã xác định" value={summary.resolved} tone="success" />
        <SummaryCard label="Chưa xác định" value={summary.unassigned} />
        <SummaryCard label="Conflict" value={summary.conflict} tone={summary.conflict > 0 ? 'error' : undefined} />
      </div>

      {/* §23: filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', padding: '10px 14px', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#667085' }}>Thẻ:</label>
          <select className="select-input" value={cardFilter} onChange={e => setCardFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            {sharedCardsSheet.map(c => <option key={c.cardLast4} value={c.cardLast4}>•••• {c.cardLast4}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#667085' }}>CS:</label>
          <select className="select-input" value={csFilter} onChange={e => setCsFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            {allCsIds.map(id => <option key={id} value={id}>{csName(id)}</option>)}
          </select>
        </div>
        <div style={{ width: 1, height: 20, background: '#E4E7EC' }} />
        <div style={{ display: 'flex', gap: 4, background: '#F9FAFB', borderRadius: 7, padding: 3 }}>
          {([['all', 'Tất cả'], ['resolved', 'Đã xác định'], ['unassigned', 'Chưa xác định'], ['conflict', 'Conflict']] as [StatusFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              style={{ padding: '4px 11px', borderRadius: 5, border: 'none', cursor: 'pointer', background: statusFilter === val ? '#2563EB' : 'transparent', color: statusFilter === val ? '#fff' : '#667085', fontFamily: 'inherit', fontSize: 12, fontWeight: statusFilter === val ? 600 : 500, whiteSpace: 'nowrap' }}
            >
              {label}
            </button>
          ))}
        </div>
        {(cardFilter !== 'all' || csFilter !== 'all' || statusFilter !== 'all') && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => { setCardFilter('all'); setCsFilter('all'); setStatusFilter('all') }}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {cardsToRender.length === 0 ? (
        <div className="card" style={{ padding: '20px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#182230' }}>
            {sharedCardsSheet.length === 0
              ? 'Chưa có thẻ chạy chung trong dữ liệu Sheet tổng hợp.'
              : 'Không có TKQC phù hợp với bộ lọc hiện tại.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cardsToRender.map(card => {
            const rows = filtered.filter(r => r.cardLast4 === card.cardLast4)
            const cardResolved = rows.filter(r => r.status === 'resolved').length
            const cardUnassigned = rows.filter(r => r.status === 'unassigned').length
            const cardConflict = rows.filter(r => r.status === 'conflict').length
            return (
              <div key={card.cardLast4} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#182230' }}>Thẻ •••• {card.cardLast4}</div>
                    <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
                      CS theo Sheet: <b style={{ color: '#344054' }}>{card.eligibleCsNames.join(', ')}</b>
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#667085' }}>
                    {rows.length} TKQC · {cardResolved} đã xác định · {cardUnassigned} chưa xác định · {cardConflict} conflict
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th>TKQC</th>
                        <th>CS theo Sheet</th>
                        <th>CS đã khai</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <TkqcRow key={r.tkqcId} r={r} sheetCsNames={card.eligibleCsNames} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TkqcRow({ r, sheetCsNames }: { r: TkqcResolution; sheetCsNames: string[] }) {
  const meta = STATUS_META[r.status]
  const declaredNames = r.declaredCsIds.map(csName)
  return (
    <tr>
      <td className="mono">{r.tkqcId}</td>
      <td>{sheetCsNames.join(', ')}</td>
      <td>{declaredNames.length > 0 ? declaredNames.join(', ') : '—'}</td>
      <td><Badge type={meta.badge}>{meta.label}</Badge></td>
    </tr>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'error' }) {
  const color = tone === 'success' ? '#027A48' : tone === 'error' && value > 0 ? '#B42318' : '#182230'
  return (
    <div className="kpi-card">
      <div style={{ fontSize: 11, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1.15 }}>{value}</div>
    </div>
  )
}
