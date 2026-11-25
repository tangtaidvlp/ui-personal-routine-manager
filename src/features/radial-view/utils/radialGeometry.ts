/** Pure geometry for the radial 24h view (specs/F016). Angles are degrees: 0 = midnight at the top, clockwise. */

export const MINUTES_PER_DAY = 1440

/** `H:mm`, `HH:mm` or `HH:mm:ss` → minutes since midnight; anything else → null. */
export function parseStartMinutes(startTime: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(startTime.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** Minutes since midnight → angle in [0, 360). */
export function minutesToAngle(minutes: number): number {
  const angle = ((minutes / MINUTES_PER_DAY) * 360) % 360
  return angle < 0 ? angle + 360 : angle
}

export function pointAt(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const theta = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(theta), y: cy - r * Math.cos(theta) }
}

const n = (value: number) => Number(value.toFixed(2))

/** A full circle as two half arcs (one arc can't draw 360°), starting at the top. */
function circleSubpath(cx: number, cy: number, r: number, clockwise: boolean): string {
  const flag = clockwise ? 1 : 0
  return `M ${n(cx)} ${n(cy - r)} A ${n(r)} ${n(r)} 0 1 ${flag} ${n(cx)} ${n(cy + r)} A ${n(r)} ${n(r)} 0 1 ${flag} ${n(cx)} ${n(cy - r)} Z`
}

/** An open arc clockwise from startAngle (a full circle for 360° or more). */
export function arcPath(cx: number, cy: number, r: number, startAngle: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return ''
  if (sweepDeg >= 360) return circleSubpath(cx, cy, r, true)
  const start = pointAt(cx, cy, r, startAngle)
  const end = pointAt(cx, cy, r, startAngle + sweepDeg)
  return `M ${n(start.x)} ${n(start.y)} A ${n(r)} ${n(r)} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${n(end.x)} ${n(end.y)}`
}

type LaneItem = { id: string; start: number; duration: number }

/** Overlap on the 24h cycle: `[start, start + duration)` may run past 1440 and wrap; touching ends don't overlap. */
function overlapsOnCycle(a: LaneItem, b: LaneItem): boolean {
  for (const shift of [-MINUTES_PER_DAY, 0, MINUTES_PER_DAY]) {
    const bStart = b.start + shift
    if (a.start < bStart + b.duration && bStart < a.start + a.duration) return true
  }
  return false
}

/** Greedy interval colouring in start order: each task gets the lowest lane with no overlap. */
export function assignLanes(items: LaneItem[]): { lanes: Map<string, number>; laneCount: number } {
  const lanes = new Map<string, number>()
  const members: LaneItem[][] = []
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    let lane = members.findIndex((placed) => placed.every((other) => !overlapsOnCycle(item, other)))
    if (lane === -1) {
      lane = members.length
      members.push([])
    }
    members[lane].push(item)
    lanes.set(item.id, lane)
  }
  return { lanes, laneCount: Math.max(1, members.length) }
}

/** Equal radius bands between `inner` and `outer` per lane, lane 0 outermost. */
export function laneBand(lane: number, laneCount: number, inner: number, outer: number): { inner: number; outer: number } {
  const band = (outer - inner) / Math.max(1, laneCount)
  return { inner: outer - (lane + 1) * band, outer: outer - lane * band }
}

type TimedItem = { id: string; start: number; duration: number }

/**
 * The task running at `now` (the one that started last if several overlap) and the next one to start,
 * on the 24h cycle, so an overnight task counts after midnight. Minutes left/until are whole minutes.
 */
export function findNowAndNext<T extends TimedItem>(
  items: readonly T[],
  now: number,
): { current: T | null; minutesLeft: number; next: T | null } {
  let current: T | null = null
  let sinceStart = Infinity
  let next: T | null = null
  let untilNext = Infinity
  for (const item of items) {
    const since = (((now - item.start) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
    if (since < item.duration || item.duration >= MINUTES_PER_DAY) {
      if (since < sinceStart) {
        current = item
        sinceStart = since
      }
    } else {
      const until = MINUTES_PER_DAY - since
      if (until < untilNext) {
        next = item
        untilNext = until
      }
    }
  }
  return { current, minutesLeft: current ? current.duration - sinceStart : 0, next }
}
