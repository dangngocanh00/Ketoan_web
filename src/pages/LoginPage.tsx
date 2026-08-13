import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { demoAccountHints } from '../auth/accounts'
import { roleLabel } from '../auth/permissions'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.')
      return
    }
    setSubmitting(true)
    const result = login(username, password, remember)
    setSubmitting(false)
    if (!result.ok) setError(result.error)
  }

  function useDemo(u: string, p: string) {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F7FB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 9,
              background: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
              <path d="M2 10L5.5 4L9 8.5L11 6L13 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ color: '#182230', fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>AezCheck</div>
            <div style={{ color: '#667085', fontSize: 11.5, fontWeight: 500 }}>Kế toán</div>
          </div>
        </div>

        {/* Login card */}
        <form className="card" onSubmit={handleSubmit} style={{ padding: '28px 26px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#182230', marginBottom: 3 }}>Đăng nhập</div>
          <div style={{ fontSize: 12.5, color: '#667085', marginBottom: 20 }}>
            Đăng nhập để tiếp tục vào hệ thống đối soát.
          </div>

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 5 }}>
            Tên đăng nhập
          </label>
          <input
            className="text-input"
            style={{ width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            placeholder="ví dụ: admin"
            autoFocus
            autoComplete="username"
          />

          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#344054', marginBottom: 5 }}>
            Mật khẩu
          </label>
          <input
            className="text-input"
            style={{ width: '100%', marginBottom: 14, boxSizing: 'border-box' }}
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#2563EB', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12.5, color: '#344054' }}>Ghi nhớ đăng nhập</span>
          </label>

          {error && (
            <div
              style={{
                background: '#FEF3F2', color: '#B42318',
                border: '1px solid #FEE4E2', borderRadius: 8,
                padding: '9px 12px', fontSize: 12.5, marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={submitting} style={{ width: '100%', height: 38 }}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="card" style={{ marginTop: 16, padding: '16px 18px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Tài khoản demo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {demoAccountHints.map(acc => (
              <button
                key={acc.username}
                type="button"
                onClick={() => useDemo(acc.username, acc.password)}
                className="table-row-hover"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10, width: '100%', textAlign: 'left',
                  background: '#F9FAFB', border: '1px solid #E4E7EC', borderRadius: 8,
                  padding: '8px 10px', fontFamily: 'inherit',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#182230' }}>{acc.displayName}</div>
                  <div className="mono" style={{ fontSize: 11, color: '#98A2B3' }}>{acc.username} / {acc.password}</div>
                </div>
                <span
                  className="badge"
                  style={{ background: '#EFF8FF', color: '#175CD3', flexShrink: 0 }}
                >
                  {roleLabel[acc.role]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
