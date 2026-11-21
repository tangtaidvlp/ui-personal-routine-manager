import { describe, expect, it } from 'vitest'
import { canReflect, isFutureDate } from './reflectionAvailability.ts'

describe('reflectionAvailability', () => {
  it('allows today and past days', () => {
    expect(canReflect('2026-11-21', '2026-11-21')).toBe(true)
    expect(canReflect('2026-11-20', '2026-11-21')).toBe(true)
    expect(canReflect('2025-12-31', '2026-01-01')).toBe(true)
  })

  it('blocks future days', () => {
    expect(isFutureDate('2026-11-22', '2026-11-21')).toBe(true)
    expect(canReflect('2027-01-01', '2026-12-31')).toBe(false)
  })
})
