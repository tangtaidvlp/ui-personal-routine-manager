import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import '../App.css'
import { apiRequest } from '../lib/api.ts'
import AuthPage from '../features/auth/pages/AuthPage.tsx'
import type { AuthMode, AuthUser } from '../features/auth/types/auth.ts'
import ControlCentrePage from '../features/dashboard/pages/ControlCentrePage.jsx'

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
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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
        const data = await apiRequest<{ accessToken: string }>('/auth/refresh', {
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
        setSignInEmail('')
        setSignInPassword('')

        const isOnboardCompleted = data.isOnboardCompleted ?? data.user?.isOnboardCompleted
        if (isOnboardCompleted === false) {
          navigate('/dashboard', { replace: true })
        }

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
      setAccessToken(null)
      setUser(null)
    }
  }

  if (isCheckingAuth) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isLoggedIn ? '/dashboard' : '/auth'} replace />} />
      <Route
        path="/auth"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
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
        path="/dashboard"
        element={isLoggedIn ? <ControlCentrePage onLogout={handleLogout} user={user} /> : <Navigate to="/auth" replace />}
      />
      <Route path="*" element={<Navigate to={isLoggedIn ? '/dashboard' : '/auth'} replace />} />
    </Routes>
  )
}

export default App