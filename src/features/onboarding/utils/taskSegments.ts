/** Board segments of one task on the 24h board (F011 R5). An overnight task wraps to the top. */
const MINUTES_PER_DAY = 1440

export type TaskSegment = { part: 'main' | 'wrap'; start: number; end: number }

/**
 * `main` runs from the start to the end, capped at 24:00. Only when the task ends after
 * 24:00 is there a `wrap` part from 00:00 to the rest of the end. Ending exactly at 24:00 is not overnight.
 */
export function taskSegments(startMinutes: number, durationMinutes: number): TaskSegment[] {
  const end = startMinutes + durationMinutes
  const segments: TaskSegment[] = [{ part: 'main', start: startMinutes, end: Math.min(end, MINUTES_PER_DAY) }]
  if (end > MINUTES_PER_DAY) {
    segments.push({ part: 'wrap', start: 0, end: end - MINUTES_PER_DAY })
  }
  return segments
}
