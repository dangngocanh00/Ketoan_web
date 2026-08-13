import type { ReactNode } from 'react'
import type { CsDisplayStatus, TeamMemberStatus } from '../../domain/csWorkload'

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'purple' | 'gray'

const TONE_STYLES: Record<BadgeTone, { bg: string; color: string }> = {
  success: { bg: '#ECFDF3', color: '#027A48' },
  warning: { bg: '#FFFAEB', color: '#B54708' },
  error: { bg: '#FEF3F2', color: '#B42318' },
  info: { bg: '#EFF8FF', color: '#175CD3' },
  purple: { bg: '#F4F3FF', color: '#5925DC' },
  gray: { bg: '#F2F4F7', color: '#344054' },
}

export const STATUS_META: Record<CsDisplayStatus, { label: string; tone: BadgeTone }> = {
  sap_het_han: { label: 'Sắp hết hạn', tone: 'error' },
  cho_duyet: { label: 'Chờ duyệt', tone: 'purple' },
  dang_xu_ly: { label: 'Đang xử lý', tone: 'info' },
  chua_xu_ly: { label: 'Chưa xử lý', tone: 'gray' },
}

export const TEAM_STATUS_META: Record<TeamMemberStatus, { label: string; tone: BadgeTone }> = {
  ...STATUS_META,
  hoan_tat: { label: 'Đã hoàn tất', tone: 'success' },
}

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const s = TONE_STYLES[tone]
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      {children}
    </span>
  )
}

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function KpiCard({
  label, value, sub, onClick, active,
}: {
  label: string; value: string; sub?: string; onClick?: () => void; active?: boolean
}) {
  return (
    <div
      className="kpi-card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: active ? '#2563EB' : undefined,
        boxShadow: active ? '0 0 0 2px rgba(37,99,235,0.15)' : undefined,
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: '#182230', lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#98A2B3', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// Hours are a coarse per-session-status constant in the current shared data
// (e.g. always 35 while "active", always 5 while "closing_soon") — not a
// live minute-precision countdown, so we only ever render whole hours here.
export function formatHoursRemaining(hours: number): string {
  if (hours <= 0) return 'đã quá hạn'
  return `${hours}h`
}

export function ReadOnlyBanner({ name }: { name: string }) {
  return (
    <div
      style={{
        background: '#EFF8FF', border: '1px solid #B2DDFF', color: '#175CD3',
        borderRadius: 8, padding: '8px 14px', fontSize: 12.5, marginBottom: 16,
      }}
    >
      Đang xem dữ liệu của <b>{name}</b> · Chế độ chỉ xem
    </div>
  )
}
