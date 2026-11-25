import { describe, expect, it } from 'vitest'
import { labelEdgeX, layoutLabels } from './radialLabels.ts'

const SLOT = 40
const GAP = 4
const STEP = SLOT + GAP
const ring = 240
const cy = 300
const opts = { cy, ringRadius: ring, slotHeight: SLOT, gap: GAP, top: cy - ring - SLOT / 2, bottom: cy + ring + SLOT / 2 }
const angleOf = (minutes: number) => (minutes / 1440) * 360

function expectNoOverlap(labels: { side: string; y: number }[]) {
  for (const side of ['left', 'right']) {
    const ys = labels.filter((l) => l.side === side).map((l) => l.y).sort((a, b) => a - b)
    ys.slice(1).forEach((y, i) => expect(y - ys[i]).toBeGreaterThanOrEqual(STEP - 1e-6))
  }
}

describe('layoutLabels', () => {
  it('puts a label at the height of its angle on its own side', () => {
    const [threeOClock, nineOClock] = layoutLabels(
      [
        { id: 'a', angle: 90 },
        { id: 'b', angle: 270 },
      ],
      opts,
    )
    expect(threeOClock).toEqual({ id: 'a', side: 'right', y: cy - SLOT / 2 })
    expect(nineOClock.side).toBe('left')
    expect(nineOClock.y).toBeCloseTo(cy - SLOT / 2)
  })

  it('spreads a crowded morning both ways inside the ring range, without overlap', () => {
    const quick = Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, angle: angleOf(7 * 60 + i * 15 + 7) }))
    const spread = [60, 13 * 60, 18 * 60, 21 * 60, 23 * 60].map((m, i) => ({ id: `s${i}`, angle: angleOf(m) }))
    const labels = layoutLabels([...quick, ...spread], opts)
    expectNoOverlap(labels)
    for (const l of labels) {
      expect(l.y).toBeGreaterThanOrEqual(opts.top - 1e-6)
      expect(l.y + SLOT).toBeLessThanOrEqual(opts.bottom + 1e-6)
    }
    // The cluster straddles its ideal heights instead of only pushing downwards.
    const quickYs = labels.filter((l) => l.id.startsWith('q')).map((l) => l.y)
    const idealMid = cy - ring * Math.cos((angleOf(8 * 60) * Math.PI) / 180) - SLOT / 2
    expect(Math.min(...quickYs)).toBeLessThan(idealMid)
    expect(Math.max(...quickYs)).toBeGreaterThan(idealMid)
  })

  it('moves an overflow label to the other side only when it is near midnight or noon', () => {
    const small = { ...opts, top: cy - 100, bottom: cy + 100 } // capacity 4 per side
    const right = [60, 120, 180, 240].map((m, i) => ({ id: `r${i}`, angle: angleOf(m) }))
    const nearNoon = layoutLabels([...right, { id: 'noon', angle: 170 }], small)
    expect(nearNoon.find((l) => l.id === 'noon')?.side).toBe('left')
    const farFromSplit = layoutLabels([...right, { id: 'far', angle: 131 }], small)
    expect(farFromSplit.find((l) => l.id === 'far')?.side).toBe('right')
  })

  it('centres an overloaded column on the range and never overlaps', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `t${i}`, angle: angleOf(60 + i * 20) % 180 }))
    const labels = layoutLabels(many, opts)
    expectNoOverlap(labels)
    const right = labels.filter((l) => l.side === 'right').map((l) => l.y)
    const above = opts.top - Math.min(...right)
    const below = Math.max(...right) + SLOT - opts.bottom
    expect(above).toBeCloseTo(below)
  })
})

describe('labelEdgeX', () => {
  it('sits on the ring at 3 and 9 o’clock', () => {
    expect(labelEdgeX({ cx: 0, cy, ringRadius: ring, side: 'right', y: cy - SLOT / 2, slotHeight: SLOT })).toBe(ring)
    expect(labelEdgeX({ cx: 0, cy, ringRadius: ring, side: 'left', y: cy - SLOT / 2, slotHeight: SLOT })).toBe(-ring)
  })

  it('moves to the centre line near the top', () => {
    expect(labelEdgeX({ cx: 0, cy, ringRadius: ring, side: 'right', y: cy - ring - SLOT, slotHeight: SLOT })).toBeCloseTo(0)
  })

  it('keeps the box outside the ring', () => {
    for (let y = cy - ring; y < cy + ring; y += 17) {
      const x = labelEdgeX({ cx: 0, cy, ringRadius: ring, side: 'right', y, slotHeight: SLOT })
      const nearest = Math.min(Math.abs(y - cy), Math.abs(y + SLOT - cy))
      const d = y <= cy && cy <= y + SLOT ? 0 : nearest
      expect(x * x + d * d).toBeGreaterThanOrEqual(ring * ring - 1e-6)
    }
  })
})
