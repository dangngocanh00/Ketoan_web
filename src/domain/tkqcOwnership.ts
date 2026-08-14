/**
 * Ownership resolution contract for TKQC/Card-level historical tracking —
 * prep work for the future "TKQC Chạy Chung" module (1 card → nhiều TKQC →
 * nhiều CS). NOT implemented here; this only prepares the seam that module
 * will plug into.
 *
 * Two call sites, deliberately never sharing one lookup:
 *  - LIVE ownership (Dashboard / Bill thiếu / TKQC suggestion) reads the
 *    CURRENT assignment — today that's `tkqcByUser` in sharedData.ts (one
 *    TKQC per CS, no reassignment history). Untouched by this file.
 *  - HISTORICAL ownership (Module 4's closure snapshot) calls
 *    `resolveTkqcOwnerAt` ONCE, at snapshot-build time, via
 *    `captureTkqcOwnershipAtClosure` below, and freezes the result forever
 *    (see sessionHistory.ts) — it never re-resolves on render, so a later
 *    reassignment can never change what a Closed session's History shows.
 *
 * `resolveTkqcOwnerAt` already existed as a documented stub in
 * auth/permissions.ts (no real TKQC-assignment-history table exists yet,
 * so it always returns null). This file adds the snapshot-build-time
 * wrapper that captures a whole closure snapshot's TKQC ownership in one
 * shot, falling back to the case's own session-level owner — the ONLY
 * ownership source that exists today — whenever no finer-grained
 * resolution is available. Never a fabricated value (no hard-coded
 * "A → Mạnh, B → Huyền"). Once a real "TKQC Chạy Chung" assignment history
 * exists, only `resolveTkqcOwnerAt` needs to start returning real data —
 * this wrapper and every caller (sessionHistory.ts) stay unchanged.
 */
import { userById } from '../data/sharedData'
import { resolveTkqcOwnerAt } from '../auth/permissions'

export interface TkqcOwnershipEntry {
  tkqcId: string
  cardLast4: string
  ownerCsId: string
  ownerCsName: string
}

export interface TkqcRowRef {
  tkqcId: string
  last4: string
}

// Captures resolved TKQC ownership for one closure snapshot, at the exact
// moment the snapshot is built (sessionHistory.ts's buildClosureSnapshot
// calls this once per session, using that same build pass's own rows) —
// never queried again afterward, never recomputed from live data.
export function captureTkqcOwnershipAtClosure(
  fallbackCsId: string,
  fallbackCsName: string,
  sessionDate: string,
  rowRefs: TkqcRowRef[],
): TkqcOwnershipEntry[] {
  const firstSeenLast4 = new Map<string, string>()
  for (const r of rowRefs) if (!firstSeenLast4.has(r.tkqcId)) firstSeenLast4.set(r.tkqcId, r.last4)

  return [...firstSeenLast4.entries()].map(([tkqcId, cardLast4]) => {
    const resolvedOwnerId = resolveTkqcOwnerAt(tkqcId, sessionDate) ?? fallbackCsId
    const ownerCsName = resolvedOwnerId === fallbackCsId ? fallbackCsName : (userById[resolvedOwnerId]?.full_name ?? fallbackCsName)
    return { tkqcId, cardLast4, ownerCsId: resolvedOwnerId, ownerCsName }
  })
}
