import { describe, expect, it } from 'vitest'
import { formatDifference, formatMinutes } from './formatMinutes.ts'

describe('formatMinutes', () => {
  it('formats minutes and hours', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatMinutes(-90)).toBe('1h 30m')
  })

  it('formats the difference', () => {
    expect(formatDifference(60, 60)).toBe('same as planned')
    expect(formatDifference(90, 60)).toBe('+30m')
    expect(formatDifference(0, 60)).toBe('−1h')
  })
})
