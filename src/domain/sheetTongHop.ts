/**
 * "Sheet tổng hợp kế toán" — the external source-of-truth spreadsheet that
 * says which Card/TKQC/CS combinations exist. Reused as-is for the new
 * "TKQC Chạy Chung" module; NOT a second mock dataset.
 *
 * For the ~14 CS whose card is used by only one person, ownership already
 * derives directly from the existing `tkqcByUser`/`USER_CARDS` maps in
 * sharedData.ts — untouched by this file (task §4/40: non-shared cards
 * need no declaration at all).
 *
 * This file only models cards the Sheet tổng marks as SHARED (task §3: a
 * Card/Last4 the Sheet notes for >1 CS). Three demo shared cards, chosen
 * from CS already in the shared dataset (Mạnh/Huyền/Nam/Trang — Team
 * Alpha's other members, all already-established personas):
 *  - 5252 (Mạnh + Huyền) — fully resolved once both declare (task §37).
 *  - 7788 (Nam + Trang) — one TKQC left undeclared → Unassigned.
 *  - 9911 (Huyền + Nam) — one TKQC declared by both → Conflict.
 * TKQC ids are readable strings (`SHARED-<card>-<letter>`) rather than the
 * opaque numeric style used elsewhere, specifically so this demo is easy to
 * eyeball during UI review — still just plain unique string ids either way.
 */

export interface SharedCardSheetEntry {
  cardLast4: string
  eligibleCsIds: string[]
  eligibleCsNames: string[]
  tkqcIds: string[]
}

export const sharedCardsSheet: SharedCardSheetEntry[] = [
  {
    cardLast4: '5252',
    eligibleCsIds: ['USR-002', 'USR-003'],
    eligibleCsNames: ['Mạnh', 'Huyền'],
    tkqcIds: ['SHARED-5252-A', 'SHARED-5252-B', 'SHARED-5252-C', 'SHARED-5252-D', 'SHARED-5252-E', 'SHARED-5252-F'],
  },
  {
    cardLast4: '7788',
    eligibleCsIds: ['USR-004', 'USR-005'],
    eligibleCsNames: ['Nam', 'Trang'],
    tkqcIds: ['SHARED-7788-G', 'SHARED-7788-H', 'SHARED-7788-I', 'SHARED-7788-J'],
  },
  {
    cardLast4: '9911',
    eligibleCsIds: ['USR-003', 'USR-004'],
    eligibleCsNames: ['Huyền', 'Nam'],
    tkqcIds: ['SHARED-9911-K', 'SHARED-9911-L', 'SHARED-9911-M'],
  },
  // Dedicated temporal-ownership demo (hardening task §16-18) — isolated
  // from 5252/7788/9911 on purpose, so exercising ownership-change-over-time
  // scenarios here can never perturb those cards' already-verified current-
  // state demos (fully resolved / unassigned / conflict).
  {
    cardLast4: '3344',
    eligibleCsIds: ['USR-002', 'USR-003'],
    eligibleCsNames: ['Mạnh', 'Huyền'],
    tkqcIds: ['SHARED-3344-A', 'SHARED-3344-B'],
  },
]

export function findSharedCardForTkqc(tkqcId: string): SharedCardSheetEntry | undefined {
  return sharedCardsSheet.find(c => c.tkqcIds.includes(tkqcId))
}

export function findSharedCard(cardLast4: string): SharedCardSheetEntry | undefined {
  return sharedCardsSheet.find(c => c.cardLast4 === cardLast4)
}

// §6/54: which Shared Cards a given CS is even allowed to see/declare on —
// only cards the Sheet tổng itself notes them for.
export function getSharedCardsForCs(csId: string): SharedCardSheetEntry[] {
  return sharedCardsSheet.filter(c => c.eligibleCsIds.includes(csId))
}
