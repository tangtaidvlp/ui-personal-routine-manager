export type DailyTask = {
  id?: string
  name: string
  startTime: string
  /** Server-computed from startTime + durationMinutes; never send this on create/update. */
  endTime?: string
  description?: string
  durationMinutes: number
  completed: boolean
}

export type DailyRoutine = {
  /** Absent when the date has been peeked but never touched (nothing persisted yet). */
  id?: string
  date: string
  tasks: DailyTask[]
}
