import { describe, expect, it } from 'vitest'
import { taskSegments } from './taskSegments.ts'

describe('taskSegments', () => {
  it('a normal task is one segment', () => {
    expect(taskSegments(600, 60)).toEqual([{ part: 'main', start: 600, end: 660 }])
  })

  it('a task ending exactly at 24:00 is one segment', () => {
    expect(taskSegments(1380, 60)).toEqual([{ part: 'main', start: 1380, end: 1440 }])
  })

  it('22:00 + 8h is two segments', () => {
    expect(taskSegments(1320, 480)).toEqual([
      { part: 'main', start: 1320, end: 1440 },
      { part: 'wrap', start: 0, end: 360 },
    ])
  })

  it('00:00 + 24h is one segment', () => {
    expect(taskSegments(0, 1440)).toEqual([{ part: 'main', start: 0, end: 1440 }])
  })

  it('06:00 + 24h is two segments', () => {
    expect(taskSegments(360, 1440)).toEqual([
      { part: 'main', start: 360, end: 1440 },
      { part: 'wrap', start: 0, end: 360 },
    ])
  })
})
