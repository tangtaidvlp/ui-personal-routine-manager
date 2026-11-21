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
  it('starts at the current minute and ticks every minute while live', () => {
    const { result } = renderHook(() => useBoardClock())
    expect(result.current.currentTime).toBe(9 * 60 + 30)
    expect(result.current.isLive).toBe(true)
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(result.current.currentTime).toBe(9 * 60 + 31)
  })

  it('stops ticking when paused and keeps a slider position', () => {
    const { result } = renderHook(() => useBoardClock())
    act(() => {
      result.current.setIsLive(false)
      result.current.setCurrentTime(600)
    })
    act(() => {
      vi.advanceTimersByTime(180000)
    })
    expect(result.current.currentTime).toBe(600)
  })

  it('jumps back to now when resumed', () => {
    const { result } = renderHook(() => useBoardClock())
    act(() => {
      result.current.setIsLive(false)
      result.current.setCurrentTime(100)
    })
    act(() => result.current.setIsLive(true))
    expect(result.current.currentTime).toBe(9 * 60 + 30)
  })
})
