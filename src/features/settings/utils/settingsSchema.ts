import type { ApiTheme, SettingKey, ThemePreference, UserSettings } from '../types/settings.ts'

/*
 * Known account settings, mirrored from the backend UserSettingsRegistry
 * (specs/.done.F006-user-profile-configuration-store, data-model §2).
 * To add a preference: add one entry to SETTING_DEFINITIONS here and one definition in the backend
 * registry. No database change is needed (FR-016).
 */

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 3.0
export const ZOOM_STEP = 0.25

const API_THEMES: Record<ThemePreference, ApiTheme> = { light: 'LIGHT', dark: 'DARK', system: 'SYSTEM' }

export function themeToApi(preference: ThemePreference): ApiTheme {
  return API_THEMES[preference]
}

/** API value → preference; anything unexpected means "follow the OS". */
export function themeFromApi(value: unknown): ThemePreference {
  const lower = typeof value === 'string' ? value.toLowerCase() : ''
  return lower === 'light' || lower === 'dark' ? lower : 'system'
}

/** Clamps to 50–300 %, rounds to the nearest 25 % step; unreadable input is 100 %. */
export function normalizeZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 1
  }
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
  return Math.round(clamped / ZOOM_STEP) * ZOOM_STEP
}

type SettingDefinitions = { [K in SettingKey]: { defaultValue: UserSettings[K]; normalize: (raw: unknown) => UserSettings[K] } }

const SETTING_DEFINITIONS: SettingDefinitions = {
  theme: { defaultValue: 'system', normalize: themeFromApi },
  boardZoom: { defaultValue: 1, normalize: normalizeZoom },
}

const SETTING_KEYS = Object.keys(SETTING_DEFINITIONS) as SettingKey[]

export const DEFAULT_SETTINGS: UserSettings = Object.freeze({
  theme: SETTING_DEFINITIONS.theme.defaultValue,
  boardZoom: SETTING_DEFINITIONS.boardZoom.defaultValue,
})

/** API `settings` object → UserSettings: known keys only, defaults for missing or bad values. */
export function normalizeSettings(raw: unknown): UserSettings {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const result = { ...DEFAULT_SETTINGS }
  for (const key of SETTING_KEYS) {
    if (key in source) {
      ;(result as Record<SettingKey, unknown>)[key] = SETTING_DEFINITIONS[key].normalize(source[key])
    }
  }
  return result
}
