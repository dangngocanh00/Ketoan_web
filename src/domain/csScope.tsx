import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { userById } from '../data/sharedData'
import { canActOnCsRecord } from '../auth/permissions'
import type { CurrentUser } from '../auth/types'

export type CsScope =
  | { kind: 'self' }
  | { kind: 'team' }
  | { kind: 'member'; csId: string }

// What the Dashboard asked the (still-shell) Bill thiếu module to open —
// the navigation/drill-down contract for Module 2, per task §21-§24/§47.
export interface MissingBillFocus {
  csId: string
  csName: string
  // null = no specific session requested (e.g. "Xem tất cả Bill cần xử lý").
  sessionId: string | null
  readOnly: boolean
}

// Where a "member" scope was entered FROM, when that origin was specifically
// the Team table's "Xem" (drill-down) — not a direct dropdown switch. Only
// ever set by that one entry point; used purely to decide whether to show
// "← Quay lại Toàn Team" and which session to restore on Back.
export interface TeamDrillDownOrigin {
  sessionId: string
}

interface CsScopeContextValue {
  scope: CsScope
  setScope: (s: CsScope) => void
  missingBillFocus: MissingBillFocus | null
  requestMissingBillFocus: (f: MissingBillFocus) => void
  // §15/§24 contract: Bill thiếu's "+ Bổ sung Bill Facebook" CTA passes ONLY
  // a sessionId to the Upload module — never a Bank Bill id (CS doesn't
  // process individual bills) and never a csId (upload always belongs to
  // currentUser, regardless of whatever Leader scope is active — §24).
  uploadFocusSessionId: string | null
  requestUploadFocus: (sessionId: string) => void
  drillDownOrigin: TeamDrillDownOrigin | null
  beginTeamDrillDown: (sessionId: string) => void
  clearDrillDownOrigin: () => void
}

const CsScopeContext = createContext<CsScopeContextValue | null>(null)

// Mounted once above both Dashboard and the Bill thiếu shell (see App.tsx),
// so a Leader's chosen scope survives switching pages — never reset just
// because the sidebar page changed (task §23).
export function CsScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<CsScope>({ kind: 'self' })
  const [missingBillFocus, setMissingBillFocus] = useState<MissingBillFocus | null>(null)
  const [uploadFocusSessionId, setUploadFocusSessionId] = useState<string | null>(null)
  const [drillDownOrigin, setDrillDownOrigin] = useState<TeamDrillDownOrigin | null>(null)

  const value = useMemo<CsScopeContextValue>(
    () => ({
      scope,
      setScope,
      missingBillFocus,
      requestMissingBillFocus: setMissingBillFocus,
      uploadFocusSessionId,
      requestUploadFocus: setUploadFocusSessionId,
      drillDownOrigin,
      beginTeamDrillDown: (sessionId: string) => setDrillDownOrigin({ sessionId }),
      clearDrillDownOrigin: () => setDrillDownOrigin(null),
    }),
    [scope, missingBillFocus, uploadFocusSessionId, drillDownOrigin],
  )

  return <CsScopeContext.Provider value={value}>{children}</CsScopeContext.Provider>
}

export function useCsScope(): CsScopeContextValue {
  const ctx = useContext(CsScopeContext)
  if (!ctx) throw new Error('useCsScope must be used within a CsScopeProvider')
  return ctx
}

// Resolves scope -> "whose data to render" + read-only enforcement. Read-only
// reuses the exact same ownership rule as the rest of the app ("của ai người
// đó xử lý", permissions.canActOnCsRecord) instead of a second boolean that
// could drift out of sync: a Leader viewing anyone but themself is read-only.
export function resolveScopeTarget(currentUser: CurrentUser, scope: CsScope) {
  const targetUser = scope.kind === 'member' ? userById[scope.csId] : null
  const displayName = targetUser ? targetUser.full_name : currentUser.displayName
  const csId = targetUser ? targetUser.user_id : currentUser.id
  const readOnly = !canActOnCsRecord(currentUser, displayName)
  return { csId, displayName, readOnly }
}
