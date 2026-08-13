import { useState } from 'react'
import { auditLog } from '../data/sharedData'
import type { AuditEntry } from '../data/mock'

const categoryConfig: Record<AuditEntry['category'], { label: string; bg: string; color: string }> = {
  upload: { label: 'Upload', bg: '#EFF8FF', color: '#175CD3' },
  reconciliation: { label: 'Đối soát', bg: '#ECFDF3', color: '#027A48' },
  assignment: { label: 'Phân công', bg: '#F4F3FF', color: '#5925DC' },
  cs_action: { label: 'CS hành động', bg: '#FFFAEB', color: '#B54708' },
  admin_action: { label: 'Admin', bg: '#FEF3F2', color: '#B42318' },
  session: { label: 'Phiên', bg: '#F2F4F7', color: '#344054' },
  notification: { label: 'Thông báo', bg: '#FFF6ED', color: '#C4320A' },
}

const allCategories = Object.keys(categoryConfig) as AuditEntry['category'][]

export default function AuditLog() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<AuditEntry['category'] | 'all'>('all')
  const [page, setPage] = useState(0)
  const PER_PAGE = 10

  const filtered = auditLog.filter(e => {
    if (catFilter !== 'all' && e.category !== catFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return e.action.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q) || e.target.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q)
    }
    return true
  })

  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div className="page-content">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#182230' }}>Audit Log</div>
        <div style={{ fontSize: 12.5, color: '#667085', marginTop: 2 }}>
          Tất cả hành động quan trọng trong hệ thống được ghi lại để truy vết.
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          className="text-input"
          placeholder="Tìm hành động, người thực hiện, đối tượng..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ width: 260 }}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setCatFilter('all'); setPage(0) }}
            style={{
              padding: '4px 11px', borderRadius: 6, border: '1px solid', fontFamily: 'inherit',
              borderColor: catFilter === 'all' ? '#2563EB' : '#E4E7EC',
              background: catFilter === 'all' ? '#EFF8FF' : '#fff',
              color: catFilter === 'all' ? '#2563EB' : '#667085',
              fontSize: 12, fontWeight: catFilter === 'all' ? 600 : 500, cursor: 'pointer',
            }}
          >
            All
          </button>
          {allCategories.map(cat => {
            const cfg = categoryConfig[cat]
            const active = catFilter === cat
            return (
              <button
                key={cat}
                onClick={() => { setCatFilter(cat); setPage(0) }}
                style={{
                  padding: '4px 11px', borderRadius: 6, border: '1px solid', fontFamily: 'inherit',
                  borderColor: active ? cfg.color : '#E4E7EC',
                  background: active ? cfg.bg : '#fff',
                  color: active ? cfg.color : '#667085',
                  fontSize: 12, fontWeight: active ? 600 : 500, cursor: 'pointer',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ minWidth: 130 }}>Thời gian</th>
                <th>Danh mục</th>
                <th>Hành động</th>
                <th>Người thực hiện</th>
                <th>Đối tượng</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#667085', padding: '28px 14px' }}>Không có bản ghi nào phù hợp với bộ lọc.</td></tr>
              )}
              {paged.map(e => {
                const cfg = categoryConfig[e.category]
                return (
                  <tr key={e.id}>
                    <td className="mono" style={{ fontSize: 11.5, color: '#667085', whiteSpace: 'nowrap' }}>{e.timestamp}</td>
                    <td>
                      <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{e.action}</td>
                    <td>
                      <span className="mono" style={{ fontSize: 11.5, color: e.actor === 'system' ? '#98A2B3' : '#344054', fontStyle: e.actor === 'system' ? 'italic' : 'normal' }}>
                        {e.actor}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 11.5, color: '#344054' }}>{e.target}</span>
                    </td>
                    <td style={{ fontSize: 12.5, color: '#667085', maxWidth: 280 }}>
                      <span title={e.detail} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.detail}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid #E4E7EC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#667085' }}>
            {filtered.length === 0 ? 'Không có bản ghi' : `${page * PER_PAGE + 1}–${Math.min((page + 1) * PER_PAGE, filtered.length)} trong tổng ${filtered.length} bản ghi`}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trước</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>Sau</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
