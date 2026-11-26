import { useCallback, useEffect, useState } from 'react'
import { setAccessToken } from '../../../lib/api.ts'
import type { AuthUser } from '../../../context/AuthContext.ts'
import { loadUserSettings, resetUserSettings } from '../../settings/hooks/useUserSettings.ts'
import { fetchOnboardingStatus, login, logout, refresh, register, toAuthUser } from '../api/auth.ts'

/**
 * Owns who is signed in: silent refresh on load, sign-in, sign-up, sign-out.
 * Sign-in and silent refresh share one `startSession` path. `isLoggedIn` is derived from `user`.
 */
export function useAuthSession() {
  const [user, setUser] = useState<AuthUser>(null)
  const [isOnboardCompleted, setIsOnboardCompleted] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  const startSession = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken)
    const authUser = toAuthUser(accessToken)
    if (!authUser) throw new Error('Invalid access token')
    // Settings load in the background; the user is set only once the onboarding status is known,
    // so routing goes straight to the right page.
    if (authUser.id) void loadUserSettings(authUser.id)
    setIsOnboardCompleted(await fetchOnboardingStatus(authUser.id ?? ''))
    setUser(authUser)
  }, [])

  useEffect(() => {
    const silentReauth = async () => {
      try {
        const data = await refresh()
        await startSession(data.accessToken)
      } catch (error) {
        console.error('Silent re-auth failed', error)
      } finally {
        setIsChecking(false)
      }
    }
    void silentReauth()
  }, [startSession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await login(email, password)
      await startSession(data.accessToken)
    },
    [startSession],
  )

  const signUp = useCallback((email: string, password: string, username: string) => register(email, password, username), [])

  const signOut = useCallback(async () => {
    // Send a pending settings save while the session is still valid, then forget the user (specs/F006 U5).
    await resetUserSettings()
    try {
      await logout()
    } catch (error) {
      console.error('Logout request failed', error)
    } finally {
      setUser(null)
      setIsOnboardCompleted(true)
      setAccessToken(null)
    }
  }, [])

  const markOnboarded = useCallback(() => setIsOnboardCompleted(true), [])

  return { user, isLoggedIn: user !== null, isOnboardCompleted, isChecking, signIn, signUp, signOut, markOnboarded }
}
