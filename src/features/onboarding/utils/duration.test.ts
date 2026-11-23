import { describe, expect, it } from 'vitest'
import { endsLabel, joinDuration, splitDuration } from './duration.ts'

describe('splitDuration', () => {
  it.each([
    [0, 0, 0],
    [30, 0, 30],
    [60, 1, 0],
    [95, 1, 35],
    [1440, 24, 0],
  ])('%i min → %i h %i min', (total, hours, minutes) => {
    expect(splitDuration(total)).toEqual({ hours, minutes })
  })

  it('treats negative and non-number input as 0 h 0 min', () => {
    expect(splitDuration(-15)).toEqual({ hours: 0, minutes: 0 })
    expect(splitDuration(Number.NaN)).toEqual({ hours: 0, minutes: 0 })
  })
})

describe('joinDuration', () => {
  it('adds hours and minutes', () => {
    expect(joinDuration(1, 30)).toBe(90)
    expect(joinDuration(24, 0)).toBe(1440)
  })

  it('accepts minutes above 59 as more time', () => {
    expect(joinDuration(0, 90)).toBe(90)
  })

  it('counts a non-number part as 0', () => {
    expect(joinDuration(Number.NaN, 45)).toBe(45)
    expect(joinDuration(2, Number.NaN)).toBe(120)
  })

  it('round-trips with splitDuration', () => {
    for (const total of [5, 59, 61, 125, 1439]) {
      const { hours, minutes } = splitDuration(total)
      expect(joinDuration(hours, minutes)).toBe(total)
    }
  })
})

describe('endsLabel', () => {
  it('shows the end time on the same day', () => {
    expect(endsLabel('09:00', 90)).toBe('Ends 10:30')
  })

  it('ending exactly at 24:00 is not the next day', () => {
    expect(endsLabel('23:00', 60)).toBe('Ends 00:00')
  })

  it('marks an overnight task as next day', () => {
    expect(endsLabel('22:00', 480)).toBe('Ends 06:00 (next day)')
  })

  it('returns null for a bad start or duration', () => {
    expect(endsLabel('', 30)).toBeNull()
    expect(endsLabel('09:00', 0)).toBeNull()
    expect(endsLabel('09:00', Number.NaN)).toBeNull()
  })
})
