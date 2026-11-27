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

  it('moving up with Push-up on pushes the tasks above and brings the ones below', () => {
    const result = previewPositions(tasks, move(420), true, { pushUp: true })
    expect(result.get('b')?.start).toBe(420)
    expect(result.get('a')?.start).toBe(300)
    expect(result.get('c')?.start).toBe(540)
  })

  it('a downward push stops each task at the day end and closes the gaps above it (overnight tasks on: 23:55)', () => {
    const result = previewPositions([...tasks, { id: 'd', start: 1400, duration: 30 }], move(540), true, { overnight: true })
    expect(result.get('d')?.start).toBe(1435)
    expect(result.get('b')?.start).toBe(540)
    expect(result.get('c')?.start).toBe(660)
  })

  it('overnight tasks off (the default): the last task stops at 24:00 and the others keep moving', () => {
    const result = previewPositions([...tasks, { id: 'd', start: 1400, duration: 30 }], move(540), true)
    expect(result.get('d')?.start).toBe(1410) // ends 24:00
    expect(result.get('b')?.start).toBe(540)
    expect(result.get('c')?.start).toBe(660)
  })

  describe('pushing down near 24:00 (F017)', () => {
    // A 20:00-21:00 dragged, B 22:00-23:00
    const evening: TimedTask[] = [
      { id: 'A', start: 1200, duration: 60 },
      { id: 'B', start: 1320, duration: 60 },
    ]
    const dragA = (liveStart: number): DragChange => ({
      mode: 'move', taskId: 'A', originalStart: 1200, originalDuration: 60, liveStart, liveDuration: 60,
    })

    it('uses the space at the bottom first, then closes the gap above', () => {
      const result = previewPositions(evening, dragA(1290), true) // 90 min down
      expect(result.get('B')?.start).toBe(1380) // 23:00-24:00
      expect(result.get('A')?.start).toBe(1290) // 21:30-22:30, gap 60 → 30
    })

    it('stops when no gap is left', () => {
      const result = previewPositions(evening, dragA(1400), true)
      expect(result.get('B')?.start).toBe(1380)
      expect(result.get('A')?.start).toBe(1320) // touches B
    })

    it('overlapping tasks move as one block and keep their overlap', () => {
      // Gym 21:00-22:00 dragged, Reading 21:30-22:30 (overlaps Gym), Dinner 23:00-23:30
      const withOverlap: TimedTask[] = [
        { id: 'gym', start: 1260, duration: 60 },
        { id: 'reading', start: 1290, duration: 60, overlay: true },
        { id: 'dinner', start: 1380, duration: 30 },
      ]
      const dragGym: DragChange = { mode: 'move', taskId: 'gym', originalStart: 1260, originalDuration: 60, liveStart: 1350, liveDuration: 60 }
      const result = previewPositions(withOverlap, dragGym, true)
      expect(result.get('dinner')?.start).toBe(1410)
      expect(result.get('gym')?.start).toBe(1320)
      expect(result.get('reading')?.start).toBe(1350) // still 30 min after Gym; block ends at Dinner's start
    })

    it('a longer resize closes the gaps the same way', () => {
      const resizeA: DragChange = { mode: 'resize', taskId: 'A', originalStart: 1200, originalDuration: 60, liveStart: 1200, liveDuration: 240 }
      const result = previewPositions(evening, resizeA, true)
      expect(result.get('B')?.start).toBe(1380)
      expect(result.get('A')?.duration).toBe(180) // ends at B's start, 23:00
    })
  })

  it('overnight tasks off: an existing overnight task is still pushed past midnight', () => {
    const result = previewPositions([...tasks, { id: 's', start: 1320, duration: 480 }], move(540), true)
    expect(result.get('s')?.start).toBe(1380)
  })

  it('Push-up off (the default): moving up brings the tasks below along, not the ones above', () => {
    const up = previewPositions(tasks, move(420), true)
    expect(up.get('b')?.start).toBe(420)
    expect(up.get('c')?.start).toBe(540)
    expect(up.has('a')).toBe(false)
    expect(previewPositions(tasks, move(540), true).get('c')?.start).toBe(660)
  })

  it('Push-up off: an Overlay-off task moving up stops at the end of the task above; the tasks below stop too', () => {
    const offTasks = tasks.map((t) => (t.id === 'b' ? { ...t, overlay: false } : t))
    const result = previewPositions(offTasks, move(300), true) // a ends at 07:00
    expect(result.get('b')?.start).toBe(420)
    expect(result.get('c')?.start).toBe(540)
    expect(result.has('a')).toBe(false)
  })

  it('Push-up off: an Overlay-on task moving up may overlap the task above', () => {
    expect(previewPositions(tasks, move(300), true).get('b')?.start).toBe(300)
  })

  it('clamps an upward push at 00:00 (Push-up on)', () => {
    // a starts with b (not passed when moving up), so it is pushed and the shift stops at 00:00
    const result = previewPositions([{ id: 'a', start: 480, duration: 60 }, tasks[1], tasks[2]], move(0), true, { pushUp: true })
    expect(result.get('a')?.start).toBe(0)
    expect(result.get('b')?.start).toBe(0)
  })

  it('clamps the dragged task alone at both bounds (overnight tasks on)', () => {
    expect(previewPositions(tasks, move(2000), false, { overnight: true }).get('b')?.start).toBe(1435)
    expect(previewPositions(tasks, move(-50), false).get('b')?.start).toBe(0)
  })

  it('overnight tasks off: the dragged task ends by 24:00, unless it already crossed midnight', () => {
    expect(previewPositions(tasks, move(2000), false).get('b')?.start).toBe(1380)
    const sleep: DragChange = { mode: 'move', taskId: 's', originalStart: 1320, originalDuration: 480, liveStart: 1400, liveDuration: 480 }
    expect(previewPositions([{ id: 's', start: 1320, duration: 480 }], sleep, false).get('s')?.start).toBe(1400)
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

  it('a longer resize stops a pushed task at the day end and keeps pushing the others (overnight tasks on: 23:55)', () => {
    const result = previewPositions([...tasks, { id: 'd', start: 1420, duration: 10 }], resize(200), true, { overnight: true })
    expect(result.get('d')?.start).toBe(1435)
    expect(result.get('c')?.start).toBe(740)
    expect(result.get('b')?.duration).toBe(200)
  })

  it('overnight tasks off: a resize ends by 24:00, and a pushed task stops at 24:00', () => {
    expect(previewPositions(tasks, resize(2000), false).get('b')?.duration).toBe(960) // 08:00 → 24:00
    const result = previewPositions([...tasks, { id: 'd', start: 1420, duration: 10 }], resize(200), true)
    expect(result.get('d')?.start).toBe(1430)
    expect(result.get('c')?.start).toBe(740)
    expect(result.get('b')?.duration).toBe(200)
  })

  describe('Push mode never swaps (F017)', () => {
    // d: 09:00-10:00 dragged; p: 10:30-11:00; q: 11:30-12:00
    const pushTasks: TimedTask[] = [
      { id: 'd', start: 540, duration: 60 },
      { id: 'p', start: 630, duration: 30 },
      { id: 'q', start: 690, duration: 30 },
    ]
    const drag = (liveStart: number): DragChange => ({
      mode: 'move', taskId: 'd', originalStart: 540, originalDuration: 60, liveStart, liveDuration: 60,
    })

    it('keeps pushing past the middle of the next task', () => {
      const result = previewPositions(pushTasks, drag(600), true) // the old swap point
      expect(result.get('d')).toEqual({ start: 600, duration: 60 })
      expect(result.get('p')?.start).toBe(690)
      expect(result.get('q')?.start).toBe(750)
    })

    it('keeps pushing far down', () => {
      const result = previewPositions(pushTasks, drag(660), true)
      expect(result.get('p')?.start).toBe(750)
      expect(result.get('q')?.start).toBe(810)
    })

    it('pushes the task above when moving up (Push-up on)', () => {
      const up: TimedTask[] = [
        { id: 'p', start: 480, duration: 30 },
        { id: 'd', start: 540, duration: 60 },
      ]
      const result = previewPositions(up, { ...drag(480), originalStart: 540 }, true, { pushUp: true })
      expect(result.get('p')?.start).toBe(420)
      expect(result.get('d')?.start).toBe(480)
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

    // The strict rules are Normal mode only; Push mode is covered below.
    describe('Normal mode', () => {
      const pushMode = false
      const label = 'Normal mode'

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
    })

    it('Push mode pushes every task after it, Overlay on or off, as in T002', () => {
      const withOverlayOn = off().map((t) => (t.id === 'p' ? { ...t, overlay: true } : t))
      const result = previewPositions(withOverlayOn, drag(584), true) // 44 min down, p not yet passed by half
      expect(result.get('d')).toEqual({ start: 584, duration: 60 })
      expect(result.get('p')?.start).toBe(674)
      expect(result.get('q')?.start).toBe(734)
      expect(result.has('u')).toBe(false)
    })

    it('Push mode does not swap an Overlay-off task either', () => {
      const result = previewPositions(off(), drag(600), true)
      expect(result.get('d')).toEqual({ start: 600, duration: 60 })
      expect(result.get('p')?.start).toBe(690)
    })

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
