import type { RoutineType } from '../api/defaultRoutine.ts'

export type ScheduleTab = 'weekday' | 'weekend'

/** Setup-screen tab → default routine type (data-model.md §5). */
export function routineTypeForTab(tab: ScheduleTab): RoutineType {
  return tab === 'weekend' ? 'WEEKEND' : 'DAILY'
}
