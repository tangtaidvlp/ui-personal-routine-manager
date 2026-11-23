import { describe, expect, it } from 'vitest'
import { BUDDY_TONE_IDS, DEFAULT_SETTINGS, normalizeBuddyTone, normalizeSettings, normalizeZoom, themeFromApi, themeToApi, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './settingsSchema.ts'

describe('normalizeZoom', () => {
  it('keeps valid steps', () => {
    expect(normalizeZoom(1)).toBe(1)
    expect(normalizeZoom(1.25)).toBe(1.25)
    expect(normalizeZoom(3)).toBe(3)
  })

  it('clamps to the allowed range', () => {
    expect(normalizeZoom(0.1)).toBe(ZOOM_MIN)
    expect(normalizeZoom(9)).toBe(ZOOM_MAX)
  })

  it('rounds to the nearest step', () => {
    expect(normalizeZoom(1.1)).toBe(1)
    expect(normalizeZoom(1.13)).toBe(1.25)
    expect(ZOOM_STEP).toBe(0.25)
  })

  it('treats unreadable values as 100%', () => {
    expect(normalizeZoom(Number.NaN)).toBe(1)
    expect(normalizeZoom(null)).toBe(1)
    expect(normalizeZoom('1.5')).toBe(1)
    expect(normalizeZoom(undefined)).toBe(1)
  })
})

describe('theme mapping', () => {
  it('round-trips every preference', () => {
    for (const preference of ['light', 'dark', 'system'] as const) {
      expect(themeFromApi(themeToApi(preference))).toBe(preference)
    }
    expect(themeToApi('dark')).toBe('DARK')
  })

  it('reads API values case-insensitively and defaults unknown ones to system', () => {
    expect(themeFromApi('light')).toBe('light')
    expect(themeFromApi('BLUE')).toBe('system')
    expect(themeFromApi(undefined)).toBe('system')
  })
})

describe('normalizeSettings', () => {
  it('fills missing keys with defaults', () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('maps API values and ignores unknown keys', () => {
    const result = normalizeSettings({ theme: 'DARK', boardZoom: 1.5, fontSize: 14 })
    expect(result).toEqual({ theme: 'dark', boardZoom: 1.5, buddyTone: 'BALANCED' })
    expect(result).not.toHaveProperty('fontSize')
  })

  it('falls back per key on bad values', () => {
    expect(normalizeSettings({ boardZoom: 'banana', theme: 'LIGHT' })).toEqual({ theme: 'light', boardZoom: 1, buddyTone: 'BALANCED' })
  })

  it('default settings are System and 100%', () => {
    expect(DEFAULT_SETTINGS).toEqual({ theme: 'system', boardZoom: 1, buddyTone: 'BALANCED' })
  })
})

describe('normalizeBuddyTone (F014)', () => {
  it('keeps every known tone, in any case', () => {
    for (const id of BUDDY_TONE_IDS) {
      expect(normalizeBuddyTone(id)).toBe(id)
    }
    expect(normalizeBuddyTone(' warm_anchor ')).toBe('WARM_ANCHOR')
  })

  it('falls back to Balanced for anything else', () => {
    for (const raw of ['ROBOT', '', null, undefined, 3, {}]) {
      expect(normalizeBuddyTone(raw)).toBe('BALANCED')
    }
  })

  it('is read from the settings payload', () => {
    expect(normalizeSettings({ buddyTone: 'STOIC' }).buddyTone).toBe('STOIC')
    expect(normalizeSettings({ buddyTone: 'nope' }).buddyTone).toBe('BALANCED')
  })
})
