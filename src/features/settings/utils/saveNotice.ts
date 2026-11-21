/**
 * Tiny emitter for "a setting couldn't be saved" (specs/F006 FR-013, research R6).
 * Kept free of React so the settings store can raise it; SettingsSaveNotice listens.
 */
type Listener = () => void

const listeners = new Set<Listener>()

export function notifySettingsSaveFailed(): void {
  listeners.forEach((listener) => listener())
}

/** Returns an unsubscribe function. */
export function onSettingsSaveFailed(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
