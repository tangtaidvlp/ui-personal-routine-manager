import type { ReactNode } from 'react'
import { useElementSize } from '../../../hooks/useElementSize.ts'
import { useBoardClock, type BoardClock } from '../../onboarding/hooks/useBoardClock.ts'
import BoardToolbar from '../../onboarding/components/BoardToolbar.jsx'
import RadialDayChart, { type RadialTask } from './RadialDayChart.tsx'

type RadialBoardProps = {
  routine?: { tasks?: RadialTask[] } | null
  label?: string
  onRequestEditTask?: (task: RadialTask) => void
  showCompletion?: boolean
  liveClock?: boolean
  showToolbar?: boolean
  clock?: BoardClock
  toolbarActions?: ReactNode
  toolbarMenuActions?: ReactNode
  onResetDay?: () => void
  resetDisabled?: boolean
  /** Same as EditingBoard: called with the changed tasks after a drag. */
  onPersistTaskChange?: (tasks: RadialTask[]) => unknown
  onPersistError?: (error: unknown) => void
  // Other EditingBoard props are accepted and ignored so pages can spread the same handlers.
  onRequestCreateTask?: unknown
  onToggleComplete?: unknown
  onRequestDeleteTask?: unknown
  gapClearMode?: unknown
  scrollContainerRef?: unknown
  showFooter?: unknown
}

/** Drop-in for EditingBoard that shows the day as a 24-hour circle (specs/F016). Click a task to edit it, drag its arc to move it. */
function RadialBoard({
  routine,
  label = '24-hour circle',
  onRequestEditTask,
  showCompletion = true,
  liveClock = true,
  showToolbar = true,
  clock: sharedClock,
  toolbarActions = null,
  toolbarMenuActions = null,
  onResetDay,
  resetDisabled = false,
  onPersistTaskChange,
  onPersistError,
}: RadialBoardProps) {
  const [bodyRef, bodySize] = useElementSize<HTMLDivElement>()
  const ownClock = useBoardClock(liveClock && !sharedClock)
  const clock = liveClock ? (sharedClock ?? ownClock) : null

  // Same update shape as the timeline's drag (EditingBoard), so pages need no change.
  const moveTask = (task: RadialTask, startMinutes: number) => {
    const startTime = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`
    const update = { id: task.id, name: task.name, description: task.description, color: task.color, startTime, durationMinutes: task.durationMinutes, completed: task.completed }
    // Reports the error once, then re-throws so the chart can drop the unsaved position.
    return Promise.resolve(onPersistTaskChange?.([update])).catch((error) => {
      if (onPersistError) onPersistError(error)
      else console.error('Failed to update tasks', error)
      throw error
    })
  }

  return (
    <section className="ob-timeline-board rv-board" aria-label={label}>
      {showToolbar ? (
        <BoardToolbar
          boardTools={false}
          clock={clock}
          gapClearMode={false}
          onToggleGapClear={() => {}}
          onResetDay={onResetDay}
          resetDisabled={resetDisabled}
          actions={toolbarActions}
          menuActions={toolbarMenuActions}
        />
      ) : null}
      <div className="rv-body" ref={bodyRef}>
        <RadialDayChart
          tasks={routine?.tasks ?? []}
          currentTime={clock?.currentTime}
          label={label}
          onTaskClick={onRequestEditTask}
          onMoveTask={onPersistTaskChange ? moveTask : undefined}
          showCompletion={showCompletion}
          width={bodySize.width}
          height={bodySize.height}
        />
      </div>
    </section>
  )
}

export default RadialBoard
