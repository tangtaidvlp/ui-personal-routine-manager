import { describe, expect, it } from 'vitest'
import { THEME_KEY, readThemePreference, resolveTheme, writeThemePreference } from './themePreference.ts'

const storageWith = (value: string | null) => ({ getItem: (key: string) => (key === THEME_KEY ? value : null) })

describe('readThemePreference', () => {
  it('reads light and dark', () => {
    expect(readThemePreference(storageWith('light'))).toBe('light')
    expect(readThemePreference(storageWith('dark'))).toBe('dark')
  })

  it('follows the device when missing, unexpected or unreadable', () => {
    expect(readThemePreference(storageWith(null))).toBeNull()
    expect(readThemePreference(storageWith('blue'))).toBeNull()
    expect(readThemePreference(null)).toBeNull()
    expect(
      readThemePreference({
        getItem: () => {
          throw new Error('SecurityError')
        },
      }),
    ).toBeNull()
  })
})

describe('writeThemePreference', () => {
  it('stores a choice and removes it for null', () => {
    const data = new Map<string, string>()
    const storage = {
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    }
    writeThemePreference(storage, 'dark')
    expect(data.get(THEME_KEY)).toBe('dark')
    writeThemePreference(storage, null)
    expect(data.has(THEME_KEY)).toBe(false)
  })

  it('never throws', () => {
    const failing = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(() => writeThemePreference(failing, 'light')).not.toThrow()
    expect(() => writeThemePreference(failing, null)).not.toThrow()
    expect(() => writeThemePreference(null, 'dark')).not.toThrow()
  })
})

describe('resolveTheme', () => {
  it('uses the choice, otherwise the device setting', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})
