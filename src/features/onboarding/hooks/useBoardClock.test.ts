// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBoardClock } from './useBoardClock.ts'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 22, 9, 30))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useBoardClock', () => {
  it('starts at the current minute and ticks every minute', () => {
    const { result } = renderHook(() => useBoardClock())
    expect(result.current.currentTime).toBe(9 * 60 + 30)
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(result.current.currentTime).toBe(9 * 60 + 31)
  })

  it('shows the real time at once when the tab becomes visible again (F010)', () => {
    const { result } = renderHook(() => useBoardClock())
    // Timers don't run while the computer sleeps: only the system time moves on.
    vi.setSystemTime(new Date(2026, 10, 22, 11, 5, 20))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current.currentTime).toBe(11 * 60 + 5)
  })

  it('does not tick when disabled (setup board)', () => {
    const { result } = renderHook(() => useBoardClock(false))
    act(() => {
      vi.advanceTimersByTime(180000)
    })
    expect(result.current.currentTime).toBe(9 * 60 + 30)
  })
})
