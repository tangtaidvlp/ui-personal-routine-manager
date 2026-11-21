import type { RoutineType } from '../api/defaultRoutine.ts'

/**
 * Which default routine a calendar date uses: Saturday and Sunday → WEEKEND, every other day → DAILY.
 * Mirrors the server rule in ms-personal-routine-manager `DefaultRoutineService` (the
 * `date.getDayOfWeek() >= SATURDAY` check) — keep the two in step (specs/.done.F002-ui-refactoring, R9).
 */
export function routineTypeForDate(date: Date): RoutineType {
  const day = date.getDay() // 0 = Sunday … 6 = Saturday
  return day === 0 || day === 6 ? 'WEEKEND' : 'DAILY'
}

const ROUTINE_TYPE_LABEL: Record<RoutineType, string> = {
  DAILY: 'Weekday routine',
  WEEKEND: 'Weekend routine',
}

export function routineTypeLabel(type: RoutineType): string {
  return ROUTINE_TYPE_LABEL[type]
}
