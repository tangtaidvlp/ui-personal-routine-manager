import { describe, expect, it } from 'vitest'
import { minutesForScrollTop, scrollTopForMinutes, SETUP_SCROLL_ANCHOR_MINUTES } from './boardScroll.ts'

describe('scrollTopForMinutes', () => {
  it('puts 06:00 at the top of a 2400 px board', () => {
    expect(scrollTopForMinutes(SETUP_SCROLL_ANCHOR_MINUTES, 2400)).toBe(600)
  })

  it('returns 0 for midnight', () => {
    expect(scrollTopForMinutes(0, 2400)).toBe(0)
  })

  it('never goes below 0', () => {
    expect(scrollTopForMinutes(60, 2400, 260)).toBe(0)
  })

  it('scales with the board height', () => {
    expect(scrollTopForMinutes(1440, 4800)).toBe(4800)
  })

  it('subtracts the offset', () => {
    expect(scrollTopForMinutes(720, 2400, 260)).toBe(940)
  })
})

describe('minutesForScrollTop', () => {
  it('reads the time at the top of the view', () => {
    expect(minutesForScrollTop(600, 2400)).toBe(360)
  })

  it('round-trips through a zoom change', () => {
    const minutes = minutesForScrollTop(1200, 2400) // 12:00
    expect(scrollTopForMinutes(minutes, 4800)).toBe(2400)
  })
})
