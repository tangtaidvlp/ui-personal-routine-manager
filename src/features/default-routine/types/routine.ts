export type RoutineTask = {
  id?: string
  name: string
  startTime: string
  /** Server-computed from startTime + durationMinutes; never send this on create/update. */
  endTime?: string
  description?: string
  durationMinutes: number
  /** Palette id or #RRGGBB; server-assigned when omitted on create (specs/F005). */
  color?: string | null
}

export type DefaultRoutine = {
  id: string
  name?: string
  routineType?: 'DAILY' | 'WEEKEND' // DAILY = weekday routine
  tasks: RoutineTask[]
  /** Palette id the next auto-assigned task gets; pre-selected in the create dialog. */
  nextColor?: string
}
