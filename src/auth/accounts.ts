/**
 * Mock authentication for prototype/demo purposes only.
 *
 * Production is expected to authenticate against the AEZCheck system and
 * receive back a user id + role — NOT a hardcoded username/password table.
 * Everything outside this file works off `CurrentUser`, so this module is
 * the only thing that needs to be swapped out later.
 */
import { sharedUsers } from '../data/sharedData'
import type { SharedUser } from '../data/sharedData'
import type { CurrentUser, Role } from './types'

function mapRole(role: SharedUser['role']): Role {
  switch (role) {
    case 'Admin': return 'ADMIN'
    case 'Kế toán': return 'ACCOUNTANT'
    case 'Leader': return 'LEADER'
    case 'CS': return 'CS'
  }
}

function toCurrentUser(username: string, u: SharedUser): CurrentUser {
  const role = mapRole(u.role)
  return {
    id: u.user_id,
    username,
    displayName: u.full_name,
    role,
    teamId: u.team_id || null,
    // Leader is also a CS for their own data — carry their own id as csId too.
    csId: role === 'CS' || role === 'LEADER' ? u.user_id : null,
    status: 'active',
  }
}

interface DemoAccount {
  username: string
  password: string
  userId: string
}

// Reuses existing shared users instead of inventing separate demo identities,
// so CS/Leader records already present in sharedData line up with the login.
const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin', password: '123456', userId: 'USR-000' },      // Admin
  { username: 'accountant', password: '123456', userId: 'USR-KT1' }, // Kế toán
  { username: 'leader01', password: '123456', userId: 'USR-001' },   // Dũng · Leader · Team Alpha
  { username: 'cs01', password: '123456', userId: 'USR-002' },       // Mạnh · CS · Team Alpha
]

export function authenticate(username: string, password: string): CurrentUser | null {
  const uname = username.trim().toLowerCase()
  const account = DEMO_ACCOUNTS.find(a => a.username === uname)
  if (!account || account.password !== password) return null
  const user = sharedUsers.find(u => u.user_id === account.userId)
  if (!user) return null
  return toCurrentUser(account.username, user)
}

// Demo-account hints for the login screen — display only, not used for any
// permission/auth decision.
export const demoAccountHints = DEMO_ACCOUNTS.map(account => {
  const user = sharedUsers.find(u => u.user_id === account.userId)!
  return {
    username: account.username,
    password: account.password,
    role: mapRole(user.role),
    displayName: user.full_name,
    teamId: user.team_id || null,
  }
})
