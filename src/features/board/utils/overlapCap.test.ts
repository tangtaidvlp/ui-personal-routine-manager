import { describe, expect, it } from 'vitest'
import { breaksOverlapCap } from './overlapCap.ts'
import type { TimedTask } from './dragPreview.ts'

const at = (id: string, start: number, duration: number): TimedTask => ({ id, start, duration })

describe('breaksOverlapCap', () => {
  it('allows 3 tasks at once', () => {
    const tasks = [at('a', 600, 60), at('b', 600, 60), at('c', 600, 60)]
    expect(breaksOverlapCap(tasks, new Set(['c']))).toBe(false)
  })

  it('refuses a 4th task at the same moment', () => {
    const tasks = [at('a', 600, 60), at('b', 600, 60), at('c', 600, 60), at('d', 630, 10)]
    expect(breaksOverlapCap(tasks, new Set(['d']))).toBe(true)
  })

  it('treats touching ends as no overlap', () => {
    const tasks = [at('a', 600, 60), at('b', 600, 60), at('c', 600, 60), at('d', 660, 60)]
    expect(breaksOverlapCap(tasks, new Set(['d']))).toBe(false)
  })

  it('counts an overnight task at 23:00 and at 05:00', () => {
    const night = at('n', 1320, 480) // 22:00 + 8h
    const others = [at('a', 300, 30), at('b', 300, 30), at('c', 300, 30)]
    expect(breaksOverlapCap([night, ...others], new Set(['n']))).toBe(true)
    const evening = [at('a', 1380, 30), at('b', 1380, 30), at('c', 1380, 30)]
    expect(breaksOverlapCap([night, ...evening], new Set(['c']))).toBe(true)
  })

  it('allows a long task over three short tasks at different times', () => {
    const tasks = [at('long', 0, 600), at('a', 60, 30), at('b', 120, 30), at('c', 180, 30)]
    expect(breaksOverlapCap(tasks, new Set(['long']))).toBe(false)
  })

  it('does not blame an unchanged cluster for a changed task elsewhere', () => {
    const cluster = [at('a', 600, 60), at('b', 600, 60), at('c', 600, 60), at('d', 600, 60)]
    expect(breaksOverlapCap([...cluster, at('e', 900, 30)], new Set(['e']))).toBe(false)
    expect(breaksOverlapCap(cluster, new Set(['d']))).toBe(true)
  })

  it('a 1440-minute task covers every minute', () => {
    const tasks = [at('day', 0, 1440), at('a', 700, 10), at('b', 700, 10), at('c', 700, 10)]
    expect(breaksOverlapCap(tasks, new Set(['c']))).toBe(true)
  })
})
