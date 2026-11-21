/** "Now … / Next …" footer of the live board (specs/.done.F002-ui-refactoring data-model §5). */

const MINUTES_PER_DAY = 1440

type TaskLike = { name: string; startTime?: string; endTime?: string }

export type NowAndNext = {
  now: { name: string; minutesLeft: number } | null
  next: { name: string; startTime: string } | null
}

function toMinutes(value: string | undefined): number | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

const toHHMM = (minutes: number) =>
  `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`

export function nowAndNext(tasks: readonly TaskLike[], minutesOfDay: number): NowAndNext {
  let now: { name: string; start: number; end: number } | null = null
  let next: { name: string; start: number } | null = null

  for (const task of tasks) {
    const start = toMinutes(task.startTime)
    if (start === null) continue
    const parsedEnd = toMinutes(task.endTime)
    // An end of 00:00 (or a missing end) means the task runs to the end of the day.
    const end = parsedEnd === null || parsedEnd === 0 ? MINUTES_PER_DAY : parsedEnd

    if (start <= minutesOfDay && minutesOfDay < end) {
      // Overlapping tasks: the one that started last is "now".
      if (!now || start > now.start) now = { name: task.name, start, end }
    } else if (start > minutesOfDay) {
      if (!next || start < next.start) next = { name: task.name, start }
    }
  }

  return {
    now: now ? { name: now.name, minutesLeft: now.end - minutesOfDay } : null,
    next: next ? { name: next.name, startTime: toHHMM(next.start) } : null,
  }
}

export function formatMinutesLeft(minutes: number): string {
  if (minutes < 60) return `${minutes} min left`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h left` : `${h}h ${m}m left`
}
