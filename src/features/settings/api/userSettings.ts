import { apiRequest } from '../../../lib/api.ts'
import type { UserSettings, UserSettingsView } from '../types/settings.ts'
import { normalizeSettings, themeToApi } from '../utils/settingsSchema.ts'

/** Account settings API (specs/F006 contracts/settings-api.md). */

type RawSettingsView = { settings?: unknown; customized?: unknown }

function toView(raw: RawSettingsView | null): UserSettingsView {
  const customized = Array.isArray(raw?.customized) ? raw.customized.filter((key): key is string => typeof key === 'string') : []
  return { settings: normalizeSettings(raw?.settings), customized }
}

const settingsPath = (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}/settings`

export async function fetchUserSettings(userId: string): Promise<UserSettingsView> {
  return toView(await apiRequest<RawSettingsView>(settingsPath(userId), { method: 'GET' }))
}

/** Saves only the given keys. `keepalive` lets a save sent while the page unloads still go out. */
export async function saveUserSettings(
  userId: string,
  partial: Partial<UserSettings>,
  options?: { keepalive?: boolean },
): Promise<UserSettingsView> {
  const body: Record<string, unknown> = { ...partial }
  if (partial.theme) {
    body.theme = themeToApi(partial.theme)
  }
  return toView(
    await apiRequest<RawSettingsView>(settingsPath(userId), {
      method: 'PATCH',
      json: body,
      keepalive: options?.keepalive,
    }),
  )
}
