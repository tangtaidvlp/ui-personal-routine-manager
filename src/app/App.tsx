import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import '../App.css'
import { ApiError, apiRequest } from '../lib/api.ts'
import AuthPage from '../features/auth/pages/AuthPage.tsx'
import type { AuthMode, AuthUser } from '../features/auth/types/auth.ts'
import ControlCentrePage from '../features/dashboard/pages/ControlCentrePage.jsx'
import OnboardingPage from '../features/onboarding/pages/OnboardingPage.jsx'
import { completeOnboarding } from '../features/onboarding/api/completeOnboarding.ts'

function LoadingScreen() {
  return (
    <div className="page" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--blue-primary)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg className="spinner" viewBox="0 0 24 24" style={{ width: '32px', height: '32px' }}>
          <circle className="path" cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
        </svg>
        Checking authentication...
      </div>
    </div>
  )
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
        }>('/auth/refresh', {
          method: 'POST',
        })

        setAccessToken(data.accessToken)

        const decoded = decodeJwt(data.accessToken)
        if (decoded) {
          setUser({
            id: decoded.sub || decoded.userId || decoded.id || '',
            email: decoded.email || decoded.sub || '',
          })
        }

        const onboardCompleted =
          data.isOnboardCompleted ?? data.user?.isOnboardCompleted ?? decoded?.isOnboardCompleted ?? true
        setIsOnboardCompleted(onboardCompleted)

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
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signInEmail,
          password: signInPassword,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAccessToken(data.accessToken)
        setUser(data.user)
        setIsLoggedIn(true)
        setOnboardingError(null)
        setSignInEmail('')
        setSignInPassword('')

        const onboardCompleted = data.user?.onboardCompleted ?? true
        setIsOnboardCompleted(onboardCompleted)

        return
      }

      let errorMessage = 'Sign-in failed. Please check your credentials.'
 
      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // Response is not JSON.
      }

      setSignInError(errorMessage)
    } catch {
      setSignInError('A network error occurred. Please try again later.')
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
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signUpEmail,
          password: signUpPassword,
          username: signUpFullName,
        }),
      })

      if (response.status === 201) {
        const data = await response.json()
        const registeredEmail = signUpEmail

        setSignUpSuccess(data.message || 'User registered successfully.')
        setSignUpFullName('')
        setSignUpEmail('')
        setSignUpPassword('')

        window.setTimeout(() => {
          setMode('signin')
          setSignInEmail(registeredEmail)
        }, 1500)

        return
      }

      let errorMessage = 'Registration failed. Please try again.'

      try {
        const errorData = await response.json()
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        // Response is not JSON.
      }

      setSignUpError(errorMessage)
    } catch {
      setSignUpError('A network error occurred. Please try again later.')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
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

  const handleCompleteOnboarding = async () => {
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
  }

  if (isCheckingAuth) {
    return <LoadingScreen />
  }

  const authenticatedTarget = isOnboardCompleted ? '/dashboard' : '/onboarding'

  return (
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
              <Navigate to="/dashboard" replace />
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
        path="/dashboard"
        element={
          isLoggedIn ? (
            isOnboardCompleted ? (
              <ControlCentrePage onLogout={handleLogout} user={user} />
            ) : (
              <Navigate to="/onboarding" replace />
            )
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={isLoggedIn ? authenticatedTarget : '/auth'} replace />} />
    </Routes>
  )
}

export default App