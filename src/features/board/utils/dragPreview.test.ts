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
    const result = previewPositions([...tasks, { id: 'd', start: 1400, duration: 30 }], move(540), true)
    expect(result.get('d')?.start).toBe(1435)
    expect(result.get('b')?.start).toBe(480 + 35)
    expect(result.get('c')?.start).toBe(635)
  })

  it('clamps an upward push at 00:00', () => {
    // a starts with b (not passed when moving up), so it is pushed and the shift stops at 00:00
    const result = previewPositions([{ id: 'a', start: 480, duration: 60 }, tasks[1], tasks[2]], move(0), true)
    expect(result.get('a')?.start).toBe(0)
    expect(result.get('b')?.start).toBe(0)
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

  describe('Push mode swap', () => {
    // d: 09:00-10:00 dragged; p: 10:30-11:00; q: 11:30-12:00
    const swapTasks: TimedTask[] = [
      { id: 'd', start: 540, duration: 60 },
      { id: 'p', start: 630, duration: 30 },
      { id: 'q', start: 690, duration: 30 },
    ]
    const drag = (liveStart: number): DragChange => ({
      mode: 'move', taskId: 'd', originalStart: 540, originalDuration: 60, liveStart, liveDuration: 60,
    })

    it('swaps with a passed task below and keeps the gap', () => {
      const result = previewPositions(swapTasks, drag(600), true) // live end 11:00 >= midpoint 10:45
      expect(result.get('p')).toEqual({ start: 540, duration: 30 })
      expect(result.get('d')).toEqual({ start: 600, duration: 60 })
      expect(result.has('q')).toBe(false)
    })

    it('swaps with a passed task above', () => {
      const up: TimedTask[] = [
        { id: 'p', start: 480, duration: 30 }, // 08:00-08:30, midpoint 08:15
        { id: 'd', start: 540, duration: 60 },
      ]
      const result = previewPositions(up, { ...drag(480), originalStart: 540 }, true)
      expect(result.get('p')).toEqual({ start: 570, duration: 30 }) // ends where D ended before: 10:00 - 30
      expect(result.get('d')).toEqual({ start: 480, duration: 60 })
    })

    it('still pushes before the midpoint is passed', () => {
      const result = previewPositions(swapTasks, drag(584), true) // live end 10:44 < 10:45
      expect(result.get('d')?.start).toBe(584)
      expect(result.get('p')?.start).toBe(674)
      expect(result.get('q')?.start).toBe(734)
    })

    it('swaps when exactly half is passed', () => {
      const result = previewPositions(swapTasks, drag(585), true) // live end 10:45 == midpoint
      expect(result.get('p')?.start).toBe(540)
      expect(result.get('d')?.start).toBe(660 - 60)
    })

    it('swaps successively with two passed tasks', () => {
      const result = previewPositions(swapTasks, drag(660), true) // live end 12:00
      expect(result.get('p')).toEqual({ start: 540, duration: 30 })
      expect(result.get('q')).toEqual({ start: 600, duration: 30 })
      expect(result.get('d')).toEqual({ start: 660, duration: 60 })
    })

    it('does not swap when Push mode is off', () => {
      const result = previewPositions(swapTasks, drag(600), false)
      expect([...result.keys()]).toEqual(['d'])
    })
  })

  describe('Overlay-off dragged task (F017)', () => {
    // d: 09:00-10:00 dragged; p: 10:30-11:00; q: 11:30-12:00; u: 07:00-08:00 (above)
    const off = (extra: TimedTask[] = []): TimedTask[] => [
      { id: 'd', start: 540, duration: 60, overlay: false },
      { id: 'p', start: 630, duration: 30 },
      { id: 'q', start: 690, duration: 30 },
      { id: 'u', start: 420, duration: 60 },
      ...extra,
    ]
    const drag = (liveStart: number): DragChange => ({
      mode: 'move', taskId: 'd', originalStart: 540, originalDuration: 60, liveStart, liveDuration: 60,
    })

    for (const pushMode of [false, true]) {
      const label = pushMode ? 'Push mode' : 'Normal mode'

      it(`${label}: swaps down with a passed task and keeps the gap`, () => {
        const result = previewPositions(off(), drag(600), pushMode)
        expect(result.get('p')).toEqual({ start: 540, duration: 30 })
        expect(result.get('d')).toEqual({ start: 600, duration: 60 })
        expect(result.has('q')).toBe(false)
      })

      it(`${label}: swaps up with a passed task`, () => {
        const result = previewPositions(off(), { ...drag(450), originalStart: 540 }, pushMode) // live 07:30, u midpoint 07:30
        expect(result.get('u')).toEqual({ start: 540, duration: 60 })
        expect(result.get('d')).toEqual({ start: 420, duration: 60 })
      })

      it(`${label}: swaps successively with several passed tasks`, () => {
        const result = previewPositions(off(), drag(660), pushMode)
        expect(result.get('p')).toEqual({ start: 540, duration: 30 })
        expect(result.get('q')).toEqual({ start: 600, duration: 30 })
        expect(result.get('d')).toEqual({ start: 660, duration: 60 })
      })

      it(`${label}: never pushes; less than half snaps down against the neighbour's start`, () => {
        const result = previewPositions(off(), drag(584), pushMode) // end 10:44 overlaps p, below its midpoint
        expect([...result.keys()]).toEqual(['d'])
        expect(result.get('d')).toEqual({ start: 570, duration: 60 }) // end = 10:30
      })

      it(`${label}: less than half snaps up against the neighbour's end`, () => {
        const result = previewPositions(off(), drag(470), pushMode) // 07:50 overlaps u (ends 08:00)
        expect([...result.keys()]).toEqual(['d'])
        expect(result.get('d')).toEqual({ start: 480, duration: 60 }) // start = 08:00
      })

      it(`${label}: a pre-existing overlap is ignored`, () => {
        const tasksWithOverlap: TimedTask[] = [
          { id: 'd', start: 540, duration: 60, overlay: false },
          { id: 'o', start: 560, duration: 30 }, // already overlaps d at its original slot
        ]
        const result = previewPositions(tasksWithOverlap, drag(550), pushMode)
        expect(result.get('d')).toEqual({ start: 550, duration: 60 })
      })
    }

    it('free movement is kept when nothing is touched', () => {
      expect(previewPositions(off(), drag(500), false).get('d')).toEqual({ start: 500, duration: 60 })
    })

    it('Overlay-on and missing overlay keep the T002 behaviour', () => {
      const on = off().map((t) => (t.id === 'd' ? { ...t, overlay: true } : t))
      const none = off().map((t) => ({ id: t.id, start: t.start, duration: t.duration }))
      expect(previewPositions(on, drag(584), false).get('d')).toEqual({ start: 584, duration: 60 })
      expect(previewPositions(none, drag(584), true).get('p')?.start).toBe(674)
      expect(previewPositions(on, drag(600), false).size).toBe(1)
    })

    describe('resize', () => {
      const resizeD = (liveDuration: number): DragChange => ({
        mode: 'resize', taskId: 'd', originalStart: 540, originalDuration: 60, liveStart: 540, liveDuration,
      })

      it('Normal mode clamps the end to the start of the next task', () => {
        const result = previewPositions(off(), resizeD(180), false)
        expect([...result.keys()]).toEqual(['d'])
        expect(result.get('d')).toEqual({ start: 540, duration: 90 }) // ends 10:30
      })

      it('Normal mode does not clamp a shorter or free resize', () => {
        expect(previewPositions(off(), resizeD(30), false).get('d')?.duration).toBe(30)
        expect(previewPositions(off(), resizeD(80), false).get('d')?.duration).toBe(80)
      })

      it('Normal mode without a later task is free', () => {
        const alone: TimedTask[] = [{ id: 'd', start: 540, duration: 60, overlay: false }, { id: 'u', start: 420, duration: 60 }]
        expect(previewPositions(alone, resizeD(300), false).get('d')?.duration).toBe(300)
      })

      it('Push mode pushes as before', () => {
        const result = previewPositions(off(), resizeD(90), true)
        expect(result.get('d')?.duration).toBe(90)
        expect(result.get('p')?.start).toBe(660)
      })

      it('Overlay-on resize in Normal mode is not clamped', () => {
        const on = off().map((t) => (t.id === 'd' ? { ...t, overlay: true } : t))
        expect(previewPositions(on, resizeD(180), false).get('d')?.duration).toBe(180)
      })
    })
  })
})
