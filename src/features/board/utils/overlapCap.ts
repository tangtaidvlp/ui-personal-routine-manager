import type { TimedTask } from './dragPreview.ts'

/** At most this many tasks may run at the same minute (T002 R4); the API enforces the same rule. */
export const MAX_PARALLEL_TASKS = 3
export const OVERLAP_CAP_MESSAGE = 'A time slot can hold at most 3 tasks.'

const MINUTES_PER_DAY = 1440

/**
 * True when some minute covered by a changed task holds more than 3 tasks, on a 1440-minute cycle
 * (an overnight task wraps). Unchanged tasks are never blamed.
 */
export function breaksOverlapCap(tasks: TimedTask[], changedIds: Set<string | undefined>): boolean {
  const counts = new Array<number>(MINUTES_PER_DAY).fill(0)
  const covered = (task: TimedTask, visit: (minute: number) => void) => {
    const length = Math.min(task.duration, MINUTES_PER_DAY)
    for (let offset = 0; offset < length; offset += 1) {
      visit((((task.start + offset) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY)
    }
  }
  for (const task of tasks) {
    covered(task, (minute) => {
      counts[minute] += 1
    })
  }
  return tasks.some((task) => {
    if (!changedIds.has(task.id)) return false
    let broken = false
    covered(task, (minute) => {
      if (counts[minute] > MAX_PARALLEL_TASKS) broken = true
    })
    return broken
  })
}
