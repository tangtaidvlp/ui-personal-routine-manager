import { describe, expect, it } from 'vitest'
import { formatDuration } from './radialFormat.ts'

describe('formatDuration', () => {
  it('formats minutes, whole hours, mixed and a full day', () => {
    expect(formatDuration(30)).toBe('30m')
    expect(formatDuration(59)).toBe('59m')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(90)).toBe('1h 30m')
    expect(formatDuration(480)).toBe('8h')
    expect(formatDuration(1440)).toBe('24h')
  })
})
