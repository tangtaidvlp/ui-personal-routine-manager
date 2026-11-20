import { describe, expect, it } from 'vitest'
import { routineTypeForTab } from './routineTypeForTab.ts'

describe('routineTypeForTab', () => {
  it('maps the Weekday tab to the DAILY routine', () => {
    expect(routineTypeForTab('weekday')).toBe('DAILY')
  })

  it('maps the Weekend tab to the WEEKEND routine', () => {
    expect(routineTypeForTab('weekend')).toBe('WEEKEND')
  })
})
