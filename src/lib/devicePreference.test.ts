import { afterEach, describe, expect, it, vi } from 'vitest'
import { BOARD_VIEWS, readDevicePreference, writeDevicePreference } from './devicePreference.ts'

function stubStorage(overrides: Partial<Storage> = {}) {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    ...overrides,
  }
  vi.stubGlobal('window', { localStorage: storage })
  return data
}

afterEach(() => vi.unstubAllGlobals())

describe('readDevicePreference', () => {
  it('reads an allowed value', () => {
    const data = stubStorage()
    data.set('k', 'radial')
    expect(readDevicePreference('k', BOARD_VIEWS, 'vertical')).toBe('radial')
  })

  it('falls back when missing', () => {
    stubStorage()
    expect(readDevicePreference('k', BOARD_VIEWS, 'vertical')).toBe('vertical')
  })

  it('falls back on an unknown value', () => {
    const data = stubStorage()
    data.set('k', 'spiral')
    expect(readDevicePreference('k', BOARD_VIEWS, 'vertical')).toBe('vertical')
  })

  it('falls back when getItem throws', () => {
    stubStorage({
      getItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(readDevicePreference('k', BOARD_VIEWS, 'vertical')).toBe('vertical')
  })

  it('falls back when there is no window', () => {
    expect(readDevicePreference('k', BOARD_VIEWS, 'vertical')).toBe('vertical')
  })
})

describe('writeDevicePreference', () => {
  it('round trips', () => {
    stubStorage()
    writeDevicePreference('k', 'radial')
    expect(readDevicePreference('k', BOARD_VIEWS, 'vertical')).toBe('radial')
  })

  it('does not throw when setItem throws', () => {
    stubStorage({
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    expect(() => writeDevicePreference('k', 'radial')).not.toThrow()
  })

  it('does not throw without a window', () => {
    expect(() => writeDevicePreference('k', 'radial')).not.toThrow()
  })
})
