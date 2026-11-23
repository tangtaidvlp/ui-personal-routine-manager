/** Task duration as the task dialog shows it: hours + minutes (F010 US4). */
export type DurationParts = { hours: number; minutes: number }

/** Splits a duration in minutes into whole hours and the remaining minutes. Bad input → 0 h 0 min. */
export function splitDuration(totalMinutes: number): DurationParts {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { hours: 0, minutes: 0 }
  }
  const whole = Math.floor(totalMinutes)
  return { hours: Math.floor(whole / 60), minutes: whole % 60 }
}

/** Joins hours + minutes into total minutes. A non-number part counts as 0. */
export function joinDuration(hours: number, minutes: number): number {
  const safe = (value: number) => (Number.isFinite(value) ? value : 0)
  return safe(hours) * 60 + safe(minutes)
}
