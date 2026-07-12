import { useState } from 'react'
import './App.css'
import ControlCentre from './controlcentre/ControlCentre'

type AuthMode = 'signin' | 'signup'

function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={`logo ${size}`}>
      <div className="logo-icon" aria-hidden="true">
        <span className="logo-r">R</span>
      </div>
      <span className="logo-text">
        <span className="logo-routine">Routine</span>{' '}
        <span className="logo-manager">Manager</span>
      </span>
    </div>
  )
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function HeroIllustration() {
  return (
    <svg className="hero-illustration" viewBox="0 0 320 280" fill="none" aria-hidden="true">
      <circle cx="160" cy="130" r="80" fill="#d4ecff" opacity="0.5" />
      <ellipse cx="160" cy="200" rx="60" ry="8" fill="#b8d4f0" opacity="0.4" />
      <rect x="60" y="60" width="48" height="56" rx="6" fill="#fff" stroke="#4db8ff" strokeWidth="2" />
      <line x1="72" y1="78" x2="96" y2="78" stroke="#4db8ff" strokeWidth="2" />
      <line x1="72" y1="90" x2="96" y2="90" stroke="#e8f4fd" strokeWidth="2" />
      <line x1="72" y1="102" x2="88" y2="102" stroke="#e8f4fd" strokeWidth="2" />
      <circle cx="220" cy="70" r="28" fill="#fff" stroke="#4db8ff" strokeWidth="2" />
      <line x1="220" y1="58" x2="220" y2="82" stroke="#4db8ff" strokeWidth="2" strokeLinecap="round" />
      <line x1="208" y1="70" x2="232" y2="70" stroke="#4db8ff" strokeWidth="2" strokeLinecap="round" />
      <rect x="230" y="130" width="44" height="52" rx="4" fill="#fff" stroke="#4db8ff" strokeWidth="2" />
      <text x="242" y="155" fontSize="10" fill="#4db8ff" fontWeight="600">Daily</text>
      <line x1="238" y1="162" x2="266" y2="162" stroke="#e8f4fd" strokeWidth="2" />
      <line x1="238" y1="172" x2="258" y2="172" stroke="#e8f4fd" strokeWidth="2" />
      <rect x="50" y="150" width="36" height="44" rx="4" fill="#7ecfff" />
      <rect x="56" y="158" width="24" height="6" rx="2" fill="#fff" />
      <rect x="56" y="170" width="24" height="6" rx="2" fill="#fff" opacity="0.7" />
      <circle cx="160" cy="115" r="22" fill="#f5c6a0" />
      <rect x="143" y="136" width="34" height="40" rx="8" fill="#e85d5d" />
      <rect x="138" y="148" width="12" height="28" rx="6" fill="#e85d5d" />
      <rect x="170" y="148" width="12" height="28" rx="6" fill="#e85d5d" />
      <rect x="150" y="174" width="10" height="30" rx="4" fill="#1a6fd4" />
      <rect x="160" y="174" width="10" height="30" rx="4" fill="#1a6fd4" />
      <ellipse cx="270" cy="210" rx="16" ry="20" fill="#7ecfff" />
      <rect x="262" y="210" width="16" height="14" fill="#4db8ff" rx="2" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

function DecorativeBackground() {
  return (
    <div className="decorations" aria-hidden="true">
      <div className="deco-shape deco-circle-blue" style={{ top: '8%', left: '5%' }} />
      <div className="deco-shape deco-circle-red" style={{ top: '15%', right: '8%' }} />
      <div className="deco-shape deco-circle-yellow" style={{ bottom: '20%', left: '3%' }} />
      <div className="deco-shape deco-circle-blue-sm" style={{ bottom: '12%', right: '5%' }} />
      <div className="deco-star" style={{ top: '25%', left: '12%' }}>★</div>
      <div className="deco-star" style={{ top: '10%', right: '20%' }}>★</div>
      <div className="deco-star" style={{ bottom: '30%', right: '15%' }}>★</div>
      <div className="deco-dash deco-dash-red" style={{ top: '40%', left: '8%' }} />
      <div className="deco-dash deco-dash-blue" style={{ bottom: '35%', right: '10%' }} />

      <div className="side-label side-label-left">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Tasks</span>
      </div>
      <div className="side-label side-label-right">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Routines</span>
      </div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setTimeout(() => {
      setIsLoggingIn(false)
      setIsLoggedIn(true)
    }, 1500)
  }

  if (isLoggedIn) {
    return <ControlCentre onLogout={() => setIsLoggedIn(false)} />
  }

  return (
    <div className="page">
      <DecorativeBackground />

      <header className="header">
        <Logo size="sm" />
        <nav className="nav">
          <a href="#">Home</a>
          <a href="#">About</a>
          <a href="#">Contact</a>
        </nav>
      </header>

      <main className="main">
        <div className="auth-card">
          <div className="hero-panel">
            <HeroIllustration />
            <div className="hero-text">
              <h2>
                <CalendarIcon />
                Manage Your Day
                <CalendarIcon />
              </h2>
              <p>Welcome to Routine Manager! Organize your life effortlessly.</p>
            </div>
          </div>

          <div className="forms-panel">
            <div className="auth-toggle">
              <button
                type="button"
                className={`toggle-btn ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => !isLoggingIn && setMode('signin')}
                disabled={isLoggingIn}
              >
                SIGN IN
              </button>
              <button
                type="button"
                className={`toggle-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => !isLoggingIn && setMode('signup')}
                disabled={isLoggingIn}
              >
                SIGN UP
              </button>
            </div>

            <div className="forms-logo">
              <Logo />
            </div>

            <div className={`forms-grid ${mode}`}>
              <section className="form-section signin-section">
                <h3>Sign In to Your Account</h3>
                <form onSubmit={handleSignIn}>
                  <label className="input-field">
                    <EmailIcon />
                    <input type="email" placeholder="Email Address" required disabled={isLoggingIn} />
                  </label>
                  <label className="input-field">
                    <LockIcon />
                    <input type="password" placeholder="Password" required disabled={isLoggingIn} />
                  </label>
                  <button type="submit" className="btn btn--primary" disabled={isLoggingIn}>
                    {isLoggingIn ? (
                      <span className="btn-loading">
                        <svg className="spinner" viewBox="0 0 24 24">
                          <circle className="path" cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
                        </svg>
                        Signing In...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                  <a href="#" className="link-forgot" onClick={(e) => isLoggingIn && e.preventDefault()}>Forgot Password?</a>
                  <p className="form-footer">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      className="link-signup"
                      onClick={() => !isLoggingIn && setMode('signup')}
                      disabled={isLoggingIn}
                    >
                      Sign Up
                    </button>
                  </p>
                </form>
              </section>

              <section className="form-section signup-section">
                <h3>Sign Up</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <label className="input-field">
                    <UserIcon />
                    <input type="text" placeholder="Full Name" />
                  </label>
                  <label className="input-field">
                    <EmailIcon />
                    <input type="email" placeholder="Email Address" />
                  </label>
                  <label className="input-field">
                    <LockIcon />
                    <input type="password" placeholder="Create Password" />
                  </label>
                  <button type="submit" className="btn btn--secondary">Create Account</button>
                  <p className="form-footer">
                    Login or{' '}
                    <button type="button" className="link-inline" onClick={() => setMode('signin')}>
                      Sign In
                    </button>
                  </p>
                  <div className="social-divider" />
                  <div className="social-buttons">
                    <button type="button" className="social-btn" aria-label="Sign up with Google">
                      <GoogleIcon />
                    </button>
                    <button type="button" className="social-btn" aria-label="Sign up with Facebook">
                      <FacebookIcon />
                    </button>
                    <button type="button" className="social-btn" aria-label="Sign up with Apple">
                      <AppleIcon />
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
