// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserSettingsView } from '../types/settings.ts'

/*
 * Settings store (specs/F006 tasks T017, research R4–R6). Modules are re-imported per test,
 * because the theme and settings stores are module-level singletons.
 */

vi.mock('../api/userSettings.ts', () => ({
  fetchUserSettings: vi.fn(),
  saveUserSettings: vi.fn(),
}))

type Store = typeof import('./useUserSettings.ts')
type ThemeStore = typeof import('../../../theme/useTheme.ts')
type Notice = typeof import('../utils/saveNotice.ts')

let api: { fetchUserSettings: ReturnType<typeof vi.fn>; saveUserSettings: ReturnType<typeof vi.fn> }
let store: Store
let theme: ThemeStore
let notice: Notice

const view = (settings: Partial<UserSettingsView['settings']> = {}, customized: string[] = []): UserSettingsView => ({
  settings: { theme: 'system', boardZoom: 1, ...settings },
  customized,
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(async () => {
  vi.resetModules()
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  api = (await import('../api/userSettings.ts')) as unknown as typeof api
  api.fetchUserSettings.mockReset()
  api.saveUserSettings.mockReset()
  api.saveUserSettings.mockImplementation(async (_userId: string, partial: object) => view(partial))
  theme = await import('../../../theme/useTheme.ts')
  notice = await import('../utils/saveNotice.ts')
  store = await import('./useUserSettings.ts')
})

afterEach(async () => {
  await store.resetUserSettings()
  vi.useRealTimers()
})

describe('loadUserSettings', () => {
  it('applies the account theme without saving it back, and sets the zoom', async () => {
    window.localStorage.setItem('milos.theme.migrated', '1')
    api.fetchUserSettings.mockResolvedValue(view({ theme: 'dark', boardZoom: 1.5 }, ['theme', 'boardZoom']))

    await store.loadUserSettings('u1')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('milos.theme')).toBe('dark')
    expect(store.getUserSettingsSnapshot()).toMatchObject({ status: 'ready', userId: 'u1', boardZoom: 1.5 })
    expect(api.saveUserSettings).not.toHaveBeenCalled()
  })

  it('falls back quietly when loading fails', async () => {
    window.localStorage.setItem('milos.theme', 'light')
    api.fetchUserSettings.mockRejectedValue(new Error('offline'))
    const failed = vi.fn()
    notice.onSettingsSaveFailed(failed)

    await store.loadUserSettings('u1')

    expect(store.getUserSettingsSnapshot()).toMatchObject({ status: 'error', boardZoom: 1 })
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(failed).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('milos.theme.migrated')).toBeNull()
  })

  it('copies a pre-F006 device theme to an account without one, reading the cache before applying (I1)', async () => {
    window.localStorage.setItem('milos.theme', 'dark')
    api.fetchUserSettings.mockResolvedValue(view({ theme: 'system' }, []))

    await store.loadUserSettings('u1')

    expect(api.saveUserSettings).toHaveBeenCalledTimes(1)
    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { theme: 'dark' }, undefined)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('milos.theme.migrated')).toBe('1')
  })

  it('copies at most once per device', async () => {
    window.localStorage.setItem('milos.theme', 'dark')
    api.fetchUserSettings.mockResolvedValue(view({ theme: 'system' }, []))
    await store.loadUserSettings('u1')
    await store.resetUserSettings()
    api.saveUserSettings.mockClear()

    await store.loadUserSettings('u2')

    expect(api.saveUserSettings).not.toHaveBeenCalled()
    expect(theme.getThemeSnapshot().preference).toBe('system')
  })

  it('does not copy when the account already has a theme', async () => {
    window.localStorage.setItem('milos.theme', 'dark')
    api.fetchUserSettings.mockResolvedValue(view({ theme: 'light' }, ['theme']))

    await store.loadUserSettings('u1')

    expect(api.saveUserSettings).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(window.localStorage.getItem('milos.theme.migrated')).toBe('1')
  })

  it('keeps and saves changes made while loading (U1)', async () => {
    vi.useFakeTimers()
    window.localStorage.setItem('milos.theme.migrated', '1')
    const pending = deferred<UserSettingsView>()
    api.fetchUserSettings.mockReturnValue(pending.promise)

    const loading = store.loadUserSettings('u1')
    theme.setThemePreference('dark')
    store.setBoardZoom(2)
    pending.resolve(view({ theme: 'light', boardZoom: 1 }, ['theme', 'boardZoom']))
    await loading
    await vi.advanceTimersByTimeAsync(600)

    expect(theme.getThemeSnapshot().preference).toBe('dark')
    expect(store.getUserSettingsSnapshot().boardZoom).toBe(2)
    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { theme: 'dark' }, undefined)
    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { boardZoom: 2 }, undefined)
  })
})

describe('saving', () => {
  beforeEach(async () => {
    window.localStorage.setItem('milos.theme.migrated', '1')
    api.fetchUserSettings.mockResolvedValue(view())
    await store.loadUserSettings('u1')
  })

  it('saves the theme straight away', async () => {
    theme.setThemePreference('dark')
    await Promise.resolve()
    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { theme: 'dark' }, undefined)
  })

  it('debounces zoom: three quick changes send one PATCH with the last value', async () => {
    vi.useFakeTimers()
    store.setBoardZoom(1.25)
    store.setBoardZoom(1.5)
    store.setBoardZoom(1.75)
    expect(store.getUserSettingsSnapshot().boardZoom).toBe(1.75)
    await vi.advanceTimersByTimeAsync(499)
    expect(api.saveUserSettings).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10)
    expect(api.saveUserSettings).toHaveBeenCalledTimes(1)
    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { boardZoom: 1.75 }, undefined)
  })

  it('normalizes zoom values', () => {
    store.setBoardZoom(9)
    expect(store.getUserSettingsSnapshot().boardZoom).toBe(3)
    store.setBoardZoom(1.1)
    expect(store.getUserSettingsSnapshot().boardZoom).toBe(1)
  })

  it('shows the notice on a failed save and keeps the local value', async () => {
    api.saveUserSettings.mockRejectedValue(new Error('500'))
    const failed = vi.fn()
    notice.onSettingsSaveFailed(failed)

    theme.setThemePreference('dark')
    await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(1))
    expect(theme.getThemeSnapshot().preference).toBe('dark')
  })

  it('sends a pending zoom save immediately on sign-out (U2)', async () => {
    vi.useFakeTimers()
    store.setBoardZoom(1.5)
    await store.resetUserSettings()

    expect(api.saveUserSettings).toHaveBeenCalledTimes(1)
    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { boardZoom: 1.5 }, undefined)
    expect(store.getUserSettingsSnapshot()).toMatchObject({ status: 'idle', userId: null, boardZoom: 1 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.saveUserSettings).toHaveBeenCalledTimes(1)
  })

  it('sends a pending zoom save with keepalive when the page is hidden (U2)', async () => {
    vi.useFakeTimers()
    store.setBoardZoom(2.5)
    window.dispatchEvent(new Event('pagehide'))

    expect(api.saveUserSettings).toHaveBeenCalledWith('u1', { boardZoom: 2.5 }, { keepalive: true })
  })

  it('stops saving theme changes after sign-out', async () => {
    await store.resetUserSettings()
    api.saveUserSettings.mockClear()
    theme.setThemePreference('light')
    await Promise.resolve()
    expect(api.saveUserSettings).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('milos.theme')).toBe('light')
  })
})
