/**
 * LIVE declaration store for "TKQC Chạy Chung" (Context, mutable at
 * runtime) — CS/Leader declare, Team/master monitoring reads current
 * resolution. Deliberately separate from the HISTORICAL path
 * (auth/permissions.ts's resolveTkqcOwnerAt, sessionHistory.ts's frozen
 * closure snapshot) per task §7 — those call `seedDeclarations()` directly,
 * never this Context, so a live edit here can never change already-closed
 * History.
 *
 * HARDENING (temporal ownership + actor enforcement):
 *  - Declarations are effective INTERVALS (see sharedCardOwnership.ts) —
 *    editing never deletes history, it only CLOSES the CS's own currently-
 *    open interval(s) for tkqcIds no longer declared and OPENS new ones for
 *    newly-added tkqcIds (an SCD-2-style replace, not a delete+insert).
 *  - `submitOwnDeclaration` requires the REAL caller identity
 *    (`actorUserId`/`actorRole`) and rejects outright if it doesn't match
 *    the declaration's own owner, or if the actor's role isn't CS/LEADER —
 *    never silently "corrects" a mismatch, never mutates the store first.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { tkqcByUser, TODAY } from '../data/sharedData'
import { findSharedCard, getSharedCardsForCs } from './sheetTongHop'
import { resolveSharedCard, resolveAllSharedCards, isEffectiveAt, authorizeOwnDeclaration } from './sharedCardOwnership'
import type { TkqcDeclaration, TkqcResolution } from './sharedCardOwnership'
import type { Role } from '../auth/types'

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// Initial demo declarations — a plain, deterministic function (no rng, no
// Date.now()) called both by this Provider's useState initializer AND
// independently by auth/permissions.ts's resolveTkqcOwnerAt for the frozen
// historical path (two calls to the same pure seed, exactly like
// explanationStore.tsx's seedCases()).
//
// Cards 5252/7788/9911: effective from well before any session date this
// dataset ever resolves against (2026-01-01), open-ended — behaviorally
// identical to "always declared", same as before this hardening pass, so
// none of Module 2/3/4's existing demos shift.
//
// Card 3344 (hardening task §16-18's dedicated temporal demo — isolated
// from the other 3 cards on purpose):
//  - TKQC A: Mạnh 01/07–01/08 (closed), then Huyền 01/08–open (handover).
//  - TKQC B: Mạnh 01/07–open (never revoked), Huyền ALSO 01/08–06/08
//    (temporary overlap -> Conflict window), reverting to Mạnh-only from
//    06/08 onward once Huyền's interval closes.
export function seedDeclarations(): TkqcDeclaration[] {
  const t = '13/08/2026 08:00'
  const mkOpen = (cardLast4: string, tkqcId: string, declaredByCsId: string, effectiveFrom = '2026-01-01'): TkqcDeclaration => ({
    cardLast4, tkqcId, declaredByCsId, effectiveFrom, effectiveTo: null, declaredAt: t, updatedAt: t,
  })
  const mkClosed = (cardLast4: string, tkqcId: string, declaredByCsId: string, effectiveFrom: string, effectiveTo: string): TkqcDeclaration => ({
    cardLast4, tkqcId, declaredByCsId, effectiveFrom, effectiveTo, declaredAt: t, updatedAt: t,
  })
  return [
    mkOpen('5252', 'SHARED-5252-A', 'USR-002'),
    mkOpen('5252', 'SHARED-5252-B', 'USR-002'),
    mkOpen('5252', 'SHARED-5252-C', 'USR-002'),
    mkOpen('5252', 'SHARED-5252-D', 'USR-003'),
    mkOpen('5252', 'SHARED-5252-E', 'USR-003'),
    mkOpen('5252', 'SHARED-5252-F', 'USR-003'),
    mkOpen('7788', 'SHARED-7788-G', 'USR-004'),
    mkOpen('7788', 'SHARED-7788-H', 'USR-004'),
    mkOpen('7788', 'SHARED-7788-I', 'USR-005'),
    // SHARED-7788-J deliberately left undeclared -> Unassigned demo.
    mkOpen('9911', 'SHARED-9911-K', 'USR-003'),
    mkOpen('9911', 'SHARED-9911-K', 'USR-004'), // same TKQC, 2 CS -> Conflict demo.
    mkOpen('9911', 'SHARED-9911-L', 'USR-003'),
    // SHARED-9911-M deliberately left undeclared -> Unassigned demo.

    // Card 3344 — temporal demo.
    mkClosed('3344', 'SHARED-3344-A', 'USR-002', '2026-07-01', '2026-08-01'),
    mkOpen('3344', 'SHARED-3344-A', 'USR-003', '2026-08-01'),
    mkOpen('3344', 'SHARED-3344-B', 'USR-002', '2026-07-01'),
    mkClosed('3344', 'SHARED-3344-B', 'USR-003', '2026-08-01', '2026-08-06'),
  ]
}

export interface DeclarationAuditEvent {
  id: string
  type: 'TKQC_SHARED_DECLARATION_CREATED' | 'TKQC_SHARED_DECLARATION_UPDATED'
  actorUserId: string
  actorName: string
  cardLast4: string
  tkqcIds: string[]
  timestamp: string
}

export interface SubmitOwnDeclarationInput {
  // The REAL caller, from the authenticated session — never a value the UI
  // lets anyone edit (task §10/13).
  actorUserId: string
  actorRole: Role
  actorName: string
  // Whose declaration this is. In every legitimate call site this is the
  // SAME value as actorUserId (see TkqcSharedCard.tsx/DeclareModal.tsx) —
  // kept as its own field (rather than silently reusing actorUserId
  // everywhere) so the domain layer can explicitly detect and reject a
  // mismatch, instead of the mismatch being unrepresentable and therefore
  // untestable (task §19/20's "actor spoof" acceptance tests).
  declaredByCsId: string
  cardLast4: string
  validTkqcIds: string[]
}

export type SubmitDeclarationResult = { ok: true } | { ok: false; error: string }

interface TkqcDeclarationStoreValue {
  declarations: TkqcDeclaration[]
  auditEvents: DeclarationAuditEvent[]
  getDeclaredTkqcIdsForCs: (csId: string, cardLast4: string) => string[]
  getResolutionsForCard: (cardLast4: string, atDate: string) => TkqcResolution[]
  getAllResolutions: (atDate: string) => TkqcResolution[]
  // §36-40: own individual TKQC (non-shared, unchanged) + any Shared Card
  // TKQC RESOLVED to this CS AT `atDate` — never Unassigned/Conflict ones,
  // and never a different date's resolution (task §22: Module 2 must use
  // the OPERATIONAL SESSION's own date, not blanket "today").
  getResolvedTkqcIdsForCs: (csId: string, atDate: string) => string[]
  submitOwnDeclaration: (input: SubmitOwnDeclarationInput) => SubmitDeclarationResult
}

const TkqcDeclarationStoreContext = createContext<TkqcDeclarationStoreValue | null>(null)

// Mounted at the App ROOT (see App.tsx), same level as
// ExplanationStoreProvider — ABOVE the Admin/CS branch split, so all 4
// roles (CS, Leader, Accountant, Admin) read and mutate the exact same
// live state (task §0: single source of truth, never a per-role copy). A
// CS's declaration is visible to their Leader's Team view and to
// Accountant/Admin's master view immediately, without a reload.
export function TkqcDeclarationStoreProvider({ children }: { children: ReactNode }) {
  const [declarations, setDeclarations] = useState<TkqcDeclaration[]>(seedDeclarations)
  const [auditEvents, setAuditEvents] = useState<DeclarationAuditEvent[]>([])

  // §57 (from the earlier ownership-prep task): filtered through the
  // card's CURRENT tkqcIds — a declaration for a TKQC the Sheet no longer
  // lists under this card is stale and must not keep counting as "đã
  // khai". Also filtered to OPEN (effectiveTo === null), effective-today
  // intervals — "TKQC tôi đã khai" is inherently a CURRENT-state concept.
  const getDeclaredTkqcIdsForCs = useCallback(
    (csId: string, cardLast4: string) => {
      const card = findSharedCard(cardLast4)
      if (!card) return []
      return declarations
        .filter(d => d.cardLast4 === cardLast4 && d.declaredByCsId === csId && card.tkqcIds.includes(d.tkqcId) && isEffectiveAt(d, TODAY))
        .map(d => d.tkqcId)
    },
    [declarations],
  )

  const getResolutionsForCard = useCallback(
    (cardLast4: string, atDate: string): TkqcResolution[] => {
      const card = findSharedCard(cardLast4)
      return card ? resolveSharedCard(card, declarations, atDate) : []
    },
    [declarations],
  )

  const getAllResolutions = useCallback(
    (atDate: string): TkqcResolution[] => resolveAllSharedCards(declarations, atDate),
    [declarations],
  )

  const getResolvedTkqcIdsForCs = useCallback(
    (csId: string, atDate: string): string[] => {
      const own = tkqcByUser[csId] ? [tkqcByUser[csId]] : []
      const shared = getSharedCardsForCs(csId).flatMap(card =>
        resolveSharedCard(card, declarations, atDate)
          .filter(r => r.resolvedOwnerCsId === csId)
          .map(r => r.tkqcId),
      )
      return [...own, ...shared]
    },
    [declarations],
  )

  const submitOwnDeclaration = useCallback(
    (input: SubmitOwnDeclarationInput): SubmitDeclarationResult => {
      // §9/10/19/20/21: actor === owner, role must be CS/LEADER, and actor
      // must be Sheet-eligible for this card — all three checked by the
      // SAME pure function unit-tested in isolation (see
      // sharedCardOwnership.authorizeOwnDeclaration). Checked BEFORE
      // anything else, so a rejection never touches the store.
      const auth = authorizeOwnDeclaration(input)
      if (!auth.ok) return auth

      const card = findSharedCard(input.cardLast4)!
      // Re-validate every id against THIS card in the domain layer too —
      // never trust a pre-validated list handed in from the UI (§65).
      const validIds = input.validTkqcIds.filter(id => card.tkqcIds.includes(id))

      const now = nowStamp()
      const atDate = TODAY // §33/etc.: every live action is effective as of the app's canonical "now", never real wall-clock Date().
      const myOpenBefore = declarations.filter(
        d => d.cardLast4 === input.cardLast4 && d.declaredByCsId === input.declaredByCsId && d.effectiveTo === null,
      )
      const hadAny = myOpenBefore.length > 0
      const myOpenIdsBefore = new Set(myOpenBefore.map(d => d.tkqcId))
      const newIdSet = new Set(validIds)

      setDeclarations(prev => {
        // §3/4/17/30/31: REPLACE semantics for the CURRENT view only — a
        // tkqcId no longer submitted gets its OPEN interval CLOSED as of
        // today (never deleted, so a resolution for a date before today
        // still sees it); one already open AND still submitted is left
        // completely untouched (no spurious new interval, no touched
        // effectiveFrom); one newly submitted gets a brand-new open
        // interval starting today.
        const closed = prev.map(d => {
          const isMineOpenForThisCard = d.cardLast4 === input.cardLast4 && d.declaredByCsId === input.declaredByCsId && d.effectiveTo === null
          if (isMineOpenForThisCard && !newIdSet.has(d.tkqcId)) {
            return { ...d, effectiveTo: atDate, updatedAt: now }
          }
          return d
        })
        const additions: TkqcDeclaration[] = validIds
          .filter(tkqcId => !myOpenIdsBefore.has(tkqcId))
          .map(tkqcId => ({
            cardLast4: input.cardLast4, tkqcId, declaredByCsId: input.declaredByCsId,
            effectiveFrom: atDate, effectiveTo: null, declaredAt: now, updatedAt: now,
          }))
        return [...closed, ...additions]
      })

      setAuditEvents(prev => [
        {
          id: `TKQC-AUDIT-${prev.length + 1}`,
          type: hadAny ? 'TKQC_SHARED_DECLARATION_UPDATED' : 'TKQC_SHARED_DECLARATION_CREATED',
          actorUserId: input.actorUserId, actorName: input.actorName, cardLast4: input.cardLast4, tkqcIds: validIds, timestamp: now,
        },
        ...prev,
      ])

      return { ok: true }
    },
    [declarations],
  )

  const value = useMemo<TkqcDeclarationStoreValue>(
    () => ({
      declarations, auditEvents, getDeclaredTkqcIdsForCs, getResolutionsForCard,
      getAllResolutions, getResolvedTkqcIdsForCs, submitOwnDeclaration,
    }),
    [declarations, auditEvents, getDeclaredTkqcIdsForCs, getResolutionsForCard, getAllResolutions, getResolvedTkqcIdsForCs, submitOwnDeclaration],
  )

  return <TkqcDeclarationStoreContext.Provider value={value}>{children}</TkqcDeclarationStoreContext.Provider>
}

export function useTkqcDeclarationStore(): TkqcDeclarationStoreValue {
  const ctx = useContext(TkqcDeclarationStoreContext)
  if (!ctx) throw new Error('useTkqcDeclarationStore must be used within a TkqcDeclarationStoreProvider')
  return ctx
}
