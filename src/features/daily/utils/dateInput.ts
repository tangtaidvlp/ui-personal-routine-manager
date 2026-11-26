import type { TaskDraft } from '../../board/types/board.ts'

const MINUTES_PER_DAY = 1440

/** A local date as `yyyy-MM-dd`, the value of an `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** `yyyy-MM-dd` to a local Date at midnight. */
export function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatTimeOfDay(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = Math.floor(minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/** A blank 30-minute task starting at the next half hour (never later than 23:30). */
export function nextDefaultDraftTask(now: Date = new Date()): TaskDraft {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.min(Math.ceil(nowMinutes / 30) * 30, MINUTES_PER_DAY - 30)
  return { name: '', startTime: formatTimeOfDay(rounded), durationMinutes: 30 }
}
