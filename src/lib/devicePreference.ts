/** Per-device UI choices kept in localStorage (specs/F016 data-model). Never throws; failures mean "use the default". */

export const BOARD_VIEW_KEY = 'milos.boardView'
export const BOARD_VIEWS = ['vertical', 'radial'] as const
export type BoardView = (typeof BOARD_VIEWS)[number]

export const CHAT_PANEL_KEY = 'milos.chatPanel'
export const CHAT_PANEL_STATES = ['shown', 'hidden'] as const
export type ChatPanelState = (typeof CHAT_PANEL_STATES)[number]

/** Missing, unknown or unreadable value → `fallback`. */
export function readDevicePreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback
    const value = window.localStorage.getItem(key)
    return allowed.find((option) => option === value) ?? fallback
  } catch {
    return fallback
  }
}

/** Write failures (private browsing, quota, blocked storage) are ignored. */
export function writeDevicePreference(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, value)
  } catch {
    // The preference is a convenience; losing it is fine.
  }
}
