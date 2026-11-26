// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSelectedDate } from './useSelectedDate.ts'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 1, 10, 0))
})
afterEach(() => vi.useRealTimers())

describe('useSelectedDate', () => {
  it('starts on today', () => {
    const { result } = renderHook(() => useSelectedDate())
    expect(result.current).toMatchObject({ selectedDate: '2026-03-01', todayValue: '2026-03-01', isToday: true, isPast: false, isFuture: false })
  })

  it('shifts across a month boundary and derives past / future', () => {
    const { result } = renderHook(() => useSelectedDate())
    act(() => result.current.shift(-1))
    expect(result.current).toMatchObject({ selectedDate: '2026-02-28', isToday: false, isPast: true, isFuture: false })
    act(() => result.current.shift(2))
    expect(result.current).toMatchObject({ selectedDate: '2026-03-02', isPast: false, isFuture: true })
  })

  it('setDate picks a day and goToday returns', () => {
    const { result } = renderHook(() => useSelectedDate())
    act(() => result.current.setDate('2027-01-01'))
    expect(result.current.selectedDate).toBe('2027-01-01')
    act(() => result.current.goToday())
    expect(result.current.selectedDate).toBe('2026-03-01')
  })
})
