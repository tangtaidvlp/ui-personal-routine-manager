import { describe, expect, it } from 'vitest'
import { formatTimeOfDay, nextDefaultDraftTask, parseDateInputValue, toDateInputValue } from './dateInput.ts'

describe('toDateInputValue / parseDateInputValue', () => {
  it('pads month and day', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('round-trips, including a leap day and the year end', () => {
    for (const value of ['2028-02-29', '2026-12-31', '2026-01-01']) {
      expect(toDateInputValue(parseDateInputValue(value))).toBe(value)
    }
  })

  it('parses to local midnight', () => {
    const date = parseDateInputValue('2026-03-08')
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 8, 0])
  })

  it('moves across a month boundary with setDate', () => {
    const date = parseDateInputValue('2026-01-31')
    date.setDate(date.getDate() + 1)
    expect(toDateInputValue(date)).toBe('2026-02-01')
  })
})

describe('formatTimeOfDay', () => {
  it('formats HH:mm', () => {
    expect(formatTimeOfDay(0)).toBe('00:00')
    expect(formatTimeOfDay(90)).toBe('01:30')
    expect(formatTimeOfDay(1410)).toBe('23:30')
  })
})

describe('nextDefaultDraftTask', () => {
  const at = (h: number, m: number) => nextDefaultDraftTask(new Date(2026, 5, 1, h, m))

  it('rounds up to the next half hour', () => {
    expect(at(10, 1).startTime).toBe('10:30')
    expect(at(10, 31).startTime).toBe('11:00')
  })

  it('keeps an exact half hour', () => {
    expect(at(9, 30).startTime).toBe('09:30')
    expect(at(0, 0).startTime).toBe('00:00')
  })

  it('never goes past 23:30', () => {
    expect(at(23, 45).startTime).toBe('23:30')
    expect(at(23, 59).startTime).toBe('23:30')
  })

  it('is a blank 30-minute task', () => {
    expect(at(8, 0)).toEqual({ name: '', startTime: '08:00', durationMinutes: 30 })
  })
})
