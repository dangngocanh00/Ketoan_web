export type Role = 'ADMIN' | 'ACCOUNTANT' | 'LEADER' | 'CS'

export type UserStatus = 'active' | 'disabled'

// Minimal current-user shape. Production is expected to source this (and the
// login call itself) from the AEZCheck system — keep this shape stable so
// swapping the auth backend later doesn't ripple into permission/UI code.
export interface CurrentUser {
  id: string
  username: string
  displayName: string
  role: Role
  teamId: string | null
  csId: string | null
  status: UserStatus
}
