/** Live positions while a task is dragged, and what Push mode moves with it (T002 R3). Minutes from 00:00. */
const MAX_START_MINUTES = 1435

export type TimedTask = { id: string | undefined; start: number; duration: number }

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
 */
export function previewPositions(
  tasks: TimedTask[],
  change: DragChange,
  pushMode: boolean,
): Map<string | undefined, Position> {
  const result = new Map<string | undefined, Position>()
  const others = tasks.filter((task) => task.id !== change.taskId)

  if (change.mode === 'move') {
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
