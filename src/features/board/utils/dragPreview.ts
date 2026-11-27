/** Live positions while a task is dragged, and what Push mode moves with it (T002 R3). Minutes from 00:00. */
const MAX_START_MINUTES = 1435

/** `overlay === false` gets the strict rules (F017 R2); `true` or missing keeps the T002 behaviour. */
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
 * Moving down pushes the tasks that start at or after the dragged one; moving up pushes those that
 * start at or before it; making a task longer pushes the tasks after its old end. Shrinking pushes nothing.
 * The shift is clamped so every moved start stays within 00:00–23:55.
 * Push mode, move only: once the dragged task has passed at least half of another task, nothing is pushed.
 * The dragged task swaps places with each passed task (the gap between them is kept) and the rest stay put.
 */
export function previewPositions(
  tasks: TimedTask[],
  change: DragChange,
  pushMode: boolean,
): Map<string | undefined, Position> {
  const result = new Map<string | undefined, Position>()
  const others = tasks.filter((task) => task.id !== change.taskId)

  if (tasks.find((task) => task.id === change.taskId)?.overlay === false) {
    if (change.mode === 'move') return previewStrictMove(others, change)
    if (!pushMode) return previewStrictResize(others, change)
  }

  if (change.mode === 'move') {
    const swapped = pushMode ? swapPassed(others, change) : null
    if (swapped) return swapped
    let delta = change.liveStart - change.originalStart
    const pushed =
      !pushMode || delta === 0
        ? []
        : others.filter((task) => (delta > 0 ? task.start >= change.originalStart : task.start <= change.originalStart))
    const starts = [change.originalStart, ...pushed.map((task) => task.start)]
    delta = delta > 0 ? Math.min(delta, MAX_START_MINUTES - Math.max(...starts)) : Math.max(delta, -Math.min(...starts))
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
    delta = Math.max(0, Math.min(delta, MAX_START_MINUTES - Math.max(...pushed.map((task) => task.start))))
  }
  result.set(change.taskId, { start: change.originalStart, duration: change.originalDuration + delta })
  for (const task of pushed) {
    result.set(task.id, { start: task.start + delta, duration: task.duration })
  }
  return result
}

const clampStart = (start: number) => Math.max(0, Math.min(MAX_START_MINUTES, start))
const midpoint = (task: TimedTask) => task.start + task.duration / 2

/** Push mode move: swap with every task passed by at least half; null when none was passed. */
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
