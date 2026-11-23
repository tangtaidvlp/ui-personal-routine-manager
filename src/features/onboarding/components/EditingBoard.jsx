
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import { CheckIcon } from '../../../components/icons/index.ts'
import { formatMinutesLeft, nowAndNext } from '../../daily/utils/nowAndNext.ts'
import {
  minutesForScrollTop,
  scrollTopForMinutes,
  SETUP_SCROLL_ANCHOR_MINUTES,
  SETUP_SCROLL_OFFSET_PX,
} from '../utils/boardScroll.ts'
import { usePalette } from '../../palette/hooks/usePalette.ts'
import { resolveTaskColor } from '../../palette/utils/taskColor.ts'
import { useBoardZoom } from '../../settings/hooks/useUserSettings.ts'
import { getCurrentMinutes, useBoardClock } from '../hooks/useBoardClock.ts'
import { taskSegments } from '../utils/taskSegments.ts'
import BoardToolbar from './BoardToolbar.jsx'

const MINUTES_PER_DAY = 1440
const BASE_BOARD_HEIGHT_PX = 2400
const SNAP_MINUTES = 5
const MIN_DURATION_MINUTES = 5
const CLICK_DISTANCE_THRESHOLD_PX = 5
// The live board opens with "now" this far below the top of the view.
const LIVE_SCROLL_OFFSET_PX = 260

const parseLocalTimeToMinutes = (value, fallback = 0) => {
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
    if (match) {
      const hours = Number(match[1])
      const minutes = Number(match[2])
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return hours * 60 + minutes
      }
    }
  }

  return fallback
}

const showTaskDuration = (minutesDuration) => {
    const h = Math.floor(minutesDuration / 60)
    const m = minutesDuration % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    if (h < 0 && m > 0) return `${m}m`
    return `${m}m`
}

const formatTime = (minutes) => {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0')
  const m = Math.floor(normalized % 60)
    .toString()
    .padStart(2, '0')
  return `${h}:${m}`
}

const snapMinutes = (minutes, step = SNAP_MINUTES) => Math.round(minutes / step) * step

const clamp = (value, min, max) => Math.max(min, Math.min(value, max))

/**
 * `liveClock` (default true): the clock readout, now-line, current-task highlight and Now/Next
 * footer, always following the real time (no pause or time slider, F010). The setup screen
 * passes false: a default routine is a template with no "now", so the board opens at 06:00
 * instead (spec 003).
 *
 * `toolbarActions` (F002): page actions shown at the right end of the toolbar.
 * `toolbarMenuActions` (F010): page tools that fold into the toolbar's "More" menu when it is narrow.
 * `showFooter` (F002, default = liveClock): the "Now … · N min left / Next: … at HH:MM" footer.
 *
 * Side by side (F007 R11/R12), a parent can share one toolbar between boards:
 * `showToolbar` false hides this board's toolbar; `clock` (from useBoardClock) replaces
 * the board's own clock; `gapClearMode` replaces its own Gap clear state; `scrollContainerRef`
 * receives the scrolling element (for scroll sync).
 * `onResetDay` / `resetDisabled` (F012) go to the toolbar; without `onResetDay` there is no Reset day.
 * `showCompletion` (default true) false hides the "Mark as done" checks (F007 Reality board).
 *
 * @param {{
 *   routine: any,
 *   liveClock?: boolean,
 *   toolbarActions?: import('react').ReactNode,
 *   toolbarMenuActions?: import('react').ReactNode,
 *   showFooter?: boolean,
 *   onRequestCreateTask?: (draft: any) => void,
 *   onRequestEditTask?: (task: any) => void,
 *   onPersistTaskChange?: (tasks: any[]) => unknown,
 *   onPersistError?: (error: unknown) => void,
 *   onToggleComplete?: (task: any) => Promise<unknown>,
 *   onRequestDeleteTask?: (task: any) => Promise<unknown> | void,
 *   showToolbar?: boolean,
 *   clock?: import('../hooks/useBoardClock.ts').BoardClock,
 *   gapClearMode?: boolean,
 *   onResetDay?: () => void,
 *   resetDisabled?: boolean,
 *   scrollContainerRef?: (element: HTMLElement | null) => void,
 *   showCompletion?: boolean,
 * }} props
 */
function EditingBoard({
  routine,
  liveClock = true,
  toolbarActions = null,
  toolbarMenuActions = null,
  showFooter = liveClock,
  onRequestCreateTask,
  onRequestEditTask,
  onPersistTaskChange,
  onPersistError,
  onToggleComplete,
  onRequestDeleteTask,
  showToolbar = true,
  clock: sharedClock,
  gapClearMode: sharedGapClearMode,
  onResetDay,
  resetDisabled = false,
  scrollContainerRef,
  showCompletion = true,
}) {

  // Task colours come from the backend palette; the stylesheet picks the light/dark pair (specs/F005).
  const { palette } = usePalette()
  // The board's own clock ticks only when no shared clock is passed.
  const ownClock = useBoardClock(liveClock && !sharedClock)
  const clock = sharedClock ?? ownClock
  const { currentTime } = clock
  const [hoveredTask, setHoveredTask] = useState(null)
  const [dragState, setDragState] = useState(null)
  // One zoom level shared by every board and saved to the account (specs/F006 FR-010, FR-011).
  const { zoom: zoomLevel } = useBoardZoom()
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(new Set())
  const [ownGapClearMode, setGapClearMode] = useState(false)
  const gapClearMode = sharedGapClearMode ?? ownGapClearMode
  const containerRef = useRef(null)
  const scrollContainerRefRef = useRef(scrollContainerRef)
  scrollContainerRefRef.current = scrollContainerRef
  const setScrollContainer = (element) => {
    containerRef.current = element
    scrollContainerRefRef.current?.(element)
  }
  const trackRef = useRef(null)
  // Each task's `main` part, by id. A drag captures the pointer there, because a `wrap` part
  // (or the handle on it) can unmount mid-drag when the task stops crossing midnight (F011).
  const mainPartsRef = useRef(new Map())
  // With the capture on `main`, a press on a `wrap` part ends on `main`, so the browser sends the
  // click to their common parent (the track). Ignore that one click so it doesn't open "Add task".
  const ignoreTrackClickRef = useRef(false)

  const boardHeightPx = useMemo(() => BASE_BOARD_HEIGHT_PX * zoomLevel, [zoomLevel])
  const minutesPerPixel = useMemo(() => MINUTES_PER_DAY / boardHeightPx, [boardHeightPx])

  const tasks = routine?.tasks || [];

const [completedTasks, setCompletedTasks] = useState(() => {
    return {}
  })

  // Without the live clock: open at 06:00, and again when another routine is shown
  // (Weekday/Weekend switch). A save keeps the same id, so it doesn't move the board.
  const boardHeightRef = useRef(boardHeightPx)
  const routineId = routine?.id
  useEffect(() => {
    if (liveClock || !routineId || !containerRef.current) {
      return
    }
    containerRef.current.scrollTop = scrollTopForMinutes(
      SETUP_SCROLL_ANCHOR_MINUTES,
      boardHeightRef.current,
      SETUP_SCROLL_OFFSET_PX,
    )
  }, [liveClock, routineId])

  // Live clock: show "now" once when the board mounts (specs/F005 FR-014). Clock ticks,
  // zoom, saves and date changes never move the view again (FR-015) — the board
  // isn't remounted on a date change, so don't key it by date.
  const hasCenteredRef = useRef(false)
  useLayoutEffect(() => {
    if (!liveClock || hasCenteredRef.current || !containerRef.current) {
      return
    }
    hasCenteredRef.current = true
    containerRef.current.scrollTop = scrollTopForMinutes(getCurrentMinutes(), boardHeightRef.current, LIVE_SCROLL_OFFSET_PX)
  }, [liveClock])

  // Zooming keeps the time of day at the top of the view in place (setup board and live clock).
  useLayoutEffect(() => {
    const previousHeight = boardHeightRef.current
    boardHeightRef.current = boardHeightPx
    if (previousHeight === boardHeightPx || !containerRef.current) {
      return
    }
    const topMinutes = minutesForScrollTop(containerRef.current.scrollTop, previousHeight)
    containerRef.current.scrollTop = scrollTopForMinutes(topMinutes, boardHeightPx)
  }, [boardHeightPx])



  const footer = liveClock && showFooter ? nowAndNext(tasks, currentTime) : null

  const toggleTaskCompletion = async (task, index, event) => {
    event.stopPropagation()
    if (onToggleComplete) {
      // Optimistic update: toggle immediately in local state for instant feedback
      setCompletedTasks((current) => ({
        ...current,
        [index]: !Boolean(task.completed),
      }))
      setIsToggling((prev) => new Set(prev).add(task.id))
      try {
        await onToggleComplete(task)
      } catch (err) {
        // Revert on failure
        setCompletedTasks((current) => ({
          ...current,
          [index]: Boolean(task.completed),
        }))
        console.error('Failed to toggle task completion:', err)
      } finally {
        setIsToggling((prev) => {
          const next = new Set(prev)
          next.delete(task.id)
          return next
        })
      }
      return
    }
    setCompletedTasks((current) => ({
      ...current,
      [index]: !current[index],
    }))
  }

  const handleTrackClick = (event) => {
    if (ignoreTrackClickRef.current) {
      ignoreTrackClickRef.current = false
      return
    }
    if (!trackRef.current || !onRequestCreateTask) {
      return
    }
    const rect = trackRef.current.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const snapped = snapMinutes(offsetY * minutesPerPixel)
    const startMinutes = clamp(snapped, 0, MINUTES_PER_DAY - 30)

    onRequestCreateTask({ name: '', startTime: formatTime(startMinutes), durationMinutes: 30 })
  }

  const beginDrag = (event, mode, task, originalStartMinutes, originalDurationMinutes) => {
    event.stopPropagation()
    const captureTarget = mainPartsRef.current.get(task.id) ?? event.currentTarget
    captureTarget.setPointerCapture(event.pointerId)

    // When in gap-clear mode, capture original positions of all tasks
    const originalTaskPositions = gapClearMode && mode === 'move'
      ? tasks.map(t => ({ id: t.id, originalStart: parseLocalTimeToMinutes(t.startTime) }))
      : null

    setDragState({
      taskId: task.id,
      mode,
      pointerId: event.pointerId,
      startClientY: event.clientY,
      originalStartMinutes,
      originalDurationMinutes,
      liveStartMinutes: originalStartMinutes,
      liveDurationMinutes: originalDurationMinutes,
      originalTaskPositions,
      draggedTaskOriginalStart: originalStartMinutes,
    })
  }

  const handleDragPointerMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    const deltaMinutes = snapMinutes((event.clientY - dragState.startClientY) * minutesPerPixel)

    if (dragState.mode === 'move') {
      // The end may pass 24:00: the task then wraps to the top of the board (F011).
      const liveStartMinutes = clamp(dragState.originalStartMinutes + deltaMinutes, 0, MINUTES_PER_DAY - SNAP_MINUTES)
      setDragState((current) => (current && current.pointerId === event.pointerId ? { ...current, liveStartMinutes } : current))
    } else {
      const liveDurationMinutes = clamp(dragState.originalDurationMinutes + deltaMinutes, MIN_DURATION_MINUTES, MINUTES_PER_DAY)
      setDragState((current) => (current && current.pointerId === event.pointerId ? { ...current, liveDurationMinutes } : current))
    }
  }

  const handleDragPointerUp = (event, task) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    const finished = dragState
    setDragState(null)
    // The click (if any) follows this pointerup in the same turn; clear the flag after it.
    ignoreTrackClickRef.current = true
    setTimeout(() => {
      ignoreTrackClickRef.current = false
    }, 0)

    const movedDistance = Math.abs(event.clientY - finished.startClientY)

    if (finished.mode === 'move' && movedDistance < CLICK_DISTANCE_THRESHOLD_PX) {
      onRequestEditTask?.(task)
      return
    }

    const hasChanged =
      finished.mode === 'move'
        ? finished.liveStartMinutes !== finished.originalStartMinutes
        : finished.liveDurationMinutes !== finished.originalDurationMinutes

    if (!hasChanged) {
      return
    }

    // Calculate how far we moved the dragged task
    const deltaMinutes = finished.liveStartMinutes - finished.originalStartMinutes

    // Base updated tasks list
    let tasksToUpdate = []

    if (gapClearMode && finished.mode === 'move' && finished.originalTaskPositions) {
      // Gap-clear mode: move all tasks that were originally below this one by the same delta
      const draggedOriginalStart = finished.draggedTaskOriginalStart

      // Create updates for every task affected
      const updateMap = new Map()

      // First, add the dragged task itself
      updateMap.set(task.id, {
        id: task.id,
        name: task.name,
        description: task.description,
        color: task.color,
        startTime: formatTime(finished.liveStartMinutes),
        durationMinutes: finished.liveDurationMinutes,
        completed: task.completed,
      })

      // Now find every task that was *originally* below the dragged one
      finished.originalTaskPositions.forEach(origPos => {
        if (origPos.id === task.id) return

        if (origPos.originalStart >= draggedOriginalStart) {
          // This task was below the dragged one — move it by the same delta
          const existingTask = tasks.find(t => t.id === origPos.id)
          if (existingTask) {
            const newStart = snapMinutes(origPos.originalStart + deltaMinutes)
            const clampedStart = clamp(newStart, 0, MINUTES_PER_DAY - SNAP_MINUTES)

            updateMap.set(existingTask.id, {
              id: existingTask.id,
              name: existingTask.name,
              description: existingTask.description,
              color: existingTask.color,
              startTime: formatTime(clampedStart),
              durationMinutes: existingTask.durationMinutes,
              completed: existingTask.completed,
            })
          }
        }
      })

      tasksToUpdate = Array.from(updateMap.values())
    } else {
      // Normal mode: only update the dragged task
      tasksToUpdate = [{
        id: task.id,
        name: task.name,
        description: task.description,
        color: task.color,
        startTime: formatTime(finished.liveStartMinutes),
        durationMinutes: finished.liveDurationMinutes,
        completed: task.completed,
      }]
    }

    // Persist all changes
    if (onPersistTaskChange) {
      Promise.resolve(onPersistTaskChange(tasksToUpdate)).catch((error) =>
        onPersistError ? onPersistError(error) : console.error('Failed to update tasks', error)
      )
    }
  }

  const handleDragPointerCancel = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    setDragState(null)
  }

  return (
    <section className="ob-timeline-board" aria-label="Timeline board">
      {showToolbar && (
        <BoardToolbar
          clock={liveClock ? clock : null}
          gapClearMode={gapClearMode}
          onToggleGapClear={() => setGapClearMode(!gapClearMode)}
          onResetDay={onResetDay}
          resetDisabled={resetDisabled}
          actions={toolbarActions}
          menuActions={toolbarMenuActions}
        />
      )}

      <div ref={setScrollContainer} className="ob-board-scroll">
        <div
          ref={trackRef}
          className={[
            'ob-board-track',
            gapClearMode ? 'is-gap-clear-mode' : ''
          ].filter(Boolean).join(' ')}
          style={{ height: `${boardHeightPx}px` }}
          onClick={handleTrackClick}
        >
          {Array.from({ length: 25 }).map((_, index) => (
            <div
              key={`grid-${index}`}
              className="ob-board-hour-line"
              style={{ top: `${(index * 60 * 100) / MINUTES_PER_DAY}%` }}
            >
              <span>{`${index.toString().padStart(2, '0')}:00`}</span>
            </div>
          ))}

          <div className="ob-board-task-layer">
            {tasks.flatMap((task, index) => {
              const storedStartTime = parseLocalTimeToMinutes(task.startTime);
              // endTime wraps past midnight (22:00 + 8h → 06:00), so the duration comes from durationMinutes (F011).
              const storedDuration = task.durationMinutes

              const isDragging = dragState?.taskId === task.id
              const taskStartTime = isDragging ? dragState.liveStartMinutes : storedStartTime
              const taskDuration = isDragging ? dragState.liveDurationMinutes : storedDuration
              const taskEndTime = taskStartTime + taskDuration
              // One block per part: `main` and, for an overnight task, `wrap` at the top of the board.
              const segments = taskSegments(taskStartTime, taskDuration)

              const isTogglingThis = isToggling.has(task.id)
              const isDone = onToggleComplete
                ? (isTogglingThis ? Boolean(completedTasks[index]) : Boolean(task.completed))
                : Boolean(completedTasks[index])
              const isActive = liveClock && segments.some((segment) => currentTime >= segment.start && currentTime < segment.end)

              return segments.map((segment, segmentIndex) => {
                const { part } = segment
                const top = (segment.start * 100) / MINUTES_PER_DAY
                const height = ((segment.end - segment.start) * 100) / MINUTES_PER_DAY

                return (
                <div
                  key={`${task.id}-${part}`}
                  ref={part === 'main' ? (element) => {
                    mainPartsRef.current.set(task.id, element)
                    return () => mainPartsRef.current.delete(task.id)
                  } : undefined}
                  data-part={part}
                  onPointerDown={(event) => beginDrag(event, 'move', task, storedStartTime, storedDuration)}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={(event) => handleDragPointerUp(event, task)}
                  onPointerCancel={handleDragPointerCancel}
                  onClick={(event) => event.stopPropagation()}
                  onMouseEnter={() => setHoveredTask(task)}
                  onMouseLeave={() => setHoveredTask(null)}
                  className={[
                    'ob-board-task',
                    isDone ? 'is-done' : '',
                    isActive ? 'is-active is-current' : '',
                    isDragging ? 'is-dragging' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ top: `${top}%`, height: `${height}%`, ...resolveTaskColor(task.color, palette) }}
                >
                  <div className="ob-board-task-content">
                    <span className="ob-board-task-name">{task.name}</span>
                    <span className="ob-board-task-time">
                      {formatTime(taskStartTime)} – {formatTime(taskEndTime)} · {showTaskDuration(taskDuration)}
                    </span>
                  </div>

                  {showCompletion && part === 'main' && (
                  <button
                    type="button"
                    onClick={(event) => toggleTaskCompletion(task, index, event)}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={[
                      'ob-board-task-check',
                      isDone ? 'is-checked' : '',
                      isTogglingThis ? 'is-toggling' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={isDone ? 'Mark as incomplete' : 'Mark as done'}
                    disabled={isTogglingThis}
                  >
                    {isTogglingThis ? '…' : isDone ? <CheckIcon size={14} strokeWidth={3} /> : null}
                  </button>
                  )}

                  {onRequestDeleteTask && part === 'main' && (
                    <button
                      type="button"
                      className="ob-board-task-delete"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDeleteConfirmTask(task)
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      aria-label={`Delete ${task.name}`}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  )}

                  {segmentIndex === segments.length - 1 && (
                  <div
                    className="ob-board-task-resize-handle"
                    onPointerDown={(event) => beginDrag(event, 'resize', task, storedStartTime, storedDuration)}
                    onPointerMove={(event) => {
                      event.stopPropagation()
                      handleDragPointerMove(event)
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation()
                      handleDragPointerUp(event, task)
                    }}
                    onPointerCancel={(event) => {
                      event.stopPropagation()
                      handleDragPointerCancel(event)
                    }}
                    onClick={(event) => event.stopPropagation()}
                    aria-hidden="true"
                  />
                  )}
                </div>
                )
              })
            })}
          </div>

          {liveClock && (
            <div
              className="ob-board-now-line"
              style={{ top: `${(currentTime * 100) / MINUTES_PER_DAY}%` }}
              aria-hidden="true"
            >
              <span className="ob-board-now-pill">{formatTime(currentTime)}</span>
            </div>
          )}
        </div>
      </div>

      {footer && (
        <div className="ob-board-footer" aria-live="polite">
          <span className="ob-board-footer-now">
            {footer.now ? (
              <>
                <span className="ob-board-footer-label">Now</span>
                <strong>{footer.now.name}</strong> · {formatMinutesLeft(footer.now.minutesLeft)}
              </>
            ) : (
              <span className="ob-board-footer-label">Nothing scheduled right now</span>
            )}
          </span>
          {footer.next ? (
            <span className="ob-board-footer-next">
              Next: {footer.next.name} at {footer.next.startTime}
            </span>
          ) : null}
        </div>
      )}

      {hoveredTask && (
        <div className="ob-board-tooltip">
          <strong>{hoveredTask.name}</strong>
          <span>
            {hoveredTask.startTime} - {hoveredTask.endTime} ({showTaskDuration(hoveredTask.durationMinutes)})
          </span>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmTask !== null}
        message={`Remove "${deleteConfirmTask?.name ?? 'this task'}" from your schedule?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!deleteConfirmTask) return
          setIsDeleting(true)
          try {
            await onRequestDeleteTask(deleteConfirmTask)
          } finally {
            setIsDeleting(false)
            setDeleteConfirmTask(null)
          }
        }}
        onCancel={() => setDeleteConfirmTask(null)}
      />
    </section>
  )
}

export default EditingBoard
