/** F007 daily reflection — mirrors specs/F007-reflection/contracts/reflection-api.md. */

/** One thing the user actually did. `plannedTaskId` null = unplanned. */
export type ReflectionTask = {
  id?: string
  plannedTaskId?: string | null
  name: string
  description?: string | null
  /** HH:mm */
  startTime: string
  /** Server-computed; never send. */
  endTime?: string
  durationMinutes: number
  /** Palette id or #RRGGBB (F005); omit on create for auto-assign, null on update keeps it. */
  color?: string | null
}

export type ComparisonStatus = 'AS_PLANNED' | 'CHANGED' | 'SKIPPED' | 'UNPLANNED'

export type ComparisonTaskRef = {
  id: string | null
  name: string
  startTime: string
  durationMinutes: number
}

export type ComparisonItem = {
  status: ComparisonStatus
  planned: ComparisonTaskRef | null
  actual: ComparisonTaskRef | null
}

export type ReflectionComparison = {
  plannedMinutes: number
  actualMinutes: number
  counts: { asPlanned: number; changed: number; skipped: number; unplanned: number }
  items: ComparisonItem[]
}

export type ReflectionFeedback = {
  text: string
  generatedAt: string
  /** The reflection changed after the note was written. */
  stale: boolean
}

export type ReflectionView = {
  exists: boolean
  id: string | null
  date: string
  tasks: ReflectionTask[]
  plannedTasks: ComparisonTaskRef[]
  comparison: ReflectionComparison
  feedback: ReflectionFeedback | null
  nextColor?: string | null
}
