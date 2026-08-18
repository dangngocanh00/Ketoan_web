/**
 * Cài đặt Đối soát — "Sai lệch Amount cho phép" (task §7-17). LIVE setting,
 * read by every LIVE reconciliation pass (Module 3's CS upload, the new
 * Supplement Session's Bank/Facebook import) — never by Module 4's History,
 * which is frozen at closure and must stay immutable regardless of later
 * setting changes (§17: "Closed History không recompute theo tolerance mới").
 *
 * Also owns "Thời gian lưu dữ liệu đối soát" (Settings Data Retention task)
 * — a PROTOTYPE-ONLY setting + audit trail. No cron/job/backend reads this
 * value to actually delete anything; see `dataRetentionContract.ts` for the
 * pure eligibility rule a future backend cleanup worker would implement
 * against.
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

// "Thời gian lưu dữ liệu đối soát" (Settings Data Retention task) — a
// prototype-only SETTING + audit trail. Nothing in this file (or anywhere
// else in the app) reads this value to actually scan/delete data — see
// `dataRetentionContract.ts` for the pure eligibility rule a future backend
// cleanup worker would implement against. This store only owns "what the
// configured number of days currently is" and who's allowed to change it.
//
// §12: technical guardrail (must be a sane, storable positive integer of
// days), not a business recommendation — this task doesn't invent a
// business-mandated min/max beyond "positive integer".
export const MIN_DATA_RETENTION_DAYS = 1
export const MAX_DATA_RETENTION_DAYS = 3650 // ~10 years — technical ceiling only
export const DEFAULT_DATA_RETENTION_DAYS = 60

export interface DataRetentionAuditEvent {
  id: string
  type: 'DATA_RETENTION_UPDATED'
  actorUserId: string
  actorName: string
  actorRole: Role
  oldRetentionDays: number
  newRetentionDays: number
  timestamp: string
}

export type SetDataRetentionResult = { ok: true } | { ok: false; error: string }

interface ReconciliationSettingsValue {
  tolerancePercent: number
  auditEvents: ToleranceAuditEvent[]
  // §14/43: enforced here, not just by hiding the UI input — any caller
  // (even a hypothetical CS/Leader-reachable one) gets rejected by role.
  setTolerancePercent: (value: number, actor: { id: string; name: string; role: Role }) => SetToleranceResult

  dataRetentionDays: number
  dataRetentionAuditEvents: DataRetentionAuditEvent[]
  // ADMIN only — stricter than tolerance's ADMIN+ACCOUNTANT gate (task §4:
  // Accountant may only VIEW this setting). Enforced here at the domain
  // layer, never just by disabling the UI input.
  setDataRetentionDays: (value: number, actor: { id: string; name: string; role: Role }) => SetDataRetentionResult
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

  const [dataRetentionDays, setDataRetentionState] = useState(DEFAULT_DATA_RETENTION_DAYS)
  const [dataRetentionAuditEvents, setDataRetentionAuditEvents] = useState<DataRetentionAuditEvent[]>([])

  const setDataRetentionDays = useCallback(
    (value: number, actor: { id: string; name: string; role: Role }): SetDataRetentionResult => {
      // §4: ADMIN only — Accountant may view but never call this action,
      // regardless of what UI it's theoretically reachable from.
      if (actor.role !== 'ADMIN') {
        return { ok: false, error: 'Bạn không có quyền chỉnh Thời gian lưu dữ liệu đối soát.' }
      }
      // §5: only a positive integer — reject 0, negative, decimal, text, NaN.
      if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || !Number.isInteger(value)) {
        return { ok: false, error: 'Vui lòng nhập một số nguyên dương.' }
      }
      if (value < MIN_DATA_RETENTION_DAYS) {
        return { ok: false, error: `Thời gian lưu dữ liệu phải lớn hơn hoặc bằng ${MIN_DATA_RETENTION_DAYS} ngày.` }
      }
      if (value > MAX_DATA_RETENTION_DAYS) {
        return { ok: false, error: `Thời gian lưu dữ liệu không được lớn hơn ${MAX_DATA_RETENTION_DAYS} ngày (giới hạn kỹ thuật).` }
      }

      setDataRetentionState(prev => {
        setDataRetentionAuditEvents(events => [
          {
            id: `RETENTION-AUDIT-${events.length + 1}`,
            type: 'DATA_RETENTION_UPDATED',
            actorUserId: actor.id, actorName: actor.name, actorRole: actor.role,
            oldRetentionDays: prev, newRetentionDays: value, timestamp: nowStamp(),
          },
          ...events,
        ])
        return value
      })
      return { ok: true }
    },
    [],
  )

  const value = useMemo<ReconciliationSettingsValue>(
    () => ({
      tolerancePercent, auditEvents, setTolerancePercent,
      dataRetentionDays, dataRetentionAuditEvents, setDataRetentionDays,
    }),
    [tolerancePercent, auditEvents, setTolerancePercent, dataRetentionDays, dataRetentionAuditEvents, setDataRetentionDays],
  )

  return <ReconciliationSettingsContext.Provider value={value}>{children}</ReconciliationSettingsContext.Provider>
}

export function useReconciliationSettings(): ReconciliationSettingsValue {
  const ctx = useContext(ReconciliationSettingsContext)
  if (!ctx) throw new Error('useReconciliationSettings must be used within a ReconciliationSettingsProvider')
  return ctx
}
