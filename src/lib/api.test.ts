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

describe('apiRequest 401 refresh and retry (B014)', () => {
  const unauthorized = () =>
    new Response('{"message":"expired"}', { status: 401, headers: { 'Content-Type': 'application/json' } })
  const ok = () => new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  const authAt = (i: number) =>
    new Headers((fetchMock.mock.calls[i]![1] as RequestInit).headers).get('Authorization')

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    api.setAccessToken('old')
  })

  afterEach(() => {
    api.setUnauthorizedHandler(null)
    api.setAccessToken(null)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('refreshes on 401 and retries once with the new bearer and the same body', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(ok())
    const handler = vi.fn().mockResolvedValue('new')
    api.setUnauthorizedHandler(handler)

    await expect(api.apiRequest('/x', { method: 'POST', json: { a: 1 } })).resolves.toEqual({ ok: true })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authAt(0)).toBe('Bearer old')
    expect(authAt(1)).toBe('Bearer new')
    expect((fetchMock.mock.calls[1]![1] as RequestInit).body).toBe('{"a":1}')
  })

  it('shares one refresh between parallel 401s and retries both', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) =>
      Promise.resolve(new Headers(init.headers).get('Authorization') === 'Bearer new' ? ok() : unauthorized()),
    )
    let resolve!: (t: string) => void
    const handler = vi.fn(() => new Promise<string>((r) => { resolve = r }))
    api.setUnauthorizedHandler(handler)

    const both = Promise.all([api.apiRequest('/a'), api.apiRequest('/b')])
    await vi.waitFor(() => expect(handler).toHaveBeenCalled())
    resolve('new')

    await expect(both).resolves.toEqual([{ ok: true }, { ok: true }])
    expect(handler).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('throws the original 401 without retrying when the handler returns null or throws', async () => {
    fetchMock.mockResolvedValue(unauthorized())
    api.setUnauthorizedHandler(vi.fn().mockResolvedValue(null))
    await expect(api.apiRequest('/x')).rejects.toMatchObject({ status: 401, message: 'expired' })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    api.setUnauthorizedHandler(vi.fn().mockRejectedValue(new Error('boom')))
    await expect(api.apiRequest('/x')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never triggers the handler for /auth/ endpoints', async () => {
    fetchMock.mockResolvedValue(unauthorized())
    const handler = vi.fn().mockResolvedValue('new')
    api.setUnauthorizedHandler(handler)
    await expect(api.apiRequest('/api/v1/auth/login', { method: 'POST' })).rejects.toMatchObject({ status: 401 })
    await expect(api.apiRequest('api/v1/auth/refresh', { method: 'POST' })).rejects.toMatchObject({ status: 401 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not refresh again when the retry also gets 401', async () => {
    fetchMock.mockResolvedValue(unauthorized())
    const handler = vi.fn().mockResolvedValue('new')
    api.setUnauthorizedHandler(handler)
    await expect(api.apiRequest('/x')).rejects.toMatchObject({ status: 401 })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
