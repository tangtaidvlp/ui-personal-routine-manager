import { describe, expect, it } from 'vitest'
import { SIDEBAR_COLLAPSED_KEY, readSidebarCollapsed, writeSidebarCollapsed } from './sidebarPreference.ts'

const storageWith = (value: string | null) => ({ getItem: (key: string) => (key === SIDEBAR_COLLAPSED_KEY ? value : null) })

describe('readSidebarCollapsed', () => {
  it('reads "true" as collapsed', () => {
    expect(readSidebarCollapsed(storageWith('true'))).toBe(true)
  })

  it('reads "false" as expanded', () => {
    expect(readSidebarCollapsed(storageWith('false'))).toBe(false)
  })

  it('defaults to expanded when missing or unexpected', () => {
    expect(readSidebarCollapsed(storageWith(null))).toBe(false)
    expect(readSidebarCollapsed(storageWith('yes please'))).toBe(false)
  })

  it('defaults to expanded when storage is unavailable or throws', () => {
    expect(readSidebarCollapsed(null)).toBe(false)
    expect(readSidebarCollapsed(undefined)).toBe(false)
    expect(
      readSidebarCollapsed({
        getItem: () => {
          throw new Error('SecurityError')
        },
      }),
    ).toBe(false)
  })
})

describe('writeSidebarCollapsed', () => {
  it('stores "true" / "false"', () => {
    const written: Record<string, string> = {}
    const storage = { setItem: (key: string, value: string) => void (written[key] = value) }
    writeSidebarCollapsed(storage, true)
    expect(written[SIDEBAR_COLLAPSED_KEY]).toBe('true')
    writeSidebarCollapsed(storage, false)
    expect(written[SIDEBAR_COLLAPSED_KEY]).toBe('false')
  })

  it('ignores write failures and missing storage', () => {
    expect(() =>
      writeSidebarCollapsed(
        {
          setItem: () => {
            throw new Error('QuotaExceededError')
          },
        },
        true,
      ),
    ).not.toThrow()
    expect(() => writeSidebarCollapsed(null, true)).not.toThrow()
  })
})
