import { describe, expect, it } from 'vitest'
import { previewPositions, type DragChange, type TimedTask } from './dragPreview.ts'

const tasks: TimedTask[] = [
  { id: 'a', start: 360, duration: 60 }, // 06:00
  { id: 'b', start: 480, duration: 60 }, // 08:00
  { id: 'c', start: 600, duration: 30 }, // 10:00
]

const move = (liveStart: number): DragChange => ({
  mode: 'move', taskId: 'b', originalStart: 480, originalDuration: 60, liveStart, liveDuration: 60,
})
const resize = (liveDuration: number): DragChange => ({
  mode: 'resize', taskId: 'b', originalStart: 480, originalDuration: 60, liveStart: 480, liveDuration,
})

describe('previewPositions', () => {
  it('moves only the dragged task when Push mode is off', () => {
    const result = previewPositions(tasks, move(540), false)
    expect([...result.keys()]).toEqual(['b'])
    expect(result.get('b')).toEqual({ start: 540, duration: 60 })
  })

  it('moving down pushes the tasks that start at or after it', () => {
    const result = previewPositions(tasks, move(540), true)
    expect(result.get('b')?.start).toBe(540)
    expect(result.get('c')?.start).toBe(660)
    expect(result.has('a')).toBe(false)
  })

  it('moving up pushes the tasks that start at or before it', () => {
    const result = previewPositions(tasks, move(420), true)
    expect(result.get('b')?.start).toBe(420)
    expect(result.get('a')?.start).toBe(300)
    expect(result.has('c')).toBe(false)
  })

  it('clamps a downward push at 23:55', () => {
    const result = previewPositions([...tasks, { id: 'd', start: 1400, duration: 30 }], move(1000), true)
    expect(result.get('d')?.start).toBe(1435)
    expect(result.get('b')?.start).toBe(480 + 35)
    expect(result.get('c')?.start).toBe(635)
  })

  it('clamps an upward push at 00:00', () => {
    const result = previewPositions(tasks, move(0), true)
    expect(result.get('a')?.start).toBe(0)
    expect(result.get('b')?.start).toBe(120)
  })

  it('clamps the dragged task alone at both bounds', () => {
    expect(previewPositions(tasks, move(2000), false).get('b')?.start).toBe(1435)
    expect(previewPositions(tasks, move(-50), false).get('b')?.start).toBe(0)
  })

  it('does not push anything when the task did not move', () => {
    expect(previewPositions(tasks, move(480), true).size).toBe(1)
  })

  it('making a task longer pushes the tasks after its old end', () => {
    const result = previewPositions(tasks, resize(90), true)
    expect(result.get('b')).toEqual({ start: 480, duration: 90 })
    expect(result.get('c')?.start).toBe(630)
    expect(result.has('a')).toBe(false)
  })

  it('making a task longer without Push mode moves nothing else', () => {
    const result = previewPositions(tasks, resize(90), false)
    expect([...result.keys()]).toEqual(['b'])
    expect(result.get('b')?.duration).toBe(90)
  })

  it('shrinking pushes nothing', () => {
    const result = previewPositions(tasks, resize(30), true)
    expect([...result.keys()]).toEqual(['b'])
    expect(result.get('b')?.duration).toBe(30)
  })

  it('a longer resize stops when a pushed task reaches 23:55', () => {
    const result = previewPositions([...tasks, { id: 'd', start: 1420, duration: 10 }], resize(200), true)
    expect(result.get('d')?.start).toBe(1435)
    expect(result.get('b')?.duration).toBe(75)
  })
})
