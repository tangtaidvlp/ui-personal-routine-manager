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

/**
 * The read-only end shown under Duration (F011): "Ends 06:00 (next day)" when the task passes 24:00,
 * else "Ends HH:MM". Null when the start isn't HH:MM or the duration isn't positive.
 */
export function endsLabel(startTime: string, durationMinutes: number): string | null {
  const match = /^(\d{2}):(\d{2})/.exec(startTime)
  if (!match || !Number.isFinite(durationMinutes) || durationMinutes < 1) {
    return null
  }
  const end = Number(match[1]) * 60 + Number(match[2]) + durationMinutes
  const wrapped = end % 1440
  const hhmm = `${Math.floor(wrapped / 60).toString().padStart(2, '0')}:${(wrapped % 60).toString().padStart(2, '0')}`
  return end > 1440 ? `Ends ${hhmm} (next day)` : `Ends ${hhmm}`
}
