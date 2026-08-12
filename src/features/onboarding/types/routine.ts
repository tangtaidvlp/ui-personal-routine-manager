export type RoutineTask = {
  id?: string
  name: string
  startTime: string
  /** Server-computed from startTime + durationMinutes; never send this on create/update. */
  endTime?: string
  description?: string
  durationMinutes: number
  color?: string
}

export type DefaultRoutine = {
  id: string
  name?: string
  routineType?: 'DAILY' | 'WEEKEND'
  tasks: RoutineTask[]
}
