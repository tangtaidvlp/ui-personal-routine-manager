// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthSession } from './useAuthSession.ts'
import * as authApi from '../api/auth.ts'
import * as apiLib from '../../../lib/api.ts'
import * as settings from '../../settings/hooks/useUserSettings.ts'

vi.mock('../api/auth.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth.ts')>()),
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  fetchOnboardingStatus: vi.fn(),
}))
vi.mock('../../../lib/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api.ts')>()),
  setAccessToken: vi.fn(),
}))
vi.mock('../../settings/hooks/useUserSettings.ts', () => ({
  loadUserSettings: vi.fn().mockResolvedValue(undefined),
  resetUserSettings: vi.fn().mockResolvedValue(undefined),
}))

const TOKEN = (() => {
  const payload = btoa(JSON.stringify({ sub: 'u1', email: 'a@b.c', name: 'Ann' })).replace(/=+$/, '')
  return `h.${payload}.s`
})()
const EXPECTED_USER = { id: 'u1', email: 'a@b.c', name: 'Ann' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(authApi.fetchOnboardingStatus).mockResolvedValue(true)
})

describe('useAuthSession', () => {
  it('signs in a user from silent refresh and from login with the same user', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: TOKEN })
    const refreshed = renderHook(() => useAuthSession())
    await waitFor(() => expect(refreshed.result.current.isChecking).toBe(false))
    expect(refreshed.result.current.user).toEqual(EXPECTED_USER)
    expect(refreshed.result.current.isLoggedIn).toBe(true)
    expect(apiLib.setAccessToken).toHaveBeenCalledWith(TOKEN)
    expect(settings.loadUserSettings).toHaveBeenCalledWith('u1')
    expect(authApi.fetchOnboardingStatus).toHaveBeenCalledWith('u1')

    vi.mocked(authApi.refresh).mockRejectedValue(new Error('no cookie'))
    vi.mocked(authApi.login).mockResolvedValue({ accessToken: TOKEN, user: { id: 'u1', email: 'a@b.c', name: 'Ann' } })
    const loggedIn = renderHook(() => useAuthSession())
    await waitFor(() => expect(loggedIn.result.current.isChecking).toBe(false))
    expect(loggedIn.result.current.isLoggedIn).toBe(false)
    await act(() => loggedIn.result.current.signIn('a@b.c', 'pw'))
    expect(authApi.login).toHaveBeenCalledWith('a@b.c', 'pw')
    expect(loggedIn.result.current.user).toEqual(refreshed.result.current.user)
  })

  it('ends checking logged out when the silent refresh fails', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('401'))
    const { result } = renderHook(() => useAuthSession())
    expect(result.current.isChecking).toBe(true)
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.isLoggedIn).toBe(false)
    expect(apiLib.setAccessToken).not.toHaveBeenCalled()
  })

  it('keeps the user logged out until the onboarding status is known', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('401'))
    vi.mocked(authApi.login).mockResolvedValue({ accessToken: TOKEN })
    vi.mocked(authApi.fetchOnboardingStatus).mockRejectedValue(new Error('500'))
    const { result } = renderHook(() => useAuthSession())
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    await act(async () => {
      await expect(result.current.signIn('a@b.c', 'pw')).rejects.toThrow('500')
    })
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('does not log the user in on sign-up', async () => {
    vi.mocked(authApi.refresh).mockRejectedValue(new Error('401'))
    vi.mocked(authApi.register).mockResolvedValue({ userId: 'u9', email: 'n@b.c', userName: 'New' })
    const { result } = renderHook(() => useAuthSession())
    await waitFor(() => expect(result.current.isChecking).toBe(false))
    let response: unknown
    await act(async () => {
      response = await result.current.signUp('n@b.c', 'pw', 'New')
    })
    expect(authApi.register).toHaveBeenCalledWith('n@b.c', 'pw', 'New')
    expect(response).toMatchObject({ userName: 'New' })
    expect(result.current.isLoggedIn).toBe(false)
  })

  it('signs out: saves settings first, then logs out, then clears user and token even if logout fails', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: TOKEN })
    const order: string[] = []
    vi.mocked(settings.resetUserSettings).mockImplementation(async () => { order.push('reset') })
    vi.mocked(authApi.logout).mockImplementation(async () => { order.push('logout'); throw new Error('network') })
    const { result } = renderHook(() => useAuthSession())
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true))
    await act(() => result.current.signOut())
    expect(order).toEqual(['reset', 'logout'])
    expect(result.current.user).toBeNull()
    expect(result.current.isLoggedIn).toBe(false)
    expect(apiLib.setAccessToken).toHaveBeenLastCalledWith(null)
  })

  it('markOnboarded flips the onboarding flag', async () => {
    vi.mocked(authApi.refresh).mockResolvedValue({ accessToken: TOKEN })
    vi.mocked(authApi.fetchOnboardingStatus).mockResolvedValue(false)
    const { result } = renderHook(() => useAuthSession())
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true))
    expect(result.current.isOnboardCompleted).toBe(false)
    act(() => result.current.markOnboarded())
    expect(result.current.isOnboardCompleted).toBe(true)
  })
})
