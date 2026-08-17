/**
 * Cài đặt — Tài khoản (task Finalize, 3rd pass). READ-ONLY synced-user
 * directory — AezCheck owns identity, role, status, Team, Leader, and
 * membership; this app has NO write capability for any of it, not even
 * Team. This store is a pure MIRROR + a couple of derived lookups.
 *
 * AEZCHECK BOUNDARY: `seedAccounts()`/`seedTeams()` are the mock ADAPTER
 * standing in for a future "sync from AezCheck" call — seeded from the
 * existing shared identity data (`sharedUsers`/`sharedTeams`) rather than a
 * second parallel dataset. CS/Leader lists are always DERIVED
 * (`accounts.filter(a => a.role === 'CS')`, etc.), never a separately
 * maintained array. When a real AezCheck API exists, only these two seed
 * functions need to change (swap the seed for a fetch); every consumer
 * (`useAccountStore().accounts`/`.teams`) is unaffected.
 *
 * There is intentionally NO mutator anywhere in this file — no
 * `assignTeam`, no `createTeam`, no account-status/role writer. If a future
 * task needs to simulate an AezCheck-side change (for manual testing), that
 * belongs in `seedAccounts()`/`seedTeams()` (i.e. edit the seed), never in
 * a Settings-reachable action — Settings has no write path into this data
 * at all, by construction.
 *
 * SCOPE: also feeds login-time role/team/status overlay (see
 * AuthContext.tsx — simulating "read the latest AezCheck-synced mirror at
 * login") and CURRENT team-scope resolution across Leader-facing
 * operational modules (via `auth/permissions.ts`'s `teamScopeCsUsers`). It
 * does NOT, and must never, affect Module 4's frozen Closed History
 * snapshots (`sessionHistory.ts` never imports this file at all).
 */
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { sharedUsers, sharedTeams } from '../data/sharedData'
import { mapRole } from './../auth/accounts'
import type { Role } from '../auth/types'

export type AccountStatus = 'active' | 'disabled'

// Every field here is a MIRROR of AezCheck-owned data. Nothing in this
// module ever writes to any of them — there is no mutator function
// anywhere below.
export interface ManagedAccount {
  userId: string
  fullName: string
  username: string
  role: Role
  status: AccountStatus
  teamId: string | null
}

// Team MASTER record — also AezCheck-owned (Leader/membership included).
// Membership is derived, never stored as a second array here:
// `accounts.filter(a => a.teamId === teamId)`.
export interface ManagedTeam {
  teamId: string
  teamName: string
  leaderUserId: string | null
}

// The 4 real demo logins (auth/accounts.ts) keep their REAL login username
// here for an accurate table — every other seeded user has no real login
// today, so its "Username" column reuses the existing `telegram_id` (minus
// the leading "@") rather than inventing a new identity field. This mapping
// is itself part of the mock AezCheck adapter, not an accounting-owned fact.
const REAL_LOGIN_USERNAMES: Record<string, string> = {
  'USR-000': 'admin', 'USR-KT1': 'accountant', 'USR-001': 'leader01', 'USR-002': 'cs01',
}

export function seedAccounts(): ManagedAccount[] {
  return sharedUsers.map(u => ({
    userId: u.user_id,
    fullName: u.full_name,
    username: REAL_LOGIN_USERNAMES[u.user_id] ?? u.telegram_id.replace(/^@/, ''),
    role: mapRole(u.role),
    status: 'active',
    teamId: u.team_id || null,
  }))
}

export function seedTeams(): ManagedTeam[] {
  return sharedTeams.map(t => ({ teamId: t.team_id, teamName: t.team_name, leaderUserId: t.leader_user_id }))
}

interface AccountStoreValue {
  accounts: ManagedAccount[]
  teams: ManagedTeam[]
  getAccount: (userId: string) => ManagedAccount | undefined
}

const AccountStoreContext = createContext<AccountStoreValue | null>(null)

// Mounted at the App ROOT, ABOVE AuthProvider (see App.tsx) — so login can
// read the mirrored AezCheck role/status/team at sign-in time. Uses
// `useState` (not a plain const) only so a future real API integration can
// swap this for "fetch once, setState on response" without changing any
// consumer — today's seed never actually changes after mount, since there
// is no writer.
export function AccountStoreProvider({ children }: { children: ReactNode }) {
  const [accounts] = useState<ManagedAccount[]>(seedAccounts)
  const [teams] = useState<ManagedTeam[]>(seedTeams)

  const value = useMemo<AccountStoreValue>(
    () => ({
      accounts,
      teams,
      getAccount: (userId: string) => accounts.find(a => a.userId === userId),
    }),
    [accounts, teams],
  )

  return <AccountStoreContext.Provider value={value}>{children}</AccountStoreContext.Provider>
}

export function useAccountStore(): AccountStoreValue {
  const ctx = useContext(AccountStoreContext)
  if (!ctx) throw new Error('useAccountStore must be used within an AccountStoreProvider')
  return ctx
}
