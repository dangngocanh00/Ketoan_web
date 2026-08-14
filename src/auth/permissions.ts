/**
 * Centralized permission/scope logic. Components should call these helpers
 * instead of checking `currentUser.role === '...'` (or, worse, username)
 * directly — that keeps role rules in one place as the CS/Leader UI grows.
 */
import { teamById, userById } from '../data/sharedData'
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

// Every CS (incl. the Leader, who is also a CS) inside a Leader's team, used
// to bound what a Leader may view. Only ever pulls from the Leader's own
// teamId — never from a route parameter — so a Leader can't be pointed at
// another team's data.
export function teamScopeCsUsers(user: CurrentUser): { id: string; name: string }[] {
  if (!user.teamId) return []
  const team = teamById[user.teamId]
  if (!team) return []
  const memberIds = team.member_user_ids.includes(user.id)
    ? team.member_user_ids
    : [user.id, ...team.member_user_ids]
  return memberIds
    .map(id => userById[id])
    .filter((u): u is NonNullable<typeof u> => !!u)
    .map(u => ({ id: u.user_id, name: u.full_name }))
}

export function teamScopeCsNames(user: CurrentUser): string[] {
  return teamScopeCsUsers(user).map(u => u.name)
}

// Names of CS this user is allowed to VIEW records for. 'all' = no restriction
// (Admin/Accountant). Leader = self + team. CS = self only.
export function visibleCsNames(user: CurrentUser): string[] | 'all' {
  if (usesAdminUI(user.role)) return 'all'
  if (user.role === 'LEADER') return teamScopeCsNames(user)
  return [user.displayName]
}

export function canViewCsRecord(user: CurrentUser, recordCsName: string): boolean {
  const scope = visibleCsNames(user)
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
