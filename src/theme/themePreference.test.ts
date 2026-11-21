import { describe, expect, it } from 'vitest'
import {
  MIGRATED_KEY,
  THEME_KEY,
  readMigratedFlag,
  readThemePreference,
  resolveTheme,
  shouldMigrateDeviceTheme,
  writeMigratedFlag,
  writeThemePreference,
} from './themePreference.ts'

const storageWith = (value: string | null) => ({ getItem: (key: string) => (key === THEME_KEY ? value : null) })

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('readThemePreference', () => {
  it('reads light and dark', () => {
    expect(readThemePreference(storageWith('light'))).toBe('light')
    expect(readThemePreference(storageWith('dark'))).toBe('dark')
  })

  it('means "system" when missing, unexpected or unreadable', () => {
    expect(readThemePreference(storageWith(null))).toBe('system')
    expect(readThemePreference(storageWith('blue'))).toBe('system')
    expect(readThemePreference(storageWith('system'))).toBe('system')
    expect(readThemePreference(null)).toBe('system')
    expect(
      readThemePreference({
        getItem: () => {
          throw new Error('SecurityError')
        },
      }),
    ).toBe('system')
  })
})

describe('writeThemePreference', () => {
  it('stores light/dark and removes the key for system (boot script stays compatible)', () => {
    const storage = memoryStorage()
    writeThemePreference(storage, 'dark')
    expect(storage.data.get(THEME_KEY)).toBe('dark')
    writeThemePreference(storage, 'system')
    expect(storage.data.has(THEME_KEY)).toBe(false)
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
    expect(() => writeThemePreference(failing, 'system')).not.toThrow()
    expect(() => writeThemePreference(null, 'dark')).not.toThrow()
  })
})

describe('resolveTheme', () => {
  it('uses the choice, otherwise the device setting', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('migrated flag', () => {
  it('is absent until written', () => {
    const storage = memoryStorage()
    expect(readMigratedFlag(storage)).toBe(false)
    writeMigratedFlag(storage)
    expect(storage.data.get(MIGRATED_KEY)).toBe('1')
    expect(readMigratedFlag(storage)).toBe(true)
  })

  it('never throws', () => {
    expect(readMigratedFlag(null)).toBe(false)
    expect(() => writeMigratedFlag(null)).not.toThrow()
  })
})

describe('shouldMigrateDeviceTheme', () => {
  it('copies a pre-F006 light/dark choice once, only to an account without a theme', () => {
    expect(shouldMigrateDeviceTheme('dark', false, [])).toBe(true)
    expect(shouldMigrateDeviceTheme('light', false, ['boardZoom'])).toBe(true)
  })

  it('does not copy in any other case', () => {
    expect(shouldMigrateDeviceTheme('system', false, [])).toBe(false)
    expect(shouldMigrateDeviceTheme('dark', true, [])).toBe(false)
    expect(shouldMigrateDeviceTheme('dark', false, ['theme'])).toBe(false)
    expect(shouldMigrateDeviceTheme('light', true, ['theme'])).toBe(false)
  })
})
