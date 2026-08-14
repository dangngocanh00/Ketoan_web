/**
 * Pure resolution algorithm for "TKQC Chạy Chung" — the ONE algorithm used
 * by both LIVE (tkqcDeclarationStore.tsx's Context, resolved "as of now")
 * and HISTORICAL (sessionHistory.ts's frozen snapshot, resolved "as of the
 * session's own date") call sites (task §34: never a second parallel
 * resolver). No React, no side effects.
 *
 * TEMPORAL MODEL (hardening task §1-8): each `TkqcDeclaration` is an
 * effective INTERVAL [effectiveFrom, effectiveTo) — `effectiveTo: null`
 * means "still open/current". Every resolution function takes an explicit
 * `atDate` and only considers declarations effective AT that date — there
 * is no implicit "always use current" fallback anywhere in this file.
 *
 * LIMITATION (task §5): Shared Card ELIGIBILITY (`card.eligibleCsIds` /
 * `card.tkqcIds`) is NOT itself versioned — the Sheet tổng hợp has no
 * historical-eligibility model in this dataset. Resolving a past date still
 * consults today's Sheet eligibility list; only the DECLARATIONS are
 * temporal. Documented, not fabricated further.
 */
import { sharedCardsSheet, findSharedCard, findSharedCardForTkqc } from './sheetTongHop'
import type { SharedCardSheetEntry } from './sheetTongHop'
import type { Role } from '../auth/types'

export interface TkqcDeclaration {
  cardLast4: string
  tkqcId: string
  declaredByCsId: string
  // Effective interval — half-open [effectiveFrom, effectiveTo). `null`
  // effectiveTo = still open-ended / current declaration.
  effectiveFrom: string
  effectiveTo: string | null
  declaredAt: string
  updatedAt: string
}

export function isEffectiveAt(d: TkqcDeclaration, atDate: string): boolean {
  return d.effectiveFrom <= atDate && (d.effectiveTo === null || atDate < d.effectiveTo)
}

export type TkqcMasterStatus = 'resolved' | 'unassigned' | 'conflict'

export interface TkqcResolution {
  tkqcId: string
  cardLast4: string
  status: TkqcMasterStatus
  // null unless status === 'resolved' (task §28: Conflict/Unassigned never
  // pick a CS to use downstream).
  resolvedOwnerCsId: string | null
  declaredCsIds: string[]
}

// §6/7/25-29: status/owner derived PURELY from Sheet eligibility + the
// declarations effective AT `atDate` — never "whatever is current" unless
// the caller explicitly passes today's date. Never persisted redundantly
// (task §67). A declaration only counts if its CS is actually eligible for
// this card per the (current, unversioned) Sheet — defense in depth, the
// action layer already enforces this before persisting (task §12/65).
export function resolveSharedCard(card: SharedCardSheetEntry, declarations: TkqcDeclaration[], atDate: string): TkqcResolution[] {
  return card.tkqcIds.map(tkqcId => {
    const valid = declarations.filter(
      d => d.cardLast4 === card.cardLast4 && d.tkqcId === tkqcId && card.eligibleCsIds.includes(d.declaredByCsId) && isEffectiveAt(d, atDate),
    )
    const declaredCsIds = [...new Set(valid.map(d => d.declaredByCsId))]
    if (declaredCsIds.length === 0) {
      return { tkqcId, cardLast4: card.cardLast4, status: 'unassigned', resolvedOwnerCsId: null, declaredCsIds }
    }
    if (declaredCsIds.length === 1) {
      return { tkqcId, cardLast4: card.cardLast4, status: 'resolved', resolvedOwnerCsId: declaredCsIds[0], declaredCsIds }
    }
    return { tkqcId, cardLast4: card.cardLast4, status: 'conflict', resolvedOwnerCsId: null, declaredCsIds }
  })
}

export function resolveAllSharedCards(declarations: TkqcDeclaration[], atDate: string): TkqcResolution[] {
  return sharedCardsSheet.flatMap(card => resolveSharedCard(card, declarations, atDate))
}

// Used by resolveTkqcOwnerAt (auth/permissions.ts) — resolves ONE tkqcId
// AT a specific date, regardless of which card it belongs to. Returns null
// for a non-shared tkqcId (caller falls back to the existing single-owner
// path) as well as for Unassigned/Conflict shared ones at that date (task
// §26/28) — never the current declaration as a fallback (task §6).
export function resolveTkqcId(tkqcId: string, declarations: TkqcDeclaration[], atDate: string): TkqcResolution | null {
  const card = findSharedCardForTkqc(tkqcId)
  if (!card) return null
  return resolveSharedCard(card, declarations, atDate).find(r => r.tkqcId === tkqcId) ?? null
}

export interface DeclarationAuthCheck {
  actorUserId: string
  actorRole: Role
  declaredByCsId: string
  cardLast4: string
}

export type AuthResult = { ok: true } | { ok: false; error: string }

// Pure, no-React authorization check — separated out from
// tkqcDeclarationStore.submitOwnDeclaration specifically so it's directly
// unit-testable (actor-spoof / Leader-spoof / Admin-Accountant-write
// rejection, hardening task §19-21) without needing a live Context/
// Provider. The Context's submit action calls this FIRST, before any
// state mutation — a rejection here means the store is touched.
//
//  1. actor must equal the declaration's own owner (task §9/10) — this
//     alone also covers "Leader can't declare for a member" (§11/20),
//     since a Leader viewing a teammate is still a DIFFERENT actor than
//     that teammate.
//  2. actor's role must be CS or LEADER — Accountant/Admin are always
//     monitoring-only (§12/21), even for a card they'd otherwise be
//     eligible on (they never are, but the role check comes first anyway).
//  3. the (now-confirmed-self) actor must be Sheet-eligible for this card.
export function authorizeOwnDeclaration(input: DeclarationAuthCheck): AuthResult {
  if (input.actorUserId !== input.declaredByCsId) {
    return { ok: false, error: 'Bạn chỉ có thể khai TKQC của chính mình.' }
  }
  if (input.actorRole === 'ADMIN' || input.actorRole === 'ACCOUNTANT') {
    return { ok: false, error: 'Kế toán/Admin chỉ giám sát TKQC Chạy Chung — không thể khai TKQC.' }
  }
  const card = findSharedCard(input.cardLast4)
  if (!card) return { ok: false, error: 'Không tìm thấy thẻ chạy chung.' }
  if (!card.eligibleCsIds.includes(input.declaredByCsId)) {
    return { ok: false, error: 'Bạn không thuộc danh sách CS của thẻ này theo Sheet tổng hợp.' }
  }
  return { ok: true }
}

export type TkqcInputRowStatus = 'valid' | 'not_in_card'

export interface TkqcInputRow {
  raw: string
  status: TkqcInputRowStatus
}

export interface TkqcInputValidationResult {
  rows: TkqcInputRow[]
  validTkqcIds: string[]
}

// §8-12: turns a CS's raw pasted textarea input into a validated preview —
// trims, drops blank lines, dedupes WITHIN the input (§9), never fuzzy-
// matches, never numeric-converts (ids stay plain strings so a leading
// zero is never lost), and checks each id belongs to THIS SPECIFIC card
// (§12) — not just "exists somewhere in the Sheet". Uses the CURRENT Sheet
// (unversioned, see file header) — validating a NEW submission is always
// against today's eligibility, never a historical one.
export function validateTkqcInput(cardLast4: string, rawInput: string): TkqcInputValidationResult {
  const card = findSharedCard(cardLast4)
  const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  const unique = [...new Set(lines)]
  const rows: TkqcInputRow[] = unique.map(raw => ({
    raw,
    status: card && card.tkqcIds.includes(raw) ? 'valid' : 'not_in_card',
  }))
  return { rows, validTkqcIds: rows.filter(r => r.status === 'valid').map(r => r.raw) }
}
