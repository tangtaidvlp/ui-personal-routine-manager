import { useSyncExternalStore } from 'react'
import { safeLocalStorage } from '../components/layout/sidebarPreference.ts'
import { readThemePreference, resolveTheme, writeThemePreference, type Theme, type ThemePreference } from './themePreference.ts'

/*
 * App-wide theme store (contracts/theme-ui.md). Several toggles can be mounted at once,
 * so state lives at module level and every subscriber sees the same value.
 * The effective theme is always written to <html data-theme>; the boot script in
 * index.html sets it first so there is no flash of the light theme.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)'

type Snapshot = { theme: Theme; preference: ThemePreference }

const listeners = new Set<() => void>()
let snapshot: Snapshot | null = null
let mediaQuery: MediaQueryList | null = null

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
  // Only while the user hasn't chosen: follow the device live (FR-020).
  if (snapshot?.preference === null) apply(null)
}

function getSnapshot(): Snapshot {
  if (!snapshot) apply(readThemePreference(safeLocalStorage()))
  return snapshot as Snapshot
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

/** Switches to the opposite of the current theme and remembers the choice on this device. */
export function toggleTheme() {
  const next: Theme = getSnapshot().theme === 'dark' ? 'light' : 'dark'
  writeThemePreference(safeLocalStorage(), next)
  apply(next)
}

export function useTheme(): Snapshot & { toggle: () => void } {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...current, toggle: toggleTheme }
}
