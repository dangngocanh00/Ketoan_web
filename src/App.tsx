import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import MissingBills from './pages/MissingBills'
import Upload from './pages/Upload'
import TkqcSharedCard from './pages/TkqcSharedCard'
import AuditLog from './pages/AuditLog'
import Reports from './pages/Reports'
import LoginPage from './pages/LoginPage'
import CsDashboard from './pages/cs/CsDashboard'
import CsMissingBills from './pages/cs/CsMissingBills'
import CsUpload from './pages/cs/CsUpload'
import CsTkqcShared from './pages/cs/CsTkqcShared'
import CsHistory from './pages/cs/CsHistory'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { canAccessPage, defaultPageFor, usesAdminUI } from './auth/permissions'
import { CsScopeProvider } from './domain/csScope'
import { ExplanationStoreProvider } from './domain/explanationStore'
import { FacebookUploadStoreProvider } from './domain/facebookUploadStore'
import { TkqcDeclarationStoreProvider } from './domain/tkqcDeclarationStore'
import { AccountStoreProvider } from './domain/accountStore'
import { ReconciliationSettingsProvider } from './domain/reconciliationSettings'
import { ReopenStoreProvider } from './domain/reopenStore'
import Settings from './pages/Settings'
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

  // CsScopeProvider now wraps Sidebar too (not just the CS/Leader <main>
  // content) — the sidebar's "Bill thiếu" workload badge needs to read a
  // Leader's current scope (self/member/team) via useCsScope() to stay in
  // sync with whatever Dashboard/Bill thiếu has selected. Harmless for
  // Admin/Accountant/CS, who never call useCsScope().
  return (
    <CsScopeProvider>
      <div style={{ display: 'flex', height: '100vh', background: '#F5F7FB', overflow: 'hidden' }}>
        <Sidebar activePage={activePage} onNavigate={navigate} />
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {admin ? (
            <>
              {activePage === 'dashboard' && <Dashboard onNavigate={navigate} />}
              {activePage === 'sessions' && <Sessions onGoMissingBills={() => navigate('missing-bills')} />}
              {activePage === 'missing-bills' && <MissingBills />}
              {activePage === 'upload' && <Upload />}
              {activePage === 'tkqc-shared' && <TkqcSharedCard />}
              {activePage === 'audit-log' && <AuditLog />}
              {activePage === 'reports' && <Reports onGoSession={() => navigate('sessions')} />}
              {activePage === 'settings' && <Settings />}
            </>
          ) : (
            <>
              {activePage === 'dashboard' && <CsDashboard onNavigateMissingBills={() => navigate('missing-bills')} />}
              {activePage === 'missing-bills' && <CsMissingBills onNavigateUpload={() => navigate('upload')} />}
              {activePage === 'upload' && <CsUpload onNavigateMissingBills={() => navigate('missing-bills')} />}
              {activePage === 'tkqc-shared' && <CsTkqcShared />}
              {activePage === 'audit-log' && <CsHistory />}
            </>
          )}
        </main>
      </div>
    </CsScopeProvider>
  )
}

function Gate() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <AuthenticatedApp /> : <LoginPage />
}

export default function App() {
  return (
    // AccountStoreProvider is mounted ABOVE AuthProvider — login itself
    // (AuthContext.tsx) needs to consult live account status/role/team.
    //
    // Below AuthProvider, the order is load-bearing (each Provider consumes
    // the one(s) above it via hooks — see each file's own header comment):
    //   ReconciliationSettingsProvider  — tolerance, read by FacebookUploadStore + ReopenStore
    //     FacebookUploadStoreProvider   — live Bank↔FB reconciliation state
    //       ExplanationStoreProvider   — reads FacebookUploadStore's matched ids
    //         ReopenStoreProvider     — reads FacebookUploadStore + ExplanationStore + AccountStore
    // FacebookUploadStoreProvider moved here (used to be CS-branch-only) —
    // Reopen's Admin-side Bank import now needs the SAME live reconciliation
    // state CS's Facebook upload writes to (see that file's header).
    // ExplanationStoreProvider/TkqcDeclarationStoreProvider stay at this
    // shared root for the same reason as before: cross-role visibility
    // without a reload (a CS's submission/declaration must be visible to
    // Accountant/Admin immediately).
    //
    // There is no in-app notification store — this system does not have a
    // notification center. Operational notifications will be delivered via
    // Telegram (per AezCheck Telegram User ID linkage) as a separate,
    // future integration; this UI never depends on it.
    <AccountStoreProvider>
      <AuthProvider>
        <ReconciliationSettingsProvider>
          <FacebookUploadStoreProvider>
            <ExplanationStoreProvider>
              <ReopenStoreProvider>
                <TkqcDeclarationStoreProvider>
                  <Gate />
                </TkqcDeclarationStoreProvider>
              </ReopenStoreProvider>
            </ExplanationStoreProvider>
          </FacebookUploadStoreProvider>
        </ReconciliationSettingsProvider>
      </AuthProvider>
    </AccountStoreProvider>
  )
}
