import { useSyncExternalStore } from 'react'
import { safeLocalStorage } from '../../../components/layout/sidebarPreference.ts'
import {
  readMigratedFlag,
  readThemePreference,
  shouldMigrateDeviceTheme,
  writeMigratedFlag,
} from '../../../theme/themePreference.ts'
import { applyThemeFromAccount, getThemeSnapshot, setThemePreference, setThemeRemoteSync } from '../../../theme/useTheme.ts'
import { fetchUserSettings, saveUserSettings } from '../api/userSettings.ts'
import type { SettingKey, ThemePreference, UserSettings } from '../types/settings.ts'
import { DEFAULT_SETTINGS, normalizeZoom, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../utils/settingsSchema.ts'
import { notifySettingsSaveFailed } from '../utils/saveNotice.ts'

/*
 * Account settings store (specs/F006 data-model §5, tasks T025). Module-level, like the theme store,
 * so every board and the Profile page share one zoom value.
 *
 * - loadUserSettings(userId) on sign-in / silent refresh; resetUserSettings() on sign-out.
 * - The theme itself lives in theme/useTheme.ts; this store registers the remote-sync callback.
 * - Zoom saves are debounced; a pending save is sent at once on sign-out or when the page is hidden.
 */

export type SettingsStatus = 'idle' | 'loading' | 'ready' | 'error'

export type UserSettingsSnapshot = {
  status: SettingsStatus
  userId: string | null
  boardZoom: number
  customized: readonly string[]
}

const ZOOM_SAVE_DELAY_MS = 500

const listeners = new Set<() => void>()
let state: UserSettingsSnapshot = { status: 'idle', userId: null, boardZoom: DEFAULT_SETTINGS.boardZoom, customized: [] }
let loadToken = 0
const touchedWhileLoading = new Set<SettingKey>()
let pendingZoom: number | null = null
let zoomTimer: ReturnType<typeof setTimeout> | null = null

function setState(patch: Partial<UserSettingsSnapshot>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function markTouched(key: SettingKey) {
  if (state.status === 'loading') touchedWhileLoading.add(key)
}

async function save(partial: Partial<UserSettings>, options?: { keepalive?: boolean }): Promise<void> {
  const userId = state.userId
  if (!userId) return
  try {
    await saveUserSettings(userId, partial, options)
  } catch {
    // The value stays applied for this session (FR-013).
    notifySettingsSaveFailed()
  }
}

function syncThemeToAccount(preference: ThemePreference) {
  // Theme changes reach this store only through this callback (U6).
  markTouched('theme')
  void save({ theme: preference })
}

function flushZoom(options?: { keepalive?: boolean }): Promise<void> {
  if (zoomTimer) {
    clearTimeout(zoomTimer)
    zoomTimer = null
  }
  if (pendingZoom === null) return Promise.resolve()
  const value = pendingZoom
  pendingZoom = null
  return save({ boardZoom: value }, options)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void flushZoom({ keepalive: true })
  })
}

/** Loads the account settings after sign-in. Never throws; failures fall back quietly. */
export async function loadUserSettings(userId: string): Promise<void> {
  const token = ++loadToken
  getThemeSnapshot() // make sure the device theme is applied while we wait
  touchedWhileLoading.clear()
  setState({ status: 'loading', userId, customized: [] })
  // Registered first, so changes made while loading are saved (U1).
  setThemeRemoteSync(syncThemeToAccount)

  // Read the device cache BEFORE applying the account theme, which overwrites it (I1).
  const storage = safeLocalStorage()
  const deviceTheme = readThemePreference(storage)
  const migrated = readMigratedFlag(storage)

  let view
  try {
    view = await fetchUserSettings(userId)
  } catch {
    if (token !== loadToken) return
    touchedWhileLoading.clear()
    setState({ status: 'error' })
    return
  }
  if (token !== loadToken) return

  if (!touchedWhileLoading.has('theme')) {
    applyThemeFromAccount(view.settings.theme)
  }
  setState({
    customized: view.customized,
    boardZoom: touchedWhileLoading.has('boardZoom') ? state.boardZoom : view.settings.boardZoom,
  })
  if (!touchedWhileLoading.has('theme') && shouldMigrateDeviceTheme(deviceTheme, migrated, view.customized)) {
    setThemePreference(deviceTheme) // applies and saves it
  }
  writeMigratedFlag(storage)
  touchedWhileLoading.clear()
  setState({ status: 'ready' })
}

/** Sign-out: send any pending save first (U2), then forget the user. Keeps the device theme cache. */
export async function resetUserSettings(): Promise<void> {
  await flushZoom()
  loadToken++
  touchedWhileLoading.clear()
  setThemeRemoteSync(null)
  setState({ status: 'idle', userId: null, boardZoom: DEFAULT_SETTINGS.boardZoom, customized: [] })
}

/** Applies at once; saves the last value after a short pause. */
export function setBoardZoom(value: number) {
  const zoom = normalizeZoom(value)
  markTouched('boardZoom')
  setState({ boardZoom: zoom })
  if (!state.userId) return
  pendingZoom = zoom
  if (zoomTimer) clearTimeout(zoomTimer)
  zoomTimer = setTimeout(() => {
    zoomTimer = null
    void flushZoom()
  }, ZOOM_SAVE_DELAY_MS)
}

export function getUserSettingsSnapshot(): UserSettingsSnapshot {
  return state
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useUserSettings(): UserSettingsSnapshot {
  return useSyncExternalStore(subscribe, getUserSettingsSnapshot, getUserSettingsSnapshot)
}

/** The one board zoom shared by Today, Default routine and Onboarding (FR-010). */
export function useBoardZoom() {
  const { boardZoom } = useUserSettings()
  return {
    zoom: boardZoom,
    setZoom: setBoardZoom,
    zoomIn: () => setBoardZoom(boardZoom + ZOOM_STEP),
    zoomOut: () => setBoardZoom(boardZoom - ZOOM_STEP),
    canZoomIn: boardZoom < ZOOM_MAX,
    canZoomOut: boardZoom > ZOOM_MIN,
  }
}
