import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Page } from '../navigation'
import { useAuth } from '../auth/AuthContext'
import { roleLabel, usesAdminUI } from '../auth/permissions'
import { teamById } from '../data/sharedData'

interface Props {
  activePage: Page
  onNavigate: (p: Page) => void
}

interface NavItem {
  id: Page
  label: string
  icon: ReactNode
  badge?: number
}

const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9" />
    </svg>
  ),
  sessions: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  reports: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 11V8M7 11V6M10 11V4M13 11v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  'missing-bills': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.134 2.5L1.268 12.5A1 1 0 002.134 14h11.732a1 1 0 00.866-1.5L8.866 2.5a1 1 0 00-1.732 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  upload: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 10V4m0 0L5.5 6.5M8 4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  'tkqc-shared': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="11" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="6.5" width="11" height="7.5" rx="1.5" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'audit-log': (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 4h8M4 7h8M4 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

function navForAdmin(): { business: NavItem[]; system: NavItem[] } {
  return {
    business: [
      { id: 'dashboard', label: 'Bảng điều hành', icon: ICONS.dashboard },
      { id: 'sessions', label: 'Phiên đối soát', icon: ICONS.sessions },
      { id: 'reports', label: 'Báo cáo', icon: ICONS.reports },
      { id: 'missing-bills', label: 'Bill thiếu', icon: ICONS['missing-bills'], badge: 8 },
      { id: 'upload', label: 'Tải lên dữ liệu', icon: ICONS.upload },
      { id: 'tkqc-shared', label: 'TKQC Chạy Chung', icon: ICONS['tkqc-shared'] },
    ],
    system: [
      { id: 'audit-log', label: 'Audit Log', icon: ICONS['audit-log'] },
      { id: 'settings', label: 'Cài đặt', icon: ICONS.settings },
    ],
  }
}

function navForCs(): { business: NavItem[]; system: NavItem[] } {
  return {
    business: [
      { id: 'dashboard', label: 'Bảng điều hành', icon: ICONS.dashboard },
      { id: 'missing-bills', label: 'Bill thiếu', icon: ICONS['missing-bills'] },
      { id: 'upload', label: 'Tải lên Bill Facebook', icon: ICONS.upload },
      { id: 'tkqc-shared', label: 'TKQC Chạy Chung', icon: ICONS['tkqc-shared'] },
    ],
    system: [
      { id: 'audit-log', label: 'Lịch sử', icon: ICONS['audit-log'] },
    ],
  }
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`sidebar-item${active ? ' active' : ''}`}
      style={{ width: '100%', background: 'none', border: 'none', fontFamily: 'inherit', textAlign: 'left' }}
      onClick={onClick}
    >
      {item.icon}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge !== undefined && (
        <span
          style={{
            background: '#F04438', color: '#fff',
            fontSize: 10, fontWeight: 700,
            padding: '1px 6px', borderRadius: 10,
            minWidth: 18, textAlign: 'center',
          }}
        >
          {item.badge}
        </span>
      )}
    </button>
  )
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  const { currentUser, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!currentUser) return null

  const { business, system } = usesAdminUI(currentUser.role) ? navForAdmin() : navForCs()
  const teamName = currentUser.teamId ? teamById[currentUser.teamId]?.team_name : null
  const initials = currentUser.displayName
    .split(' ')
    .map(p => p[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#101828',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 10px',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '18px 10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: '#2563EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10L5.5 4L9 8.5L11 6L13 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>AezCheck</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5, fontWeight: 500 }}>Kế toán</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 12px 4px' }}>
          Nghiệp vụ
        </div>
        {business.map(item => (
          <NavButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
        ))}

        {system.length > 0 && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 12px 4px', marginTop: 4 }}>
              Hệ thống
            </div>
            {system.map(item => (
              <NavButton key={item.id} item={item} active={activePage === item.id} onClick={() => onNavigate(item.id)} />
            ))}
          </>
        )}
      </nav>

      {/* User menu */}
      {menuOpen && (
        <div
          style={{
            position: 'absolute', left: 10, right: 10, bottom: 68,
            background: '#1D2939', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            overflow: 'hidden', zIndex: 10,
          }}
        >
          <button
            onClick={() => setMenuOpen(false)}
            style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.75)', fontSize: 12.5, padding: '10px 12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Thông tin tài khoản
          </button>
          <button
            onClick={() => { setMenuOpen(false); logout() }}
            style={{
              width: '100%', textAlign: 'left', background: 'none', border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              color: '#F97066', fontSize: 12.5, padding: '10px 12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}

      <button
        onClick={() => setMenuOpen(o => !o)}
        style={{
          padding: '12px 10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)',
          background: 'none', border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#344054',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentUser.displayName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {roleLabel[currentUser.role]}{teamName ? ` · ${teamName}` : ''}
            </div>
          </div>
        </div>
      </button>
    </aside>
  )
}
