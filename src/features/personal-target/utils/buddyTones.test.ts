import { describe, expect, it } from 'vitest'
import { BUDDY_TONE_IDS, DEFAULT_BUDDY_TONE } from '../../settings/utils/settingsSchema.ts'
import { BUDDY_TONES, toneById } from './buddyTones.ts'

describe('BUDDY_TONES', () => {
  it('has one entry per tone id, in the same order', () => {
    expect(BUDDY_TONES.map((tone) => tone.id)).toEqual([...BUDDY_TONE_IDS])
  })

  it('marks only Balanced as the default', () => {
    expect(BUDDY_TONES.filter((tone) => tone.isDefault).map((tone) => tone.id)).toEqual([DEFAULT_BUDDY_TONE])
  })

  it('fills every field', () => {
    for (const tone of BUDDY_TONES) {
      expect(tone.name.trim()).not.toBe('')
      expect(tone.vibe.trim()).not.toBe('')
      expect(tone.bestFor.trim()).not.toBe('')
      expect(tone.example.trim()).not.toBe('')
    }
    expect(new Set(BUDDY_TONES.map((tone) => tone.name)).size).toBe(BUDDY_TONES.length)
  })

  it('finds a tone by id', () => {
    expect(toneById('WARM_ANCHOR').name).toBe('Warm Anchor')
  })
})
