import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import '../App.css'
import AuthPage from '../features/auth/pages/AuthPage.tsx'
import { useAuthSession } from '../features/auth/hooks/useAuthSession.ts'
import DailyRoutinePage from '../features/daily/pages/DailyRoutinePage.tsx'
import DefaultRoutinePage from '../features/default-routine/pages/DefaultRoutinePage.tsx'
import AnalyticsPage from '../features/analytics/pages/AnalyticsPage.tsx'
import AppShell from '../components/layout/AppShell.tsx'
import OnboardingPage from '../features/onboarding/pages/OnboardingPage.jsx'
import AuthContext from '../context/AuthContext.ts'
import ProfilePage from '../features/profile/pages/ProfilePage.tsx'
import PersonalTargetPage from '../features/personal-target/pages/PersonalTargetPage.tsx'
import SettingsSaveNotice from '../features/settings/components/SettingsSaveNotice.tsx'

function LoadingScreen() {
  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--color-accent)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg className="spinner" viewBox="0 0 24 24" style={{ width: '32px', height: '32px' }}>
          <circle className="path" cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
        </svg>
        Checking authentication...
      </div>
    </div>
  )
}

/** Signed-in + onboarded guard for every sidebar page (contracts/routes.md, FR-015). */
function RequireOnboarded({ isLoggedIn, isOnboardCompleted, children }: { isLoggedIn: boolean; isOnboardCompleted: boolean; children: ReactNode }) {
  if (!isLoggedIn) return <Navigate to="/auth" replace />
  if (!isOnboardCompleted) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function App() {
  const { user, isLoggedIn, isOnboardCompleted, isChecking, signIn, signUp, signOut, markOnboarded } = useAuthSession()

  if (isChecking) {
    return <LoadingScreen />
  }

  const authenticatedTarget = isOnboardCompleted ? '/today' : '/onboarding'

  return (
    <AuthContext.Provider value={{ user }}>
      <Routes>
        <Route path="/" element={<Navigate to={isLoggedIn ? authenticatedTarget : '/auth'} replace />} />
        <Route
          path="/auth"
          element={isLoggedIn ? <Navigate to={authenticatedTarget} replace /> : <AuthPage onSignIn={signIn} onSignUp={signUp} />}
        />
        <Route
          path="/onboarding"
          element={
            isLoggedIn ? (
              isOnboardCompleted ? (
                <Navigate to="/today" replace />
              ) : (
                <OnboardingPage user={user} onComplete={markOnboarded} />
              )
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          element={
            <RequireOnboarded isLoggedIn={isLoggedIn} isOnboardCompleted={isOnboardCompleted}>
              <AppShell onLogout={signOut} />
            </RequireOnboarded>
          }
        >
          <Route path="/today" element={<DailyRoutinePage />} />
          <Route path="/default-routine" element={<DefaultRoutinePage />} />
          <Route path="/personal-target" element={<PersonalTargetPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        {/* Old bookmarks (before F002) */}
        <Route
          path="/dashboard"
          element={
            <RequireOnboarded isLoggedIn={isLoggedIn} isOnboardCompleted={isOnboardCompleted}>
              <Navigate to="/today" replace />
            </RequireOnboarded>
          }
        />
        <Route path="*" element={<Navigate to={isLoggedIn ? authenticatedTarget : '/auth'} replace />} />
      </Routes>
      <SettingsSaveNotice />
    </AuthContext.Provider>
  )
}

export default App
