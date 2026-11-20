import { describe, expect, it } from 'vitest'
import { placeCard } from './placeCard.ts'

const viewport = { width: 1440, height: 900 }
const card = { width: 320, height: 140 }

describe('placeCard', () => {
  it('uses the preferred side when it fits, centered on the target', () => {
    // Weekday/Weekend switch in the top bar → card below it (mockup Tour 1).
    const target = { top: 32, left: 1080, width: 200, height: 46 }
    const result = placeCard({ target, card, viewport, side: 'bottom' })
    expect(result.side).toBe('bottom')
    expect(result.top).toBe(32 + 46 + 12)
    // centered on the target (1180) → left 1020
    expect(result.left).toBe(1180 - 160)
  })

  it('places a right-side card next to the target, vertically centered', () => {
    const target = { top: 300, left: 100, width: 400, height: 100 }
    const result = placeCard({ target, card, viewport, side: 'right' })
    expect(result.side).toBe('right')
    expect(result.left).toBe(100 + 400 + 12)
    expect(result.top).toBe(350 - 70)
  })

  it('flips to the opposite side when the preferred side overflows', () => {
    // + button near the bottom: "bottom" doesn't fit, "top" does.
    const target = { top: 800, left: 940, width: 56, height: 56 }
    const result = placeCard({ target, card, viewport, side: 'bottom' })
    expect(result.side).toBe('top')
    expect(result.top).toBe(800 - 12 - 140)
  })

  it('tries the other axis when both sides of the preferred axis overflow', () => {
    // A tall target filling the height: neither top nor bottom fits → right.
    const target = { top: 20, left: 100, width: 300, height: 860 }
    const result = placeCard({ target, card, viewport, side: 'top' })
    expect(result.side).toBe('right')
    expect(result.left).toBe(100 + 300 + 12)
  })

  it('falls back to center when nothing fits', () => {
    const target = { top: 0, left: 0, width: 1440, height: 900 }
    const result = placeCard({ target, card, viewport, side: 'right' })
    expect(result.side).toBe('center')
    expect(result.left).toBe((1440 - 320) / 2)
    expect(result.top).toBe((900 - 140) / 2)
  })

  it('centers the card when there is no target', () => {
    const result = placeCard({ target: null, card, viewport, side: 'bottom' })
    expect(result).toMatchObject({ side: 'center', left: 560, top: 380 })
  })

  it('clamps the card inside the viewport with a 16px margin', () => {
    // "Ready to roll" at the far right: a centered card would overflow on the right.
    const target = { top: 32, left: 1290, width: 120, height: 46 }
    const result = placeCard({ target, card, viewport, side: 'bottom' })
    expect(result.side).toBe('bottom')
    expect(result.left).toBe(1440 - 16 - 320)
  })

  it('points the arrow at the target center, even after clamping', () => {
    const target = { top: 32, left: 1290, width: 120, height: 46 }
    const result = placeCard({ target, card, viewport, side: 'bottom' })
    // target center x = 1350; card left = 1104 → arrow at 246 along the top edge
    expect(result.arrowOffset).toBe(1350 - 1104)
  })

  it('keeps the arrow off the rounded corners', () => {
    const target = { top: 32, left: 1420, width: 20, height: 20 }
    const result = placeCard({ target, card, viewport, side: 'bottom' })
    expect(result.arrowOffset).toBeLessThanOrEqual(320 - 20)
  })

  it('aligns a side card near the top of a tall target when align is "start" (mockups Tour 2 and 4)', () => {
    const target = { top: 97, left: 24, width: 940, height: 770 }
    const result = placeCard({ target, card, viewport, side: 'right', align: 'start' })
    expect(result.side).toBe('right')
    expect(result.top).toBe(97 + 48)
    expect(result.arrowOffset).toBe(28)
  })

  it('respects a custom gap', () => {
    const target = { top: 100, left: 600, width: 100, height: 40 }
    const result = placeCard({ target, card, viewport, side: 'bottom', gap: 20 })
    expect(result.top).toBe(160)
  })
})
