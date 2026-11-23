import { describe, expect, it } from 'vitest'
import { formatMinutesLeft, nowAndNext } from './nowAndNext.ts'

const at = (hh: number, mm = 0) => hh * 60 + mm

const day = [
  { name: 'Morning run', startTime: '07:00', endTime: '07:30' },
  { name: 'Design review', startTime: '10:00', endTime: '11:00' },
  { name: 'Emails & admin', startTime: '11:00:00', endTime: '12:00:00' },
]

describe('nowAndNext', () => {
  it('returns nothing for an empty day', () => {
    expect(nowAndNext([], at(9))).toEqual({ now: null, next: null })
  })

  it('before the first task: only next', () => {
    expect(nowAndNext(day, at(6))).toEqual({ now: null, next: { name: 'Morning run', startTime: '07:00' } })
  })

  it('inside a task: now with minutes left, and the next task', () => {
    expect(nowAndNext(day, at(10, 42))).toEqual({
      now: { name: 'Design review', minutesLeft: 18 },
      next: { name: 'Emails & admin', startTime: '11:00' },
    })
  })

  it('end time is exclusive', () => {
    expect(nowAndNext(day, at(11)).now?.name).toBe('Emails & admin')
  })

  it('overlapping tasks: the one that started last is now', () => {
    const overlap = [
      { name: 'Long block', startTime: '09:00', endTime: '12:00' },
      { name: 'Standup', startTime: '09:30', endTime: '09:45' },
    ]
    expect(nowAndNext(overlap, at(9, 35)).now).toEqual({ name: 'Standup', minutesLeft: 10 })
  })

  it('in a gap: no now, next task', () => {
    expect(nowAndNext(day, at(8))).toEqual({ now: null, next: { name: 'Design review', startTime: '10:00' } })
  })

  it('after the last task: nothing', () => {
    expect(nowAndNext(day, at(20))).toEqual({ now: null, next: null })
  })

  it('an end time of 00:00 means end of day', () => {
    const late = [{ name: 'Wind down', startTime: '22:00', endTime: '00:00' }]
    expect(nowAndNext(late, at(23, 30)).now).toEqual({ name: 'Wind down', minutesLeft: 30 })
  })

  it('an overnight task is now before and after midnight', () => {
    const sleep = [{ name: 'Sleep', startTime: '22:00', endTime: '06:00' }]
    expect(nowAndNext(sleep, at(23)).now).toEqual({ name: 'Sleep', minutesLeft: 420 })
    expect(nowAndNext(sleep, at(2)).now).toEqual({ name: 'Sleep', minutesLeft: 240 })
    expect(nowAndNext(sleep, at(7)).now).toBeNull()
  })

  it('ignores tasks without a valid start time', () => {
    const broken = [{ name: 'Broken', startTime: 'soon', endTime: '10:00' }, ...day]
    expect(nowAndNext(broken, at(6)).next?.name).toBe('Morning run')
  })
})

describe('formatMinutesLeft', () => {
  it('uses minutes under an hour', () => {
    expect(formatMinutesLeft(18)).toBe('18 min left')
  })

  it('uses hours and minutes from an hour', () => {
    expect(formatMinutesLeft(65)).toBe('1h 5m left')
    expect(formatMinutesLeft(120)).toBe('2h left')
  })
})
