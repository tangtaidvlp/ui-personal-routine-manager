import { useElementSize } from '../../../hooks/useElementSize.ts'
import { useBoardClock } from '../../board/hooks/useBoardClock.ts'
import BoardToolbar from '../../board/components/BoardToolbar.tsx'
import type { BoardProps, BoardTask } from '../../board/types/board.ts'
import RadialDayChart from './RadialDayChart.tsx'

/**
 * Drop-in for EditingBoard that shows the day as a 24-hour circle (specs/F016). Click a task to edit it, drag its arc to move it.
 * Both boards take `BoardProps`; the props a circle has no use for (push mode, footer, create/delete/toggle…) are declared there and ignored here.
 */
function RadialBoard<T extends BoardTask>({
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
}: BoardProps<T>) {
  const [bodyRef, bodySize] = useElementSize<HTMLDivElement>()
  const ownClock = useBoardClock(liveClock && !sharedClock)
  const clock = liveClock ? (sharedClock ?? ownClock) : null

  // Same update shape as the timeline's drag (EditingBoard), so pages need no change.
  const moveTask = (task: T, startMinutes: number) => {
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
          pushMode={false}
          onTogglePushMode={() => {}}
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
