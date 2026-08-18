/**
 * Centralized permission/scope logic. Components should call these helpers
 * instead of checking `currentUser.role === '...'` (or, worse, username)
 * directly — that keeps role rules in one place as the CS/Leader UI grows.
 */
import { resolveTkqcId } from '../domain/sharedCardOwnership'
import { seedDeclarations } from '../domain/tkqcDeclarationStore'
import type { Page } from '../navigation'
import type { CurrentUser, Role } from './types'

export const roleLabel: Record<Role, string> = {
  ADMIN: 'Quản trị viên',
  ACCOUNTANT: 'Kế toán',
  LEADER: 'Leader',
  CS: 'CS',
}

const ADMIN_UI_ROLES: Role[] = ['ADMIN', 'ACCOUNTANT']
const CS_UI_ROLES: Role[] = ['LEADER', 'CS']

export function usesAdminUI(role: Role): boolean {
  return ADMIN_UI_ROLES.includes(role)
}

export function usesCsUI(role: Role): boolean {
  return CS_UI_ROLES.includes(role)
}

// ── Route access ─────────────────────────────────────────────────────────────

const ADMIN_PAGES: Page[] = ['dashboard', 'sessions', 'reports', 'missing-bills', 'upload', 'tkqc-shared', 'audit-log', 'settings']
const CS_PAGES: Page[] = ['dashboard', 'missing-bills', 'upload', 'tkqc-shared', 'audit-log']

export function accessiblePages(role: Role): Page[] {
  return usesAdminUI(role) ? ADMIN_PAGES : CS_PAGES
}

export function canAccessPage(role: Role, page: Page): boolean {
  return accessiblePages(role).includes(page)
}

export function defaultPageFor(_role: Role): Page {
  return 'dashboard'
}

// ── Data scope (CS / Leader) ─────────────────────────────────────────────────

// Minimal structural shape these helpers need from an Account record — kept
// separate from `domain/accountStore.tsx`'s full `ManagedAccount` (auth/ has
// no business needing the rest of it) so `useAccountStore().accounts` just
// structurally satisfies this without any conversion at call sites.
export interface LiveAccountRef {
  userId: string
  teamId: string | null
  fullName: string
}

// Every CS (incl. the Leader, who is also a CS) CURRENTLY on the Leader's
// team, used to bound what a Leader may view. Cài đặt Finalize task §11:
// team membership is now resolved ENTIRELY from the live Account store's own
// `teamId` column (the same "Team" column an Admin edits in Settings → Tài
// khoản) — never from the static `sharedTeams` seed, and never from
// `user.teamId` on the cached `CurrentUser` session object either, since
// that field is only refreshed at login (see AuthContext.tsx) and would go
// stale the moment an Admin moves a CS to a different team while that CS/
// Leader is already logged in. Resolving the Leader's OWN current team id
// fresh from `liveAccounts` (by their own userId) is what makes a Team
// reassignment take effect immediately, with no re-login required.
export function teamScopeCsUsers(user: CurrentUser, liveAccounts: LiveAccountRef[]): { id: string; name: string }[] {
  const ownAccount = liveAccounts.find(a => a.userId === user.id)
  const currentTeamId = ownAccount?.teamId ?? user.teamId
  if (!currentTeamId) return []
  const map = new Map<string, string>()
  for (const a of liveAccounts) if (a.teamId === currentTeamId) map.set(a.userId, a.fullName)
  map.set(user.id, ownAccount?.fullName ?? user.displayName) // Leader always sees themself regardless
  return [...map.entries()].map(([id, name]) => ({ id, name }))
}

export function teamScopeCsNames(user: CurrentUser, liveAccounts: LiveAccountRef[]): string[] {
  return teamScopeCsUsers(user, liveAccounts).map(u => u.name)
}

// Names of CS this user is allowed to VIEW records for. 'all' = no restriction
// (Admin/Accountant). Leader = self + team. CS = self only.
export function visibleCsNames(user: CurrentUser, liveAccounts: LiveAccountRef[]): string[] | 'all' {
  if (usesAdminUI(user.role)) return 'all'
  if (user.role === 'LEADER') return teamScopeCsNames(user, liveAccounts)
  return [user.displayName]
}

export function canViewCsRecord(user: CurrentUser, recordCsName: string, liveAccounts: LiveAccountRef[]): boolean {
  const scope = visibleCsNames(user, liveAccounts)
  return scope === 'all' || scope.includes(recordCsName)
}

// Mutation rights — "của ai người đó upload và xử lý". A Leader viewing a
// teammate's record is always read-only; only the record's own owner (by
// name) or an Admin/Accountant may act on it.
export function canActOnCsRecord(user: CurrentUser, recordCsName: string): boolean {
  if (usesAdminUI(user.role)) return true
  return recordCsName === user.displayName
}

export function canUploadBank(user: CurrentUser): boolean {
  return usesAdminUI(user.role)
}

export function canApproveExplanation(user: CurrentUser): boolean {
  return usesAdminUI(user.role)
}

export function canViewAdminReports(user: CurrentUser): boolean {
  return usesAdminUI(user.role)
}

// ── Cài đặt (Settings) — task §1/14/43 ───────────────────────────────────────
// LEADER/CS get NEITHER the Settings page (already excluded via CS_PAGES
// above) NOR any of the domain actions below — checked here again so a
// component can never reach a Settings action just because it happens to be
// reachable from an Admin/Accountant-only screen.

// Whether this role sees the (read-only) Tài khoản directory tab at all —
// there is no "manage" left to gate (task Finalize, 3rd pass: identity/
// role/status/Team are all AezCheck-owned, read-only everywhere in this app).
export function canViewAccountsDirectory(role: Role): boolean {
  return role === 'ADMIN'
}

export function canEditToleranceSettings(role: Role): boolean {
  return role === 'ADMIN' || role === 'ACCOUNTANT'
}

// "Thời gian lưu dữ liệu đối soát" (Settings Data Retention task §4): ADMIN
// may view/edit/save; ACCOUNTANT may only view. Enforced again at the
// domain layer (see reconciliationSettings.tsx's `setDataRetentionDays`) —
// this UI-level helper is never the only gate.
export function canEditDataRetention(role: Role): boolean {
  return role === 'ADMIN'
}

// Mở lại phiên / Bổ sung Bill Bank / Đóng lại phiên (Reopen task §3): Admin +
// Kế toán only, never Leader/CS. Enforced again at the domain layer itself
// (see reopenStore.tsx's `authorizeReopenActor`) — this UI-level helper is
// never the only gate.
export function canManageReopen(role: Role): boolean {
  return role === 'ADMIN' || role === 'ACCOUNTANT'
}

// ── Ownership resolution (session-date based, not "current owner") ──────────
//
// Rule: responsibility for a bank/FB record belongs to whoever owned the
// TKQC on the record's OWN session date — not whoever owns the TKQC today.
// e.g. TKQC A: Mạnh 01–05/08, Huyền from 06/08 onward → phiên 03/08 stays
// Mạnh's even after the reassignment.
//
// The current dataset (see sharedData.ts) already generates every business
// record — bank txn, missing-bill case, FB bill — with the CS who was
// responsible AT THAT record's own date baked into its `cs`/`team` field.
// So today, resolving ownership just means: read `record.cs` directly, never
// re-derive it from a live "current owner of this TKQC" map.
//
// TKQC Chạy Chung (task): for a Shared Card's TKQC, ownership now resolves
// from real CS declarations instead of always returning null. For a
// non-shared TKQC, `resolveTkqcId` returns null (no matching Shared Card)
// and callers fall back to the existing single-owner path unchanged.
//
// Uses `seedDeclarations()` — the STATIC seed, not the live
// tkqcDeclarationStore Context — so this stays a plain, non-hook function
// callable from sessionHistory.ts's frozen closure-snapshot build (task
// §7/44/45: History must never read live ownership).
//
// HARDENING: `sessionDate` is now genuinely used — declarations are
// effective INTERVALS (see sharedCardOwnership.ts's `isEffectiveAt`), so
// resolving TKQC A at "2026-07-15" and at "2026-08-14" can legitimately
// return two different CS if ownership changed hands in between. There is
// no "use current declaration" fallback anywhere in this path.
//
// ASSUMPTIONS (task §35, unchanged): TKQC ids are globally unique across
// the shared dataset, so no extra cardLast4/context key is needed to
// disambiguate. Also (hardening task §5): Shared Card ELIGIBILITY itself
// (which CS/TKQC belong to a card) is NOT versioned — only declarations
// are — so resolving a past date still consults today's Sheet eligibility
// list. Documented limitation, not fabricated further.
export function resolveTkqcOwnerAt(tkqcId: string, sessionDate: string): string | null {
  return resolveTkqcId(tkqcId, seedDeclarations(), sessionDate)?.resolvedOwnerCsId ?? null
}
