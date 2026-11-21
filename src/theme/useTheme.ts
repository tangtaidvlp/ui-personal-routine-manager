import { useSyncExternalStore } from 'react'
import { safeLocalStorage } from '../components/layout/sidebarPreference.ts'
import { readThemePreference, resolveTheme, writeThemePreference, type Theme, type ThemePreference } from './themePreference.ts'

/*
 * App-wide theme store (specs/F006 contracts/ui-profile-settings.md "Theme store API").
 * Several controls can be mounted at once, so state lives at module level and every subscriber
 * sees the same value. The effective theme is always written to <html data-theme>; the boot
 * script in index.html sets it first so there is no flash.
 *
 * While signed in, the settings store registers a remote-sync callback so user choices are saved
 * to the account; values loaded from the account are applied with applyThemeFromAccount (no save).
 */

const DARK_QUERY = '(prefers-color-scheme: dark)'

export type ThemeSnapshot = { theme: Theme; preference: ThemePreference }

type RemoteSync = (preference: ThemePreference) => void

const listeners = new Set<() => void>()
let snapshot: ThemeSnapshot | null = null
let mediaQuery: MediaQueryList | null = null
let remoteSync: RemoteSync | null = null

function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

function apply(preference: ThemePreference) {
  const theme = resolveTheme(preference, prefersDark())
  snapshot = { theme, preference }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
  listeners.forEach((listener) => listener())
}

function handleDeviceChange() {
  // Only with "System": follow the device live (FR-008).
  if (snapshot?.preference === 'system') apply('system')
}

export function getThemeSnapshot(): ThemeSnapshot {
  if (!snapshot) apply(readThemePreference(safeLocalStorage()))
  return snapshot as ThemeSnapshot
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!mediaQuery && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia(DARK_QUERY)
    mediaQuery.addEventListener('change', handleDeviceChange)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && mediaQuery) {
      mediaQuery.removeEventListener('change', handleDeviceChange)
      mediaQuery = null
    }
  }
}

/** The user picked a theme: apply it, cache it on the device and (when signed in) save it to the account. */
export function setThemePreference(preference: ThemePreference) {
  writeThemePreference(safeLocalStorage(), preference)
  apply(preference)
  remoteSync?.(preference)
}

/** A theme loaded from the account: apply and cache it, without saving it back. */
export function applyThemeFromAccount(preference: ThemePreference) {
  writeThemePreference(safeLocalStorage(), preference)
  apply(preference)
}

/** Registered by the settings store on sign-in; cleared (null) on sign-out. */
export function setThemeRemoteSync(sync: RemoteSync | null) {
  remoteSync = sync
}

export function useTheme(): ThemeSnapshot & { setPreference: (preference: ThemePreference) => void } {
  const current = useSyncExternalStore(subscribe, getThemeSnapshot, getThemeSnapshot)
  return { ...current, setPreference: setThemePreference }
}
