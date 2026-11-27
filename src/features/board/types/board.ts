import type { ReactNode } from 'react'
import type { BoardClock } from '../hooks/useBoardClock.ts'

/** What a board reads from a routine, daily or reflection task. */
export type BoardTask = {
  id?: string
  name: string
  description?: string
  /** HH:mm */
  startTime: string
  /** Server-computed; never send. */
  endTime?: string
  durationMinutes: number
  /** Palette id or #RRGGBB (specs/F005). */
  color?: string | null
  completed?: boolean
  /** F017: may overlap other tasks. Read from the server; sent only by the task dialog. */
  overlay?: boolean
}

export type BoardRoutine<T extends BoardTask = BoardTask> = {
  id?: string
  tasks?: T[]
}

/** Where a click on the empty timeline asks for a new task. */
export type TaskDraft = { name: string; startTime: string; durationMinutes: number }

/**
 * The props every board takes: `EditingBoard` (timeline) and `RadialBoard` (24-hour circle) are
 * interchangeable (F016), so pages pass the same props to either. A board that has no use for a
 * prop still declares it and ignores it.
 */
export type BoardProps<T extends BoardTask = BoardTask> = {
  routine?: BoardRoutine<T> | null
  /** Accessible name. `RadialBoard` uses it; `EditingBoard` ignores it and always says "Timeline board". */
  label?: string
  /** Default true. False = setup board: no clock readout, now-line, current-task highlight or footer. */
  liveClock?: boolean
  /** Now/Next footer. Default = `liveClock`. Timeline only. */
  showFooter?: boolean
  /** False hides this board's toolbar (a parent shares one toolbar between boards). */
  showToolbar?: boolean
  /** A shared clock (from `useBoardClock`) replaces the board's own. */
  clock?: BoardClock
  /** Page actions at the right end of the toolbar. */
  toolbarActions?: ReactNode
  /** Page tools that fold into the toolbar's "More" menu when it is narrow. */
  toolbarMenuActions?: ReactNode
  onResetDay?: () => void
  resetDisabled?: boolean
  /** Default true. False hides the "Mark as done" checks (Reality board). */
  showCompletion?: boolean
  /** Shared Push mode state. Timeline only. */
  pushMode?: boolean
  /** Receives the scrolling element (for scroll sync). Timeline only. */
  scrollContainerRef?: (element: HTMLElement | null) => void
  /** Timeline only. */
  onRequestCreateTask?: (draft: TaskDraft) => void
  onRequestEditTask?: (task: T) => void
  /**
   * Called with the changed tasks after a drag (the dragged task, plus the tasks Push mode moved).
   * The returned promise must settle after `routine` shows the saved data, and reject on failure.
   */
  onPersistTaskChange?: (tasks: BoardTask[]) => unknown
  /** The circle view reports a failed drag here. The timeline doesn't: it shows its own bottom message. */
  onPersistError?: (error: unknown) => void
  /** Timeline only. */
  onToggleComplete?: (task: T) => Promise<unknown>
  /** Timeline only. */
  onRequestDeleteTask?: (task: T) => Promise<unknown> | void
}
