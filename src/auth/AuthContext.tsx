import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { authenticate } from './accounts'
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

  const login = useCallback((username: string, password: string, remember: boolean): LoginResult => {
    const user = authenticate(username, password)
    if (!user) return { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' }
    if (user.status !== 'active') return { ok: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' }
    const next: StoredSession = { user, remember }
    setSession(next)
    persistSession(next)
    return { ok: true }
  }, [])

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
