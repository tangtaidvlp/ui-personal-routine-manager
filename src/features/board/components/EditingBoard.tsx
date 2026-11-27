
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import styles from './EditingBoard.module.css'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import { CheckIcon } from '../../../components/icons/index.ts'
import { formatMinutesLeft, nowAndNext } from '../utils/nowAndNext.ts'
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
import { previewPositions, type Position, type TimedTask } from '../utils/dragPreview.ts'
import { breaksOverlapCap, OVERLAP_CAP_MESSAGE } from '../utils/overlapCap.ts'
import { layoutLanes } from '../utils/taskLanes.ts'
import { ApiError } from '../../../lib/api.ts'
import BoardNotice from './BoardNotice.tsx'
import BoardToolbar from './BoardToolbar.tsx'
import type { BoardProps, BoardTask } from '../types/board.ts'

const MINUTES_PER_DAY = 1440
const BASE_BOARD_HEIGHT_PX = 2400
const SNAP_MINUTES = 5
const MIN_DURATION_MINUTES = 5
const CLICK_DISTANCE_THRESHOLD_PX = 5
// Touch only: a press must be held this long, without moving, before it starts a drag (T002 R1).
const HOLD_TO_DRAG_MS = 100
const SAVE_FAILED_MESSAGE = "Something went wrong. Your change wasn't saved."
// The live board opens with "now" this far below the top of the view.
const LIVE_SCROLL_OFFSET_PX = 260

const parseLocalTimeToMinutes = (value: unknown, fallback = 0) => {
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

const showTaskDuration = (minutesDuration: number) => {
    const h = Math.floor(minutesDuration / 60)
    const m = minutesDuration % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    if (h < 0 && m > 0) return `${m}m`
    return `${m}m`
}

const formatTime = (minutes: number) => {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0')
  const m = Math.floor(normalized % 60)
    .toString()
    .padStart(2, '0')
  return `${h}:${m}`
}

const snapMinutes = (minutes: number, step = SNAP_MINUTES) => Math.round(minutes / step) * step

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

type DragState = {
  taskId: string | undefined
  mode: 'move' | 'resize'
  pointerId: number
  startClientY: number
  originalStartMinutes: number
  originalDurationMinutes: number
  liveStartMinutes: number
  liveDurationMinutes: number
}

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
 * the board's own clock; `pushMode` replaces its own Push mode state; `scrollContainerRef`
 * receives the scrolling element (for scroll sync).
 * `onResetDay` / `resetDisabled` (F012) go to the toolbar; without `onResetDay` there is no Reset day.
 * `showCompletion` (default true) false hides the "Mark as done" checks (F007 Reality board).
 * Hold-to-drag, instant drop with a locked "Saving…" state, side-by-side lanes, the 3-task cap and Push mode: T002.
 * `label` is declared in `BoardProps` but ignored: the board always says "Timeline board" (changing that would change what screen readers announce).
 */
function EditingBoard<T extends BoardTask>({
  routine,
  liveClock = true,
  toolbarActions = null,
  toolbarMenuActions = null,
  showFooter = liveClock,
  onRequestCreateTask,
  onRequestEditTask,
  onPersistTaskChange,
  onToggleComplete,
  onRequestDeleteTask,
  showToolbar = true,
  clock: sharedClock,
  pushMode: sharedPushMode,
  onResetDay,
  resetDisabled = false,
  scrollContainerRef,
  showCompletion = true,
}: BoardProps<T>) {
  // Task colours come from the backend palette; the stylesheet picks the light/dark pair (specs/F005).
  const { palette } = usePalette()
  // The board's own clock ticks only when no shared clock is passed.
  const ownClock = useBoardClock(liveClock && !sharedClock)
  const clock = sharedClock ?? ownClock
  const { currentTime } = clock
  const [hoveredTask, setHoveredTask] = useState<T | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  // One zoom level shared by every board and saved to the account (specs/F006 FR-010, FR-011).
  const { zoom: zoomLevel } = useBoardZoom()
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<T | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(new Set<string | undefined>())
  const [ownPushMode, setPushMode] = useState(false)
  const pushMode = sharedPushMode ?? ownPushMode
  // Where the dropped tasks stay while the save runs (T002 R2), and the bottom message.
  const [pending, setPending] = useState<Map<string | undefined, Position> | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // The press waiting to become a drag (null once armed, cancelled or released), and whether a drag is armed.
  const pressRef = useRef<{ timer: ReturnType<typeof setTimeout> | undefined; detach: () => void } | null>(null)
  const armedRef = useRef(false)
  const containerRef = useRef<HTMLElement | null>(null)
  const scrollContainerRefRef = useRef(scrollContainerRef)
  scrollContainerRefRef.current = scrollContainerRef
  const setScrollContainer = (element: HTMLElement | null) => {
    containerRef.current = element
    scrollContainerRefRef.current?.(element)
  }
  const trackRef = useRef<HTMLDivElement>(null)
  // Each task's `main` part, by id. A drag captures the pointer there, because a `wrap` part
  // (or the handle on it) can unmount mid-drag when the task stops crossing midnight (F011).
  const mainPartsRef = useRef(new Map<string | undefined, HTMLElement | null>())
  // With the capture on `main`, a press on a `wrap` part ends on `main`, so the browser sends the
  // click to their common parent (the track). Ignore that one click so it doesn't open "Add task".
  const ignoreTrackClickRef = useRef(false)

  const boardHeightPx = useMemo(() => BASE_BOARD_HEIGHT_PX * zoomLevel, [zoomLevel])
  const minutesPerPixel = useMemo(() => MINUTES_PER_DAY / boardHeightPx, [boardHeightPx])

  const tasks: T[] = routine?.tasks || [];
  const timedTasks: TimedTask[] = tasks.map((task) => ({
    id: task.id,
    start: parseLocalTimeToMinutes(task.startTime),
    duration: task.durationMinutes,
    overlay: task.overlay,
  }))

  const previewFor = (drag: DragState) =>
    previewPositions(
      timedTasks,
      {
        mode: drag.mode,
        taskId: drag.taskId,
        originalStart: drag.originalStartMinutes,
        originalDuration: drag.originalDurationMinutes,
        liveStart: drag.liveStartMinutes,
        liveDuration: drag.liveDurationMinutes,
      },
      pushMode,
    )

  // The 3-task cap, checked on the tasks the drag changes.
  const capIsBroken = (positions: Map<string | undefined, Position>) => {
    const changed = new Set<string | undefined>()
    const next = timedTasks.map((task) => {
      const position = positions.get(task.id)
      if (!position) return task
      if (position.start !== task.start || position.duration !== task.duration) changed.add(task.id)
      return { ...task, ...position }
    })
    return breaksOverlapCap(next, changed)
  }

  // What the board shows: the live drag, else the dropped result while saving, else what is stored.
  const preview = dragState ? previewFor(dragState) : null
  const blocked = preview !== null && capIsBroken(preview)

const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>(() => {
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



  // React's onTouchMove is passive, so the listener that stops the page scrolling while a drag is
  // armed is added by hand (T002 R1).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const stopScroll = (event: TouchEvent) => {
      if (armedRef.current && event.cancelable) event.preventDefault()
    }
    container.addEventListener('touchmove', stopScroll, { passive: false })
    return () => container.removeEventListener('touchmove', stopScroll)
  }, [])

  useEffect(() => () => clearPress(), [])

  const footer = liveClock && showFooter ? nowAndNext(tasks, currentTime) : null

  const toggleTaskCompletion = async (task: T, index: number, event: MouseEvent) => {
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

  const handleTrackClick = (event: MouseEvent) => {
    if (pending) {
      return
    }
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

  const clearPress = () => {
    const press = pressRef.current
    if (!press) return
    clearTimeout(press.timer)
    press.detach()
    pressRef.current = null
  }

  // Hold-to-drag (T002 R1), touch only: a press only becomes a drag after HOLD_TO_DRAG_MS without
  // moving more than the tolerance. Before that, a swipe scrolls the board and a tap opens the task.
  // With a mouse, the drag starts once the pointer moves past the tolerance. Until the drag is armed
  // the pointer is not captured; window listeners watch the press.
  const beginPress = (
    event: PointerEvent<HTMLElement>,
    mode: DragState['mode'],
    task: T,
    originalStartMinutes: number,
    originalDurationMinutes: number,
  ) => {
    event.stopPropagation()
    if (pending || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }
    clearPress()
    const { pointerId, clientX: startX, clientY: startY } = event
    const captureTarget = mainPartsRef.current.get(task.id) ?? event.currentTarget
    const movedFar = (e: globalThis.PointerEvent) => Math.hypot(e.clientX - startX, e.clientY - startY) > CLICK_DISTANCE_THRESHOLD_PX

    const isTouch = event.pointerType === 'touch'
    const arm = () => {
      armedRef.current = true
      try {
        captureTarget.setPointerCapture(pointerId)
      } catch {
        // The pointer is already gone.
      }
      setDragState({
        taskId: task.id,
        mode,
        pointerId,
        startClientY: startY,
        originalStartMinutes,
        originalDurationMinutes,
        liveStartMinutes: originalStartMinutes,
        liveDurationMinutes: originalDurationMinutes,
      })
    }

    // Touch: moving past the tolerance cancels the hold (it is a scroll), but the release is still
    // watched: the click that follows it must not reach the track and open "Add task".
    // Mouse and pen: there is no scroll to tell apart, so moving past the tolerance starts the drag.
    let moved = false
    const onMove = (e: globalThis.PointerEvent) => {
      if (e.pointerId === pointerId && !armedRef.current && !moved && movedFar(e)) {
        clearTimeout(pressRef.current?.timer)
        if (isTouch) {
          moved = true
        } else {
          arm()
        }
      }
    }
    const onUp = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== pointerId || armedRef.current) return
      const isTap = !moved && !movedFar(e)
      clearPress()
      if (isTap && mode === 'move') {
        onRequestEditTask?.(task)
      } else if (!isTap) {
        ignoreTrackClickRef.current = true
        setTimeout(() => {
          ignoreTrackClickRef.current = false
        }, 0)
      }
    }
    const onCancel = (e: globalThis.PointerEvent) => {
      if (e.pointerId === pointerId && !armedRef.current) clearPress()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)

    const timer = isTouch ? setTimeout(arm, HOLD_TO_DRAG_MS) : undefined

    pressRef.current = {
      timer,
      detach: () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onCancel)
      },
    }
  }

  const handleDragPointerMove = (event: PointerEvent) => {
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

  const handleDragPointerUp = async (event: PointerEvent) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    const finished = dragState
    setDragState(null)
    armedRef.current = false
    clearPress()
    // The click (if any) follows this pointerup in the same turn; clear the flag after it.
    ignoreTrackClickRef.current = true
    setTimeout(() => {
      ignoreTrackClickRef.current = false
    }, 0)

    const positions = previewFor(finished)
    const dragged = positions.get(finished.taskId)
    const stored = timedTasks.find((task) => task.id === finished.taskId)
    if (!dragged || !stored || (dragged.start === stored.start && dragged.duration === stored.duration)) {
      return
    }
    if (capIsBroken(positions)) {
      setNotice(OVERLAP_CAP_MESSAGE)
      return
    }

    // The dragged task, plus every task Push mode moved.
    const tasksToUpdate: BoardTask[] = tasks
      .filter((task) => positions.has(task.id))
      .map((task) => {
        const position = positions.get(task.id)!
        return {
          id: task.id,
          name: task.name,
          description: task.description,
          color: task.color,
          startTime: formatTime(position.start),
          durationMinutes: position.duration,
          completed: task.completed,
        }
      })

    if (!onPersistTaskChange) {
      return
    }
    // Show the drop at once and lock the board until the save settles (T002 R2).
    setPending(positions)
    try {
      await onPersistTaskChange(tasksToUpdate)
    } catch (error) {
      setNotice(
        error instanceof ApiError && error.status >= 400 && error.status < 500
          ? error.message
          : SAVE_FAILED_MESSAGE,
      )
    } finally {
      setPending(null)
    }
  }

  const handleDragPointerCancel = (event: PointerEvent) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    armedRef.current = false
    clearPress()
    setDragState(null)
  }

  return (
    <section className="ob-timeline-board" aria-label="Timeline board" aria-busy={pending !== null}>
      {showToolbar && (
        <div className={styles.toolbarWrap} inert={pending !== null}>
          <BoardToolbar
            clock={liveClock ? clock : null}
            pushMode={pushMode}
            onTogglePushMode={() => setPushMode(!pushMode)}
            onResetDay={onResetDay}
            resetDisabled={resetDisabled}
            actions={toolbarActions}
            menuActions={toolbarMenuActions}
          />
        </div>
      )}

      <div ref={setScrollContainer} className="ob-board-scroll">
        <div
          ref={trackRef}
          className={[
            styles.track,
            pushMode ? styles.pushMode : ''
          ].filter(Boolean).join(' ')}
          style={{ height: `${boardHeightPx}px` }}
          data-saving={pending !== null ? 'true' : undefined}
          onClick={handleTrackClick}
          onContextMenu={(event) => {
            // A long press must not open the browser menu while it waits to become a drag.
            if (pressRef.current || armedRef.current) event.preventDefault()
          }}
        >
          {Array.from({ length: 25 }).map((_, index) => (
            <div
              key={`grid-${index}`}
              className={styles.hourLine}
              style={{ top: `${(index * 60 * 100) / MINUTES_PER_DAY}%` }}
            >
              <span>{`${index.toString().padStart(2, '0')}:00`}</span>
            </div>
          ))}

          <div className="ob-board-task-layer">
            {(() => {
              const items = tasks.map((task, index) => {
                const stored = timedTasks[index]
                // An Overlay-off task follows the pointer while it is moved; the map holds its drop slot (F017 R2).
                const followsPointer = dragState?.mode === 'move' && dragState.taskId === task.id && task.overlay === false
                const shown = followsPointer
                  ? { start: dragState.liveStartMinutes, duration: stored.duration }
                  : preview?.get(task.id) ?? pending?.get(task.id) ?? stored
                // endTime wraps past midnight (22:00 + 8h → 06:00), so the duration comes from durationMinutes (F011).
                return { task, index, start: shown.start, duration: shown.duration, storedStart: stored.start, storedDuration: stored.duration, segments: taskSegments(shown.start, shown.duration) }
              })
              // The dragged task floats full width on top (`.is-dragging`) and stays out of the lanes, so the
              // other tasks never shift sideways during a drag. Lanes are worked out again after the drop.
              const lanes = layoutLanes(
                items
                  .filter((item) => item.task.id !== dragState?.taskId)
                  .flatMap((item) =>
                    item.segments.map((segment) => ({ key: `${item.task.id}-${segment.part}`, start: segment.start, end: segment.end })),
                  ),
              )
              return items.flatMap(({ task, index, start: taskStartTime, duration: taskDuration, storedStart: storedStartTime, storedDuration, segments }) => {
              const isDragging = dragState !== null && dragState.taskId === task.id
              const taskEndTime = taskStartTime + taskDuration

              const isTogglingThis = isToggling.has(task.id)
              const isDone = onToggleComplete
                ? (isTogglingThis ? Boolean(completedTasks[index]) : Boolean(task.completed))
                : Boolean(completedTasks[index])
              const isActive = liveClock && segments.some((segment) => currentTime >= segment.start && currentTime < segment.end)

              return segments.map((segment, segmentIndex) => {
                const { part } = segment
                const top = (segment.start * 100) / MINUTES_PER_DAY
                const height = ((segment.end - segment.start) * 100) / MINUTES_PER_DAY
                const { lane, lanes: laneCount } = lanes.get(`${task.id}-${part}`) ?? { lane: 0, lanes: 1 }

                return (
                <div
                  key={`${task.id}-${part}`}
                  ref={part === 'main' ? (element) => {
                    mainPartsRef.current.set(task.id, element)
                    return () => {
                      mainPartsRef.current.delete(task.id)
                    }
                  } : undefined}
                  data-part={part}
                  data-blocked={isDragging && blocked ? 'true' : undefined}
                  onPointerDown={(event) => beginPress(event, 'move', task, storedStartTime, storedDuration)}
                  onPointerMove={handleDragPointerMove}
                  onPointerUp={handleDragPointerUp}
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
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    left: `${(lane * 100) / laneCount}%`,
                    width: `${100 / laneCount}%`,
                    right: 'auto',
                    ...resolveTaskColor(task.color, palette),
                  }}
                >
                  <div className={styles.taskContent}>
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
                      styles.taskCheck,
                      isDone ? styles.checked : '',
                      isTogglingThis ? styles.toggling : '',
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
                    onPointerDown={(event) => beginPress(event, 'resize', task, storedStartTime, storedDuration)}
                    onPointerMove={(event) => {
                      event.stopPropagation()
                      handleDragPointerMove(event)
                    }}
                    onPointerUp={(event) => {
                      event.stopPropagation()
                      handleDragPointerUp(event)
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
              })
            })()}
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

      {pending !== null && (
        <div role="status" className={styles.saving}>
          <span className="visually-hidden">Saving…</span>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.dot} aria-hidden="true" />
        </div>
      )}

      {footer && (
        <div className={styles.footer} aria-live="polite">
          <span className={styles.footerNow}>
            {footer.now ? (
              <>
                <span className={styles.footerLabel}>Now</span>
                <strong>{footer.now.name}</strong> · {formatMinutesLeft(footer.now.minutesLeft)}
              </>
            ) : (
              <span className={styles.footerLabel}>Nothing scheduled right now</span>
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
        <div className={styles.tooltip}>
          <strong>{hoveredTask.name}</strong>
          <span>
            {hoveredTask.startTime} - {hoveredTask.endTime} ({showTaskDuration(hoveredTask.durationMinutes)})
          </span>
        </div>
      )}

      <BoardNotice message={notice} tone="error" onDismiss={() => setNotice(null)} />

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
            await onRequestDeleteTask?.(deleteConfirmTask)
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
