// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery.ts'

function fakeMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>()
  const list = {
    matches: initial,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  window.matchMedia = vi.fn().mockReturnValue(list) as unknown as typeof window.matchMedia
  return {
    set(next: boolean) {
      list.matches = next
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}

const original = window.matchMedia

afterEach(() => {
  window.matchMedia = original
})

describe('useMediaQuery', () => {
  it('reports the current match and follows changes', () => {
    const media = fakeMatchMedia(true)
    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(true)
    act(() => media.set(false))
    expect(result.current).toBe(false)
    unmount()
    expect(media.listeners.size).toBe(0)
  })

  it('is false when matchMedia is unavailable', () => {
    // @ts-expect-error simulate an environment without matchMedia
    window.matchMedia = undefined
    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(false)
  })
})
