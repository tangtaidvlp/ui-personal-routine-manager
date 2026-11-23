import { useCallback, useEffect, useRef } from 'react'

/**
 * Keeps the vertical scroll of several elements together (F007 R12): scrolling one board
 * scrolls the others to the same position, so the same times line up side by side.
 * Returns a ref callback; pass it to every element that should move together.
 *
 * Echoes are detected by position, not by time (F009): the position written to each follower is
 * remembered, and a scroll event at that position is our own echo. Any other scroll event is the
 * user, so a late echo can never pull the board being scrolled back.
 */
export function useSyncedScroll(): (element: HTMLElement | null) => void {
  const elementsRef = useRef(new Map<HTMLElement, () => void>())
  const expectedRef = useRef(new Map<HTMLElement, number>())

  const register = useCallback((element: HTMLElement | null) => {
    const elements = elementsRef.current
    const expected = expectedRef.current

    /** Moves `target` to `scrollTop` and remembers where it landed (after clamping/rounding). */
    const follow = (target: HTMLElement, scrollTop: number) => {
      if (target.scrollTop !== scrollTop) {
        target.scrollTop = scrollTop
        expected.set(target, target.scrollTop)
      }
    }

    // React calls ref callbacks with null on unmount; drop elements no longer in the document.
    for (const [existing, listener] of elements) {
      if (existing !== element && !existing.isConnected) {
        existing.removeEventListener('scroll', listener)
        elements.delete(existing)
        expected.delete(existing)
      }
    }
    if (!element || elements.has(element)) {
      return
    }
    const listener = () => {
      const echo = expected.get(element)
      expected.delete(element)
      if (echo !== undefined && Math.abs(element.scrollTop - echo) < 1) {
        return
      }
      for (const other of elements.keys()) {
        if (other !== element) {
          follow(other, element.scrollTop)
        }
      }
    }
    element.addEventListener('scroll', listener, { passive: true })
    elements.set(element, listener)
    // A newly registered board starts where the others are.
    const first = [...elements.keys()].find((other) => other !== element)
    if (first) {
      follow(element, first.scrollTop)
    }
  }, [])

  useEffect(() => {
    const elements = elementsRef.current
    const expected = expectedRef.current
    return () => {
      for (const [element, listener] of elements) {
        element.removeEventListener('scroll', listener)
      }
      elements.clear()
      expected.clear()
    }
  }, [])

  return register
}
