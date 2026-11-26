import { apiRequest } from '../../../lib/api.ts'
import type { AuthUser } from '../../../context/AuthContext.ts'

export type LoginResponse = {
  accessToken: string
  expiresIn?: number
  user?: { id?: string; email?: string; name?: string; onboardCompleted?: boolean }
}

export type RefreshResponse = { accessToken: string; expiresIn?: number }

export type RegisterResponse = { userId: string; email: string; userName: string; message?: string }

// GET /api/users/{id}/onboarding/complete returns the User entity, whose flag is `onboardCompleted`.
// Older code read `onboardingCompleted` (always undefined), which sent onboarded users back to /onboarding.
export type OnboardingStatus = { onboardCompleted?: boolean; onboardingCompleted?: boolean }

export type JwtClaims = { sub?: string; userId?: string; id?: string; email?: string; name?: string }

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/v1/auth/login', { method: 'POST', json: { email, password } })
}

export function register(email: string, password: string, username: string): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/api/v1/auth/register', { method: 'POST', json: { email, password, username } })
}

export function refresh(): Promise<RefreshResponse> {
  return apiRequest<RefreshResponse>('api/v1/auth/refresh', { method: 'POST' })
}

export async function logout(): Promise<void> {
  await apiRequest('/api/v1/auth/logout', { method: 'POST' })
}

export async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const status = await apiRequest<OnboardingStatus | null>(`api/users/${userId}/onboarding/complete`, { method: 'GET' })
  return Boolean(status?.onboardCompleted ?? status?.onboardingCompleted)
}

/** Reads the claims of a JWT without verifying it; null when the token is malformed. */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((character) => '%' + ('00' + character.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/** The one place that builds the signed-in user, for sign-in and silent refresh alike. */
export function toAuthUser(accessToken: string): NonNullable<AuthUser> | null {
  const claims = decodeJwt(accessToken)
  if (!claims) return null
  return {
    id: claims.sub || claims.userId || claims.id || '',
    email: claims.email || claims.sub || '',
    // Display name = username (the JWT `name` claim), else the email (specs/F006 FR-003).
    name: claims.name || claims.email || '',
  }
}
