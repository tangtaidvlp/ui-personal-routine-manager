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
  // EditingBoard's drag props are accepted and ignored so pages can spread the same handlers.
  onPersistTaskChange?: unknown
  onRequestCreateTask?: unknown
  onToggleComplete?: unknown
  onRequestDeleteTask?: unknown
  onPersistError?: unknown
  gapClearMode?: unknown
  scrollContainerRef?: unknown
  showFooter?: unknown
}

/** Drop-in for EditingBoard that shows the day as a 24-hour circle (specs/F016). Clicking a task edits it; there is no dragging. */
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
}: RadialBoardProps) {
  const [bodyRef, bodySize] = useElementSize<HTMLDivElement>()
  const ownClock = useBoardClock(liveClock && !sharedClock)
  const clock = liveClock ? (sharedClock ?? ownClock) : null

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
          showCompletion={showCompletion}
          width={bodySize.width}
          height={bodySize.height}
        />
      </div>
    </section>
  )
}

export default RadialBoard
