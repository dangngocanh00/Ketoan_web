/**
 * Cài đặt Đối soát — "Sai lệch Amount cho phép" (task §7-17). LIVE setting,
 * read by every LIVE reconciliation pass (Module 3's CS upload, the new
 * Supplement Session's Bank/Facebook import) — never by Module 4's History,
 * which is frozen at closure and must stay immutable regardless of later
 * setting changes (§17: "Closed History không recompute theo tolerance mới").
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role } from '../auth/types'

// §12: technical guardrail, not a business assumption — 0-100% covers every
// sane configuration a percentage-of-bank-amount tolerance could mean
// (100% already allows a Facebook Bill anywhere from $0 to 2x the Bank
// Bill, an extreme upper bound). Not claiming 100% is a recommended value.
export const MIN_TOLERANCE_PERCENT = 0
export const MAX_TOLERANCE_PERCENT = 100
// §11: decimal percentages allowed (0.5, 1.5, ...) — never hard-coded to
// integers only. Two-decimal precision is enough for a percentage input
// and avoids float-noise values like 2.0000000000000004 leaking into the
// stored setting itself.
export function roundTolerance(value: number): number {
  return Math.round(value * 100) / 100
}

export interface ToleranceAuditEvent {
  id: string
  type: 'RECONCILIATION_TOLERANCE_UPDATED'
  actorUserId: string
  actorName: string
  actorRole: Role
  oldValue: number
  newValue: number
  timestamp: string
}

export type SetToleranceResult = { ok: true } | { ok: false; error: string }

interface ReconciliationSettingsValue {
  tolerancePercent: number
  auditEvents: ToleranceAuditEvent[]
  // §14/43: enforced here, not just by hiding the UI input — any caller
  // (even a hypothetical CS/Leader-reachable one) gets rejected by role.
  setTolerancePercent: (value: number, actor: { id: string; name: string; role: Role }) => SetToleranceResult
}

const ReconciliationSettingsContext = createContext<ReconciliationSettingsValue | null>(null)

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// §10: default 0 — behaviorally IDENTICAL to the exact-amount matching this
// app already had before this task, so no pre-existing reconciliation demo
// scenario changes unless an Admin/Accountant explicitly raises it.
const DEFAULT_TOLERANCE_PERCENT = 0

// Mounted at the App ROOT (see App.tsx) — read by BOTH the CS/Leader branch
// (facebookUploadStore's live reconciliation) and the Admin/Accountant
// branch (Supplement Session import), task §16: tolerance applies to any
// still-open operational reconciliation regardless of which role's flow
// triggers it.
export function ReconciliationSettingsProvider({ children }: { children: ReactNode }) {
  const [tolerancePercent, setToleranceState] = useState(DEFAULT_TOLERANCE_PERCENT)
  const [auditEvents, setAuditEvents] = useState<ToleranceAuditEvent[]>([])

  const setTolerancePercent = useCallback(
    (value: number, actor: { id: string; name: string; role: Role }): SetToleranceResult => {
      // §14/43: domain-layer role gate — Leader/CS can never reach this
      // regardless of what UI they'd theoretically call it from.
      if (actor.role !== 'ADMIN' && actor.role !== 'ACCOUNTANT') {
        return { ok: false, error: 'Bạn không có quyền chỉnh Cấu hình đối soát.' }
      }
      // §12: reject negative, NaN, empty/non-numeric, and unreasonable values.
      if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        return { ok: false, error: 'Giá trị không hợp lệ.' }
      }
      if (value < MIN_TOLERANCE_PERCENT) {
        return { ok: false, error: `Sai lệch Amount không được nhỏ hơn ${MIN_TOLERANCE_PERCENT}%.` }
      }
      if (value > MAX_TOLERANCE_PERCENT) {
        return { ok: false, error: `Sai lệch Amount không được lớn hơn ${MAX_TOLERANCE_PERCENT}% (giới hạn kỹ thuật).` }
      }

      const rounded = roundTolerance(value)
      setToleranceState(prev => {
        setAuditEvents(events => [
          {
            id: `TOLERANCE-AUDIT-${events.length + 1}`,
            type: 'RECONCILIATION_TOLERANCE_UPDATED',
            actorUserId: actor.id, actorName: actor.name, actorRole: actor.role,
            oldValue: prev, newValue: rounded, timestamp: nowStamp(),
          },
          ...events,
        ])
        return rounded
      })
      return { ok: true }
    },
    [],
  )

  const value = useMemo<ReconciliationSettingsValue>(
    () => ({ tolerancePercent, auditEvents, setTolerancePercent }),
    [tolerancePercent, auditEvents, setTolerancePercent],
  )

  return <ReconciliationSettingsContext.Provider value={value}>{children}</ReconciliationSettingsContext.Provider>
}

export function useReconciliationSettings(): ReconciliationSettingsValue {
  const ctx = useContext(ReconciliationSettingsContext)
  if (!ctx) throw new Error('useReconciliationSettings must be used within a ReconciliationSettingsProvider')
  return ctx
}
