import { useEffect, useState, useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import '../App.css'
import { ApiError, apiRequest } from '../lib/api.ts'
import AuthPage from '../features/auth/pages/AuthPage.tsx'
import type { AuthMode } from '../features/auth/types/auth.ts'
import type { AuthUser } from '../context/AuthContext.ts'
import DailyRoutinePage from '../features/daily/pages/DailyRoutinePage.jsx'
import DefaultRoutinePage from '../features/default-routine/pages/DefaultRoutinePage.tsx'
import AnalyticsPage from '../features/analytics/pages/AnalyticsPage.tsx'
import AppShell from '../components/layout/AppShell.tsx'
import OnboardingPage from '../features/onboarding/pages/OnboardingPage.jsx'
import { completeOnboarding } from '../features/onboarding/api/completeOnboarding.ts'
import AuthContext from '../context/AuthContext.ts'

// GET /api/users/{id}/onboarding/complete returns the User entity, whose flag is `onboardCompleted`.
// Older code read `onboardingCompleted` (always undefined), which sent onboarded users back to /onboarding.
type OnboardingStatus = { onboardCompleted?: boolean; onboardingCompleted?: boolean }
const isOnboarded = (status: OnboardingStatus | null) => Boolean(status?.onboardCompleted ?? status?.onboardingCompleted)

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
  const [mode, setMode] = useState<AuthMode>('signin')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isOnboardCompleted, setIsOnboardCompleted] = useState(true)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signUpFullName, setSignUpFullName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)
  const [onboardingError, setOnboardingError] = useState<string | null>(null)

  useEffect(() => {
    if (accessToken) {
      return
    }
  }, [accessToken])

  const clearAuthMessages = () => {
    setSignInError(null)
    setSignUpError(null)
    setSignUpSuccess(null)
  }

  const setAuthMode = (nextMode: AuthMode) => {
    if (isLoggingIn || isRegistering) {
      return
    }

    setMode(nextMode)
    clearAuthMessages()
  }

  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((character) => '%' + ('00' + character.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )

      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  useEffect(() => {
    const silentReauth = async () => {
      try {
        const data = await apiRequest<{
          accessToken: string
          isOnboardCompleted?: boolean
          user?: { isOnboardCompleted?: boolean }
        }>('api/v1/auth/refresh', {
          method: 'POST',
        })

        setAccessToken(data.accessToken)

        const decoded = decodeJwt(data.accessToken)
        if (decoded) {
          setUser({
            id: decoded.sub || decoded.userId || decoded.id || '',
            email: decoded.email || decoded.sub || '',
            name: decoded.name || decoded.username || '',
          })
        }

        // Get user
        const user = await apiRequest<OnboardingStatus>(`api/users/${decoded.sub}/onboarding/complete`, { method: 'GET' })
        setIsOnboardCompleted(isOnboarded(user))

        setIsLoggedIn(true)
      } catch (error) {
        console.error('Silent re-auth failed', error)
      } finally {
        setIsCheckingAuth(false)
      }
    }

    void silentReauth()
  }, [])

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoggingIn(true)
    setSignInError(null)

    try {
      const response = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        json: {
          email: signInEmail,
          password: signInPassword,
        },
      })

      const data = response as any
      setAccessToken(data.accessToken)
      setUser(data.user)

      // Get user onboarding status before marking logged in, so routing goes straight to the right page
      const decoded = decodeJwt(data.accessToken)
      const userId = decoded?.sub || data.user?.id
      const onboarding = await apiRequest<OnboardingStatus>(`api/users/${userId}/onboarding/complete`, { method: 'GET' })
      setIsOnboardCompleted(isOnboarded(onboarding))

      setIsLoggedIn(true)
      setOnboardingError(null)
      setSignInEmail('')
      setSignInPassword('')

    } catch (err: any) {
      setSignInError(err.message)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsRegistering(true)
    setSignUpError(null)
    setSignUpSuccess(null)

    try {
      const response = await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        json: {
          email: signUpEmail,
          password: signUpPassword,
          username: signUpFullName,
        },
      })

      const data = response as any
      const registeredEmail = signUpEmail

      setSignUpSuccess('User registered successfully. Welcome ' + data.userName)
      setSignUpFullName('')
      setSignUpEmail('')
      setSignUpPassword('')
      setUser({
        id: data.userId,
        email: data.email,
        name: data.name
      })

      window.setTimeout(() => {
        setMode('signin')
        setSignInEmail(registeredEmail)
      }, 1500)

    } catch (err: any) {
      setSignUpError(err.message)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleLogout = async () => {
    try {
      await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('Logout request failed', error)
    } finally {
      setIsLoggedIn(false)
      setIsOnboardCompleted(true)
      setOnboardingError(null)
      setAccessToken(null)
      setUser(null)
    }
  }

  const handleCompleteOnboarding = useCallback(async () => {
    if (!user?.id) {
      setOnboardingError('Unable to complete onboarding because user information is missing.')
      return
    }

    setIsCompletingOnboarding(true)
    setOnboardingError(null)

    try {
      await completeOnboarding(user.id)
      setIsOnboardCompleted(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 500) {
        setOnboardingError('Could not complete onboarding for this user (server returned 500).')
      } else if (error instanceof ApiError) {
        setOnboardingError(error.message)
      } else {
        setOnboardingError('Failed to complete onboarding. Please try again.')
      }
    } finally {
      setIsCompletingOnboarding(false)
    }
  }, [user])

  if (isCheckingAuth) {
    return <LoadingScreen />
  }

  const authenticatedTarget = isOnboardCompleted ? '/today' : '/onboarding'

  return (
    <AuthContext.Provider value={{ user, setUser }}>
        <Routes>
          <Route path="/" element={<Navigate to={isLoggedIn ? authenticatedTarget : '/auth'} replace />} />
          <Route
            path="/auth"
            element={
              isLoggedIn ? (
                <Navigate to={authenticatedTarget} replace />
              ) : (
                <AuthPage
                  mode={mode}
                  isLoggingIn={isLoggingIn}
                  isRegistering={isRegistering}
                  signInEmail={signInEmail}
                  signInPassword={signInPassword}
                  signUpFullName={signUpFullName}
                  signUpEmail={signUpEmail}
                  signUpPassword={signUpPassword}
                  signInError={signInError}
                  signUpError={signUpError}
                  signUpSuccess={signUpSuccess}
                  onModeChange={setAuthMode}
                  onSignInEmailChange={setSignInEmail}
                  onSignInPasswordChange={setSignInPassword}
                  onSignUpFullNameChange={setSignUpFullName}
                  onSignUpEmailChange={setSignUpEmail}
                  onSignUpPasswordChange={setSignUpPassword}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                />
              )
            }
          />
          <Route
            path="/onboarding"
            element={
              isLoggedIn ? (
                isOnboardCompleted ? (
                  <Navigate to="/today" replace />
                ) : (
                  <OnboardingPage
                    user={user}
                    onComplete={handleCompleteOnboarding}
                    isCompleting={isCompletingOnboarding}
                    completeError={onboardingError}
                  />
                )
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            element={
              <RequireOnboarded isLoggedIn={isLoggedIn} isOnboardCompleted={isOnboardCompleted}>
                <AppShell onLogout={handleLogout} />
              </RequireOnboarded>
            }
          >
            <Route path="/today" element={<DailyRoutinePage />} />
            <Route path="/default-routine" element={<DefaultRoutinePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
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
    </AuthContext.Provider>
  )
}

export default App
