// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSyncedScroll } from './useSyncedScroll.ts'

function box() {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return element
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('useSyncedScroll', () => {
  it('copies the scroll position to the other elements', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSyncedScroll())
    const plan = box()
    const reality = box()
    result.current(plan)
    result.current(reality)

    plan.scrollTop = 240
    plan.dispatchEvent(new Event('scroll'))
    expect(reality.scrollTop).toBe(240)

    vi.runAllTimers()
    reality.scrollTop = 80
    reality.dispatchEvent(new Event('scroll'))
    expect(plan.scrollTop).toBe(80)
  })

  it('a late echo does not pull the scrolling board back (F009)', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSyncedScroll())
    const plan = box()
    const reality = box()
    result.current(plan)
    result.current(reality)

    plan.scrollTop = 240
    plan.dispatchEvent(new Event('scroll'))
    expect(reality.scrollTop).toBe(240)

    // The plan keeps coasting; reality's echo of 240 arrives after the next frame.
    plan.scrollTop = 300
    vi.runAllTimers()
    reality.dispatchEvent(new Event('scroll'))
    expect(plan.scrollTop).toBe(300)
  })

  it('lets the user take over on the other board right away (F009)', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSyncedScroll())
    const plan = box()
    const reality = box()
    result.current(plan)
    result.current(reality)

    plan.scrollTop = 240
    plan.dispatchEvent(new Event('scroll'))
    reality.scrollTop = 100
    reality.dispatchEvent(new Event('scroll'))
    expect(plan.scrollTop).toBe(100)
  })

  it('starts a newly registered element at the current position', () => {
    const { result } = renderHook(() => useSyncedScroll())
    const plan = box()
    result.current(plan)
    plan.scrollTop = 120
    const reality = box()
    result.current(reality)
    expect(reality.scrollTop).toBe(120)
  })

  it('stops syncing removed elements', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useSyncedScroll())
    const plan = box()
    const reality = box()
    result.current(plan)
    result.current(reality)
    reality.remove()
    result.current(null)

    plan.scrollTop = 300
    plan.dispatchEvent(new Event('scroll'))
    expect(reality.scrollTop).toBe(0)
  })
})
