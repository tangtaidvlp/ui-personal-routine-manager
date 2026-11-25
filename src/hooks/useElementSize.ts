import { useCallback, useEffect, useState, type RefCallback } from 'react'

export type ElementSize = { width: number; height: number }

/** The rounded content size of an element, kept current with a ResizeObserver. Falls back to one measurement without it (jsdom). */
export function useElementSize<T extends HTMLElement>(): [RefCallback<T>, ElementSize] {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })
  const ref = useCallback((node: T | null) => setElement(node), [])

  useEffect(() => {
    if (!element) return
    const update = (width: number, height: number) =>
      setSize((prev) => {
        const next = { width: Math.round(width), height: Math.round(height) }
        return prev.width === next.width && prev.height === next.height ? prev : next
      })
    if (typeof ResizeObserver === 'undefined') {
      const rect = element.getBoundingClientRect()
      update(rect.width, rect.height)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry) update(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [ref, size]
}
