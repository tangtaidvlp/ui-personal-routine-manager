import { describe, expect, it } from 'vitest'
import { routineTypeForDate, routineTypeLabel } from './routineTypeForDate.ts'

describe('routineTypeForDate', () => {
  // 16–22 Nov 2026 runs Monday → Sunday.
  it.each([
    [16, 'DAILY'],
    [17, 'DAILY'],
    [18, 'DAILY'],
    [19, 'DAILY'],
    [20, 'DAILY'],
    [21, 'WEEKEND'],
    [22, 'WEEKEND'],
  ] as const)('Nov %i 2026 → %s', (day, expected) => {
    expect(routineTypeForDate(new Date(2026, 10, day))).toBe(expected)
  })
})

describe('routineTypeLabel', () => {
  it('labels both routine types', () => {
    expect(routineTypeLabel('DAILY')).toBe('Weekday routine')
    expect(routineTypeLabel('WEEKEND')).toBe('Weekend routine')
  })
})
