import { describe, expect, it } from 'vitest'
import { mayCrossMidnight } from './overnight.ts'

describe('mayCrossMidnight', () => {
  it('is always true with overnight tasks on', () => {
    expect(mayCrossMidnight(600, 60, true)).toBe(true)
  })

  it('with overnight tasks off, only a task that already crosses midnight may', () => {
    expect(mayCrossMidnight(1320, 480, false)).toBe(true) // 22:00 + 8h
    expect(mayCrossMidnight(1320, 120, false)).toBe(false) // ends exactly 24:00
    expect(mayCrossMidnight(600, 60, false)).toBe(false)
  })
})
