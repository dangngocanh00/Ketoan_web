import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import MissingBills from './pages/MissingBills'
import Upload from './pages/Upload'
import AuditLog from './pages/AuditLog'
import Reports from './pages/Reports'
import LoginPage from './pages/LoginPage'
import CsDashboard from './pages/cs/CsDashboard'
import CsMissingBills from './pages/cs/CsMissingBills'
import CsUpload from './pages/cs/CsUpload'
import CsHistory from './pages/cs/CsHistory'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { canAccessPage, defaultPageFor, usesAdminUI } from './auth/permissions'
import type { Page } from './navigation'

export type { Page }

function AuthenticatedApp() {
  const { currentUser } = useAuth()
  const role = currentUser!.role
  const [page, setPage] = useState<Page>(() => defaultPageFor(role))

  // Route guard: never render a page the current role isn't allowed to see,
  // even if `page` state was set before a role switch (e.g. via logout/login).
  const activePage: Page = canAccessPage(role, page) ? page : defaultPageFor(role)

  function navigate(next: Page) {
    if (!canAccessPage(role, next)) return
    setPage(next)
  }

  const admin = usesAdminUI(role)

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F7FB', overflow: 'hidden' }}>
      <Sidebar activePage={activePage} onNavigate={navigate} />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {admin ? (
          <>
            {activePage === 'dashboard' && <Dashboard onNavigate={navigate} />}
            {activePage === 'sessions' && <Sessions onGoMissingBills={() => navigate('missing-bills')} />}
            {activePage === 'missing-bills' && <MissingBills />}
            {activePage === 'upload' && <Upload />}
            {activePage === 'audit-log' && <AuditLog />}
            {activePage === 'reports' && <Reports onGoSession={() => navigate('sessions')} />}
            {activePage === 'settings' && (
              <div style={{ padding: '32px 28px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#182230', marginBottom: 4 }}>Settings</div>
                <div style={{ fontSize: 13, color: '#667085' }}>System configuration — coming soon.</div>
              </div>
            )}
          </>
        ) : (
          <>
            {activePage === 'dashboard' && <CsDashboard />}
            {activePage === 'missing-bills' && <CsMissingBills />}
            {activePage === 'upload' && <CsUpload />}
            {activePage === 'audit-log' && <CsHistory />}
          </>
        )}
      </main>
    </div>
  )
}

function Gate() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <AuthenticatedApp /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
