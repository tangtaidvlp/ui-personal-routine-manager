import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from './api'

const fetchMock = vi.fn()

function lastAuth(): string | null {
  const init = fetchMock.mock.calls.at(-1)![1] as RequestInit
  return new Headers(init.headers).get('Authorization')
}

describe('apiRequest access token (B008)', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    ;(api as unknown as { setAccessToken?: (t: string | null) => void }).setAccessToken?.(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends no Authorization header before a token is set', async () => {
    await api.apiRequest('/x')
    expect(lastAuth()).toBeNull()
  })

  it('attaches the stored token, and stops after it is cleared', async () => {
    api.setAccessToken('abc')
    await api.apiRequest('/x')
    expect(lastAuth()).toBe('Bearer abc')

    api.setAccessToken(null)
    await api.apiRequest('/x')
    expect(lastAuth()).toBeNull()
  })

  it('lets an explicit token option win', async () => {
    api.setAccessToken('abc')
    await api.apiRequest('/x', { token: 'explicit' })
    expect(lastAuth()).toBe('Bearer explicit')
  })
})
