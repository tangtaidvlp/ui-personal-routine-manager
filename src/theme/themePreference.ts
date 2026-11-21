/**
 * Light/dark theme preference, kept per device and never on the server
 * (specs/F005-i-want-color-to-be-persisted FR-020, FR-021; contracts/theme-ui.md).
 */

/** Also read by the boot script in index.html — keep the two in sync. */
export const THEME_KEY = 'milos.theme'

export type Theme = 'light' | 'dark'
/** null = no choice yet: follow the device setting. */
export type ThemePreference = Theme | null

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>

/** Missing, unreadable or unexpected values mean "follow the device" (null). Never throws. */
export function readThemePreference(storage: ReadableStorage | null | undefined): ThemePreference {
  try {
    const value = storage?.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/** null removes the choice. Write failures (private browsing, blocked storage) are ignored. */
export function writeThemePreference(storage: WritableStorage | null | undefined, preference: ThemePreference): void {
  try {
    if (preference === null) {
      storage?.removeItem(THEME_KEY)
    } else {
      storage?.setItem(THEME_KEY, preference)
    }
  } catch {
    // The preference is a convenience; losing it is fine.
  }
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  return preference ?? (prefersDark ? 'dark' : 'light')
}
