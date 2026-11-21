import { useCallback, useEffect, useRef } from 'react'

/**
 * Keeps the vertical scroll of several elements together (F007 R12): scrolling one board
 * scrolls the others to the same position, so the same times line up side by side.
 * Returns a ref callback; pass it to every element that should move together.
 */
export function useSyncedScroll(): (element: HTMLElement | null) => void {
  const elementsRef = useRef(new Map<HTMLElement, () => void>())
  const syncingRef = useRef(false)

  const register = useCallback((element: HTMLElement | null) => {
    const elements = elementsRef.current
    // React calls ref callbacks with null on unmount; drop elements no longer in the document.
    for (const [existing, listener] of elements) {
      if (existing !== element && !existing.isConnected) {
        existing.removeEventListener('scroll', listener)
        elements.delete(existing)
      }
    }
    if (!element || elements.has(element)) {
      return
    }
    const listener = () => {
      if (syncingRef.current) {
        return
      }
      syncingRef.current = true
      for (const other of elements.keys()) {
        if (other !== element && other.scrollTop !== element.scrollTop) {
          other.scrollTop = element.scrollTop
        }
      }
      // The scroll events caused above arrive asynchronously; ignore them until the next frame.
      const release = () => {
        syncingRef.current = false
      }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(release)
      } else {
        setTimeout(release, 0)
      }
    }
    element.addEventListener('scroll', listener, { passive: true })
    elements.set(element, listener)
    // A newly registered board starts where the others are.
    const first = [...elements.keys()].find((other) => other !== element)
    if (first) {
      element.scrollTop = first.scrollTop
    }
  }, [])

  useEffect(() => {
    const elements = elementsRef.current
    return () => {
      for (const [element, listener] of elements) {
        element.removeEventListener('scroll', listener)
      }
      elements.clear()
    }
  }, [])

  return register
}
