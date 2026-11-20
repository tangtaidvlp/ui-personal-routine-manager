import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * While `active`: moves focus into `containerRef`, keeps Tab inside it, and on
 * deactivate returns focus to whatever had it before (FR-015).
 */
export function useDialogFocus(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const container = containerRef.current
    container?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !container) return
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (event.shiftKey && (current === first || current === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active, containerRef])
}
