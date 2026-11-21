/**
 * Light/dark/system theme preference: device cache of the account theme
 * (specs/.done.F006-user-profile-configuration-store research R3, R4).
 *
 * The account value is the source of truth once loaded; this cache lets the boot script in
 * index.html paint the right theme before the app starts, and is the only store on signed-out
 * screens. Encoding is unchanged from F005: 'light' / 'dark', absent = system.
 */
import type { ThemePreference } from '../features/settings/types/settings.ts'

export type { ThemePreference }

/** Also read by the boot script in index.html — keep the two in sync. */
export const THEME_KEY = 'milos.theme'
/** Set once a device has made its one-time "copy my old theme to the account" decision (FR-014). */
export const MIGRATED_KEY = 'milos.theme.migrated'

export type Theme = 'light' | 'dark'

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>

/** Missing, unreadable or unexpected values mean "follow the device" ('system'). Never throws. */
export function readThemePreference(storage: ReadableStorage | null | undefined): ThemePreference {
  try {
    const value = storage?.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** 'system' removes the key. Write failures (private browsing, blocked storage) are ignored. */
export function writeThemePreference(storage: WritableStorage | null | undefined, preference: ThemePreference): void {
  try {
    if (preference === 'system') {
      storage?.removeItem(THEME_KEY)
    } else {
      storage?.setItem(THEME_KEY, preference)
    }
  } catch {
    // The cache is a convenience; losing it is fine.
  }
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  if (preference === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return preference
}

export function readMigratedFlag(storage: ReadableStorage | null | undefined): boolean {
  try {
    return storage?.getItem(MIGRATED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeMigratedFlag(storage: Pick<Storage, 'setItem'> | null | undefined): void {
  try {
    storage?.setItem(MIGRATED_KEY, '1')
  } catch {
    // Worst case the decision is made again next sign-in; it is idempotent for one account.
  }
}

/**
 * A theme chosen on this device before F006 is copied to the account at most once per device,
 * and only when the account has no saved theme (FR-014, clarification Q3).
 */
export function shouldMigrateDeviceTheme(deviceTheme: ThemePreference, migrated: boolean, customized: readonly string[]): boolean {
  return deviceTheme !== 'system' && !migrated && !customized.includes('theme')
}
