import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { authenticate } from './accounts'
import { useAccountStore } from '../domain/accountStore'
import type { CurrentUser } from './types'

const STORAGE_KEY = 'aezcheck.auth.session'

interface StoredSession {
  user: CurrentUser
  remember: boolean
}

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

function persistSession(session: StoredSession | null) {
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (!session) return
    const payload = JSON.stringify(session)
    if (session.remember) localStorage.setItem(STORAGE_KEY, payload)
    else sessionStorage.setItem(STORAGE_KEY, payload)
  } catch {
    // localStorage/sessionStorage unavailable — session just won't survive a refresh.
  }
}

type LoginResult = { ok: true } | { ok: false; error: string }

interface AuthContextValue {
  currentUser: CurrentUser | null
  isAuthenticated: boolean
  login: (username: string, password: string, remember: boolean) => LoginResult
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(loadStoredSession)
  const { getAccount } = useAccountStore()

  const login = useCallback((username: string, password: string, remember: boolean): LoginResult => {
    // Authentication/password stays entirely AezCheck-owned (task Finalize
    // 2nd pass §1/3) — this is the ONLY credential check, no accountStore
    // fallback/demo-password path exists anymore.
    const authed = authenticate(username, password)
    if (!authed) return { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }

    // Live-overlay displayName/role/teamId/status from the account store at
    // sign-in — simulating "read the latest AezCheck-synced mirror at
    // login" (role/status are AezCheck-owned and read-only here; teamId is
    // the one field this app's own Admin can change, task §7/14).
    const live = getAccount(authed.id)
    const user: CurrentUser = live
      ? {
        ...authed,
        displayName: live.fullName,
        role: live.role,
        teamId: live.teamId,
        csId: live.role === 'CS' || live.role === 'LEADER' ? live.userId : null,
        status: live.status,
      }
      : authed

    if (user.status !== 'active') return { ok: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' }
    const next: StoredSession = { user, remember }
    setSession(next)
    persistSession(next)
    return { ok: true }
  }, [getAccount])

  const logout = useCallback(() => {
    setSession(null)
    persistSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser: session?.user ?? null,
        isAuthenticated: session != null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
