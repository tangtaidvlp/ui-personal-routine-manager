/** F007 FR-002: reflection is for today and past days only. Dates are `yyyy-MM-dd`. */

export const FUTURE_REFLECTION_HINT = 'You can reflect once the day has happened.'

/** `yyyy-MM-dd` strings compare correctly as text. */
export function isFutureDate(date: string, today: string): boolean {
  return date > today
}

export function canReflect(date: string, today: string): boolean {
  return !isFutureDate(date, today)
}
