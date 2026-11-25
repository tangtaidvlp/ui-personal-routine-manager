import { describe, expect, it } from 'vitest'
import { angleAt, angleDelta, arcPath, assignLanes, findNowAndNext, laneBand, minutesToAngle, parseStartMinutes, pointAt } from './radialGeometry.ts'

describe('parseStartMinutes', () => {
  it('accepts H:mm, HH:mm and HH:mm:ss', () => {
    expect(parseStartMinutes('7:05')).toBe(425)
    expect(parseStartMinutes('07:05:00')).toBe(425)
    expect(parseStartMinutes('23:59')).toBe(1439)
    expect(parseStartMinutes('00:00')).toBe(0)
  })

  it('rejects out-of-range and malformed values', () => {
    expect(parseStartMinutes('24:00')).toBeNull()
    expect(parseStartMinutes('10:60')).toBeNull()
    expect(parseStartMinutes('')).toBeNull()
    expect(parseStartMinutes('ab')).toBeNull()
  })
})

describe('minutesToAngle / pointAt', () => {
  it('maps minutes to degrees from the top, clockwise', () => {
    expect(minutesToAngle(0)).toBe(0)
    expect(minutesToAngle(360)).toBe(90)
    expect(minutesToAngle(720)).toBe(180)
    expect(minutesToAngle(1440)).toBe(0)
    expect(minutesToAngle(2160)).toBe(180)
    expect(minutesToAngle(-360)).toBe(270)
  })

  it('puts 0° at the top and 90° on the right', () => {
    const top = pointAt(100, 100, 50, 0)
    expect(top.x).toBeCloseTo(100)
    expect(top.y).toBeCloseTo(50)
    const right = pointAt(100, 100, 50, 90)
    expect(right.x).toBeCloseTo(150)
    expect(right.y).toBeCloseTo(100)
  })
})

describe('assignLanes', () => {
  it('uses one lane when nothing overlaps', () => {
    const { lanes, laneCount } = assignLanes([
      { id: 'a', start: 0, duration: 60 },
      { id: 'b', start: 120, duration: 60 },
    ])
    expect(laneCount).toBe(1)
    expect(lanes.get('a')).toBe(0)
    expect(lanes.get('b')).toBe(0)
  })

  it('uses two lanes for two overlapping tasks', () => {
    const { lanes, laneCount } = assignLanes([
      { id: 'a', start: 60, duration: 120 },
      { id: 'b', start: 90, duration: 60 },
    ])
    expect(laneCount).toBe(2)
    expect(lanes.get('a')).toBe(0)
    expect(lanes.get('b')).toBe(1)
  })

  it('does not count touching ends as overlap', () => {
    const { laneCount } = assignLanes([
      { id: 'a', start: 60, duration: 60 },
      { id: 'b', start: 120, duration: 60 },
    ])
    expect(laneCount).toBe(1)
  })

  it('sees an overnight task overlap an early-morning one', () => {
    const { lanes, laneCount } = assignLanes([
      { id: 'night', start: 23 * 60, duration: 480 },
      { id: 'early', start: 6 * 60, duration: 60 },
    ])
    expect(laneCount).toBe(2)
    expect(lanes.get('early')).toBe(0)
    expect(lanes.get('night')).toBe(1)
  })

  it('keeps an overnight task and a later morning task in one lane', () => {
    const { laneCount } = assignLanes([
      { id: 'night', start: 23 * 60, duration: 480 },
      { id: 'morning', start: 8 * 60, duration: 60 },
    ])
    expect(laneCount).toBe(1)
  })

  it('reports one lane for no tasks', () => {
    expect(assignLanes([])).toEqual({ lanes: new Map(), laneCount: 1 })
  })
})

describe('laneBand', () => {
  it('fills inner..outer with one lane', () => {
    expect(laneBand(0, 1, 0, 100)).toEqual({ inner: 0, outer: 100 })
    expect(laneBand(0, 1, 10, 100)).toEqual({ inner: 10, outer: 100 })
  })

  it('splits two lanes, lane 0 outermost', () => {
    expect(laneBand(0, 2, 0, 100)).toEqual({ inner: 50, outer: 100 })
    expect(laneBand(1, 2, 0, 100)).toEqual({ inner: 0, outer: 50 })
    expect(laneBand(1, 2, 20, 100)).toEqual({ inner: 20, outer: 60 })
  })
})

describe('arcPath', () => {
  it('draws an open clockwise arc from start to end on the given radius', () => {
    // 90° sweep from 12 o'clock on r=10 around (50,50): (50,40) → (60,50), small arc, clockwise
    expect(arcPath(50, 50, 10, 0, 90)).toBe('M 50 40 A 10 10 0 0 1 60 50')
  })

  it('uses the large-arc flag past 180° and draws a full circle at 360°', () => {
    expect(arcPath(50, 50, 10, 0, 270)).toContain(' 0 1 1 ')
    expect(arcPath(50, 50, 10, 0, 360).match(/A /g)).toHaveLength(2)
  })

  it('is empty for a zero sweep', () => {
    expect(arcPath(50, 50, 10, 0, 0)).toBe('')
  })
})

describe('findNowAndNext', () => {
  const sleep = { id: 's', start: 23 * 60, duration: 8 * 60 }
  const work = { id: 'w', start: 9 * 60, duration: 120 }
  const lunch = { id: 'l', start: 12 * 60, duration: 60 }

  it('finds the running task, minutes left and the next task', () => {
    const result = findNowAndNext([sleep, work, lunch], 10 * 60)
    expect(result.current).toBe(work)
    expect(result.minutesLeft).toBe(60)
    expect(result.next).toBe(lunch)
  })

  it('counts an overnight task after midnight and wraps "next" to tomorrow', () => {
    expect(findNowAndNext([sleep, work], 2 * 60)).toMatchObject({ current: sleep, minutesLeft: 300, next: work })
    expect(findNowAndNext([work], 22 * 60)).toMatchObject({ current: null, next: work })
  })

  it('prefers the task that started last when tasks overlap', () => {
    const call = { id: 'c', start: 9 * 60 + 30, duration: 15 }
    expect(findNowAndNext([work, call], 9 * 60 + 40).current).toBe(call)
  })

  it('treats the end time as free (end is exclusive) and handles no tasks', () => {
    expect(findNowAndNext([lunch], 13 * 60).current).toBeNull()
    expect(findNowAndNext([], 0)).toEqual({ current: null, minutesLeft: 0, next: null })
  })
})

describe('angleAt / angleDelta', () => {
  it('measures clockwise from the top', () => {
    expect(angleAt(0, 0, 0, -10)).toBe(0)
    expect(angleAt(0, 0, 10, 0)).toBe(90)
    expect(angleAt(0, 0, 0, 10)).toBe(180)
    expect(angleAt(0, 0, -10, 0)).toBe(270)
  })

  it('takes the short way round, across midnight too', () => {
    expect(angleDelta(10, 40)).toBe(30)
    expect(angleDelta(40, 10)).toBe(-30)
    expect(angleDelta(350, 10)).toBe(20)
    expect(angleDelta(10, 350)).toBe(-20)
  })
})
