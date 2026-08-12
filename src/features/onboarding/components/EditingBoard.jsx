
import { useEffect, useRef, useState } from 'react'
import { updateDefaultTasks } from '../api/defaultRoutineTasks.ts'

const MINUTES_PER_DAY = 1440
const BOARD_HEIGHT_PX = 2400
const MINUTES_PER_PIXEL = MINUTES_PER_DAY / BOARD_HEIGHT_PX
const SNAP_MINUTES = 15
const MIN_DURATION_MINUTES = 15
const CLICK_DISTANCE_THRESHOLD_PX = 5

const basePalette = ['#0f172a', '#047857', '#0e7490', '#2563eb', '#c2410c', '#6d28d9', '#be123c', '#334155']

const getCurrentMinutes = () => {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

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

function EditingBoard({ currentDefaultRoutine, onRequestCreateTask, onRequestEditTask, onTaskUpdated }) {

  const [currentTime, setCurrentTime] = useState(getCurrentMinutes())
  const [isLive, setIsLive] = useState(true)
  const [hoveredTask, setHoveredTask] = useState(null)
  const [dragState, setDragState] = useState(null)
  const containerRef = useRef(null)
  const trackRef = useRef(null)

  const currentDefaultRoutineTasks = currentDefaultRoutine?.tasks || [];

const [completedTasks, setCompletedTasks] = useState(() => {
    return {}
  })

  useEffect(() => {
    if (!containerRef.current) {
      return
    }
    const scrollPosition = (currentTime / MINUTES_PER_DAY) * BOARD_HEIGHT_PX - 260
    containerRef.current.scrollTop = Math.max(0, scrollPosition)
  }, [currentTime])

  useEffect(() => {
    let intervalId
    if (isLive) {
      setCurrentTime(getCurrentMinutes())
      intervalId = setInterval(() => {
        setCurrentTime(getCurrentMinutes())
      }, 60000)
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isLive])


  const activeTask =
    currentDefaultRoutineTasks.find((task) => currentTime >= parseLocalTimeToMinutes(task.startTime) && currentTime < parseLocalTimeToMinutes(task.endTime)) || currentDefaultRoutineTasks[currentDefaultRoutineTasks.length - 1]

  const handleSliderChange = (event) => {
    setIsLive(false)
    setCurrentTime(parseInt(event.target.value, 10))
  }

  const toggleTaskCompletion = (index, event) => {
    event.stopPropagation()
    setCompletedTasks((current) => ({
      ...current,
      [index]: !current[index],
    }))
  }

  const handleResetSchedule = () => {
    setCompletedTasks({})
  }

  const handleTrackClick = (event) => {
    if (!trackRef.current || !onRequestCreateTask) {
      return
    }
    const rect = trackRef.current.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const snapped = snapMinutes(offsetY * MINUTES_PER_PIXEL)
    const startMinutes = clamp(snapped, 0, MINUTES_PER_DAY - 30)

    onRequestCreateTask({ name: '', startTime: formatTime(startMinutes), durationMinutes: 30 })
  }

  const beginDrag = (event, mode, task, originalStartMinutes, originalDurationMinutes) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragState({
      taskId: task.id,
      mode,
      pointerId: event.pointerId,
      startClientY: event.clientY,
      originalStartMinutes,
      originalDurationMinutes,
      liveStartMinutes: originalStartMinutes,
      liveDurationMinutes: originalDurationMinutes,
    })
  }

  const handleDragPointerMove = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    const deltaMinutes = snapMinutes((event.clientY - dragState.startClientY) * MINUTES_PER_PIXEL)

    if (dragState.mode === 'move') {
      const maxStart = MINUTES_PER_DAY - dragState.originalDurationMinutes
      const liveStartMinutes = clamp(dragState.originalStartMinutes + deltaMinutes, 0, maxStart)
      setDragState((current) => (current && current.pointerId === event.pointerId ? { ...current, liveStartMinutes } : current))
    } else {
      const maxDuration = MINUTES_PER_DAY - dragState.originalStartMinutes
      const liveDurationMinutes = clamp(dragState.originalDurationMinutes + deltaMinutes, MIN_DURATION_MINUTES, maxDuration)
      setDragState((current) => (current && current.pointerId === event.pointerId ? { ...current, liveDurationMinutes } : current))
    }
  }

  const handleDragPointerUp = (event, task) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    const finished = dragState
    setDragState(null)

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

    const updatedTask = {
      id: task.id,
      name: task.name,
      description: task.description,
      color: task.color,
      startTime: formatTime(finished.liveStartMinutes),
      durationMinutes: finished.liveDurationMinutes,
    }

    updateDefaultTasks([updatedTask])
      .then(() => onTaskUpdated?.())
      .catch((error) => console.error('Failed to update task', error))
  }

  const handleDragPointerCancel = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return
    }
    setDragState(null)
  }

  return (
    <section className="ob-timeline-board" aria-label="Timeline board">
      <div className="ob-board-toolbar">
        <div className="ob-board-time">
          <strong>{formatTime(currentTime)}</strong>
          <span>{isLive ? 'Live' : 'Manual'}</span>
        </div>
        <div className="ob-board-actions">
          <button type="button" className="ob-board-btn" onClick={() => setIsLive((current) => !current)}>
            {isLive ? 'Pause clock' : 'Resume live'}
          </button>
          <button type="button" className="ob-board-btn ob-board-btn-reset" onClick={handleResetSchedule}>
            Reset day
          </button>
        </div>
      </div>

      <div className="ob-board-slider-wrap">
        <input
          type="range"
          min="0"
          max="1439"
          step="1"
          value={currentTime}
          onChange={handleSliderChange}
          className="ob-board-slider"
          aria-label="Timeline current time"
        />
      </div>

      <div ref={containerRef} className="ob-board-scroll">
        <div ref={trackRef} className="ob-board-track" style={{ height: `${BOARD_HEIGHT_PX}px` }} onClick={handleTrackClick}>
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
            {currentDefaultRoutineTasks.map((task, index) => {
              const storedStartTime = parseLocalTimeToMinutes(task.startTime);
              const storedEndTime = task.endTime != "00:00" ? parseLocalTimeToMinutes(task.endTime) : MINUTES_PER_DAY;
              const storedDuration = storedEndTime - storedStartTime

              const isDragging = dragState?.taskId === task.id
              const taskStartTime = isDragging ? dragState.liveStartMinutes : storedStartTime
              const taskDuration = isDragging ? dragState.liveDurationMinutes : storedDuration
              const taskEndTime = taskStartTime + taskDuration

              const top = (taskStartTime * 100) / MINUTES_PER_DAY
              const height = (taskDuration * 100) / MINUTES_PER_DAY
              const isDone = Boolean(completedTasks[index])
              const isActive = currentTime >= taskStartTime && currentTime < taskEndTime

              return (
                <div
                  key={task.id}
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
                    isActive ? 'is-active' : '',
                    isDragging ? 'is-dragging' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ top: `${top}%`, height: `${height}%`, backgroundColor: task.color ? task.color : basePalette[index % basePalette.length] }}
                >
                  <div className="ob-board-task-content">
                    <span className="ob-board-task-name">{task.name}</span>
                    <span className="ob-board-task-time">
                      {formatTime(taskStartTime)} - {formatTime(taskEndTime)} | {showTaskDuration(taskDuration)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => toggleTaskCompletion(index, event)}
                    onPointerDown={(event) => event.stopPropagation()}
                    className={[
                      'ob-board-task-check',
                      isDone ? 'is-checked' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={isDone ? 'Mark as incomplete' : 'Mark as done'}
                  >
                    {isDone ? '✓' : ''}
                  </button>

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
                </div>
              )
            })}
          </div>

          <div
            className="ob-board-now-line"
            style={{ top: `${(currentTime * 100) / MINUTES_PER_DAY}%` }}
            aria-hidden="true"
          >
            <span className="ob-board-now-dot" />
          </div>
        </div>
      </div>

      {activeTask && (
        <div className="ob-board-status">Now: {activeTask.name}</div>
      )}

      {hoveredTask && (
        <div className="ob-board-tooltip">
          <strong>{hoveredTask.name}</strong>
          <span>
            {hoveredTask.startTime} - {hoveredTask.endTime} ({showTaskDuration(hoveredTask.durationMinutes)})
          </span>
        </div>
      )}
    </section>
  )
}

export default EditingBoard
