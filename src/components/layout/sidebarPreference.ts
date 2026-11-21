/** Wide-screen sidebar shown/hidden choice, kept per device (specs/.done.F002-ui-refactoring data-model §2). */

export const SIDEBAR_COLLAPSED_KEY = 'milos.sidebar.collapsed'

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem'>

/** Missing, unreadable or unexpected values mean "expanded" (false). Never throws. */
export function readSidebarCollapsed(storage: ReadableStorage | null | undefined): boolean {
  try {
    return storage?.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

/** Write failures (private browsing, quota, blocked storage) are ignored. */
export function writeSidebarCollapsed(storage: WritableStorage | null | undefined, value: boolean): void {
  try {
    storage?.setItem(SIDEBAR_COLLAPSED_KEY, value ? 'true' : 'false')
  } catch {
    // The preference is a convenience; losing it is fine.
  }
}

/** `window.localStorage`, or null when touching it throws (e.g. storage blocked). */
export function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}
