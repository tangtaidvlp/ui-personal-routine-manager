/** Live positions while a task is dragged, and what Push mode moves with it (T002 R3). Minutes from 00:00. */
import { OVERNIGHT_TASKS_ENABLED, PUSH_UP_ENABLED } from '../../../config/featureFlags.ts'
import { mayCrossMidnight } from './overnight.ts'

const MAX_START_MINUTES = 1435
const MINUTES_PER_DAY = 1440

/** In Normal mode `overlay === false` gets the strict rules (F017 R2); otherwise the T002 behaviour. */
export type TimedTask = { id: string | undefined; start: number; duration: number; overlay?: boolean }

export type DragChange = {
  mode: 'move' | 'resize'
  taskId: string | undefined
  originalStart: number
  originalDuration: number
  liveStart: number
  liveDuration: number
}

export type Position = { start: number; duration: number }

/**
 * The new `{start, duration}` of the dragged task plus every task Push mode pushes with it.
 * The tasks that start at or after the dragged one move with it, down or up (keeping the gaps). Moving up
 * also pushes the tasks above only when `pushUp` is on (`PUSH_UP_ENABLED`); with it off, an Overlay-off
 * task stops at the end of the task above. Making a task longer pushes the tasks after its old end.
 * Shrinking pushes nothing.
 * The shift is clamped so every moved start stays within 00:00–23:55.
 * Push mode only pushes, it never swaps (F017: a swap cut the push short). Swapping is the Normal mode
 * rule for Overlay-off tasks, below.
 */
export function previewPositions(
  tasks: TimedTask[],
  change: DragChange,
  pushMode: boolean,
  { pushUp = PUSH_UP_ENABLED, overnight = OVERNIGHT_TASKS_ENABLED }: { pushUp?: boolean; overnight?: boolean } = {},
): Map<string | undefined, Position> {
  const result = new Map<string | undefined, Position>()
  const others = tasks.filter((task) => task.id !== change.taskId)
  const dragged = tasks.find((task) => task.id === change.taskId)
  // With overnight tasks off, no task is moved past 24:00 unless it already crosses midnight.
  const latestStart = (task: { start: number; duration: number }) =>
    mayCrossMidnight(task.start, task.duration, overnight) ? MAX_START_MINUTES : MINUTES_PER_DAY - task.duration
  if (!mayCrossMidnight(change.originalStart, change.originalDuration, overnight)) {
    change = {
      ...change,
      liveStart: Math.min(change.liveStart, MINUTES_PER_DAY - change.originalDuration),
      liveDuration: Math.min(change.liveDuration, MINUTES_PER_DAY - change.originalStart),
    }
  }

  // Push mode pushes every task, whatever its Overlay setting; the Overlay-off rules are for Normal mode.
  if (!pushMode && dragged?.overlay === false) {
    return change.mode === 'move' ? previewStrictMove(others, change) : previewStrictResize(others, change)
  }

  if (change.mode === 'move') {
    let delta = change.liveStart - change.originalStart
    // The tasks after the dragged one move with it both ways; moving up also pushes the ones above only
    // with Push-up on.
    const pushed =
      !pushMode || delta === 0
        ? []
        : others.filter((task) => task.start >= change.originalStart || (delta < 0 && pushUp))
    if (pushMode && delta < 0 && !pushUp && dragged?.overlay === false) {
      // Overlay-off moving up stops at the end of the task above (one it did not already overlap).
      const aboveEnds = others
        .map((task) => task.start + task.duration)
        .filter((end) => end <= change.originalStart)
      if (aboveEnds.length > 0) delta = Math.max(delta, Math.max(...aboveEnds) - change.originalStart)
    }
    const moving = [{ start: change.originalStart, duration: change.originalDuration }, ...pushed]
    delta =
      delta > 0
        ? Math.min(delta, ...moving.map((task) => latestStart(task) - task.start))
        : Math.max(delta, -Math.min(...moving.map((task) => task.start)))
    result.set(change.taskId, { start: change.originalStart + delta, duration: change.originalDuration })
    for (const task of pushed) {
      result.set(task.id, { start: task.start + delta, duration: task.duration })
    }
    return result
  }

  let delta = change.liveDuration - change.originalDuration
  if (!pushMode || delta <= 0) {
    result.set(change.taskId, { start: change.originalStart, duration: change.liveDuration })
    return result
  }
  const oldEnd = change.originalStart + change.originalDuration
  const pushed = others.filter((task) => task.start >= oldEnd)
  if (pushed.length > 0) {
    delta = Math.max(0, Math.min(delta, ...pushed.map((task) => latestStart(task) - task.start)))
  }
  result.set(change.taskId, { start: change.originalStart, duration: change.originalDuration + delta })
  for (const task of pushed) {
    result.set(task.id, { start: task.start + delta, duration: task.duration })
  }
  return result
}

const clampStart = (start: number) => Math.max(0, Math.min(MAX_START_MINUTES, start))
const midpoint = (task: TimedTask) => task.start + task.duration / 2

/** Swap with every task passed by at least half (Overlay-off, Normal mode); null when none was passed. */
function swapPassed(others: TimedTask[], change: DragChange): Map<string | undefined, Position> | null {
  const { originalStart, originalDuration: duration, liveStart } = change
  const down = liveStart > originalStart
  const passed = down
    ? others
        .filter((t) => t.start >= originalStart && midpoint(t) > originalStart + duration && midpoint(t) <= liveStart + duration)
        .sort((a, b) => midpoint(a) - midpoint(b))
    : others
        .filter((t) => t.start <= originalStart && midpoint(t) < originalStart && midpoint(t) >= liveStart)
        .sort((a, b) => midpoint(b) - midpoint(a))
  if (liveStart === originalStart || passed.length === 0) return null

  const result = new Map<string | undefined, Position>()
  let draggedStart = originalStart
  for (const task of passed) {
    if (down) {
      result.set(task.id, { start: clampStart(draggedStart), duration: task.duration })
      draggedStart = task.start + task.duration - duration
    } else {
      result.set(task.id, { start: clampStart(draggedStart + duration - task.duration), duration: task.duration })
      draggedStart = task.start
    }
  }
  result.set(change.taskId, { start: clampStart(draggedStart), duration })
  return result
}

const overlaps = (a: Position, b: Position) => a.start < b.start + b.duration && b.start < a.start + a.duration

/**
 * Overlay-off move (F017 R2): swap with each passed task, never push. With none passed the task is
 * dropped where it is, but a new overlap snaps against that task's near edge; a snap that still
 * overlaps, or leaves 00:00-24:00, goes back to the original slot. Overlaps present at the original slot are ignored.
 */
function previewStrictMove(others: TimedTask[], change: DragChange): Map<string | undefined, Position> {
  const swapped = swapPassed(others, change)
  if (swapped) return swapped

  const { originalStart, originalDuration: duration, liveStart } = change
  const original: Position = { start: originalStart, duration }
  const blockers = others.filter((task) => !overlaps(original, task))
  const live: Position = { start: liveStart, duration }
  const hits = blockers.filter((task) => overlaps(live, task))

  let slot = live
  if (hits.length > 0) {
    slot =
      liveStart > originalStart
        ? { start: Math.min(...hits.map((task) => task.start)) - duration, duration }
        : { start: Math.max(...hits.map((task) => task.start + task.duration)), duration }
  }
  const valid = slot.start >= 0 && slot.start <= MAX_START_MINUTES && !blockers.some((task) => overlaps(slot, task))
  return new Map([[change.taskId, valid ? slot : original]])
}

/** Overlay-off resize in Normal mode: the end stops at the start of the nearest task at or after the original end. */
function previewStrictResize(others: TimedTask[], change: DragChange): Map<string | undefined, Position> {
  const oldEnd = change.originalStart + change.originalDuration
  const nextStarts = others.filter((task) => task.start >= oldEnd).map((task) => task.start)
  const limit = nextStarts.length > 0 ? Math.min(...nextStarts) - change.originalStart : Infinity
  return new Map([[change.taskId, { start: change.originalStart, duration: Math.min(change.liveDuration, limit) }]])
}
