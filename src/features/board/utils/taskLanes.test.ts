import { describe, expect, it } from 'vitest'
import { layoutLanes } from './taskLanes.ts'

describe('layoutLanes', () => {
  it('gives one lane when nothing overlaps (touching ends included)', () => {
    const result = layoutLanes([
      { key: 'a', start: 0, end: 60 },
      { key: 'b', start: 60, end: 120 },
    ])
    expect(result.get('a')).toEqual({ lane: 0, lanes: 1 })
    expect(result.get('b')).toEqual({ lane: 0, lanes: 1 })
  })

  it('splits 2 and 3 parallel blocks', () => {
    const two = layoutLanes([
      { key: 'a', start: 0, end: 60 },
      { key: 'b', start: 30, end: 90 },
    ])
    expect(two.get('a')).toEqual({ lane: 0, lanes: 2 })
    expect(two.get('b')).toEqual({ lane: 1, lanes: 2 })
    const three = layoutLanes([
      { key: 'a', start: 0, end: 60 },
      { key: 'b', start: 0, end: 60 },
      { key: 'c', start: 0, end: 60 },
    ])
    expect([...three.values()].map((l) => l.lane).sort()).toEqual([0, 1, 2])
    expect([...three.values()].every((l) => l.lanes === 3)).toBe(true)
  })

  it('reuses lane 0 in a chain where the ends do not touch', () => {
    const result = layoutLanes([
      { key: 'a', start: 0, end: 60 },
      { key: 'b', start: 30, end: 120 },
      { key: 'c', start: 90, end: 150 },
    ])
    expect(result.get('a')).toEqual({ lane: 0, lanes: 2 })
    expect(result.get('b')).toEqual({ lane: 1, lanes: 2 })
    expect(result.get('c')).toEqual({ lane: 0, lanes: 2 })
  })

  it('keeps separate clusters independent', () => {
    const result = layoutLanes([
      { key: 'a', start: 0, end: 60 },
      { key: 'b', start: 30, end: 90 },
      { key: 'c', start: 200, end: 260 },
    ])
    expect(result.get('c')).toEqual({ lane: 0, lanes: 1 })
    expect(result.get('a')?.lanes).toBe(2)
  })
})
