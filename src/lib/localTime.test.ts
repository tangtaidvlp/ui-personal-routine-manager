import { describe, expect, it } from 'vitest'
import { currentLocalTime } from './localTime.ts'

describe('currentLocalTime', () => {
  it('formats the local clock as zero-padded 24-hour HH:mm', () => {
    expect(currentLocalTime(new Date(2026, 10, 24, 8, 5))).toBe('08:05')
    expect(currentLocalTime(new Date(2026, 10, 24, 0, 0))).toBe('00:00')
    expect(currentLocalTime(new Date(2026, 10, 24, 23, 59))).toBe('23:59')
  })
})
