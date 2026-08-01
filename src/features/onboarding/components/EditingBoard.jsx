
import { useEffect, useMemo, useRef, useState } from 'react'

const MINUTES_PER_DAY = 1440
const BOARD_HEIGHT_PX = 2400

const basePalette = ['#0f172a', '#047857', '#0e7490', '#2563eb', '#c2410c', '#6d28d9', '#be123c', '#334155']

const initialBaseSchedule = [
  { name: 'Sleep', start: 0, end: 390 },
]

const getCurrentMinutes = () => {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

const calcDurationStr = (start, end) => {
  let diff = end - start
  if (diff < 0) diff += MINUTES_PER_DAY
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
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

const normalizeSchedule = (items) =>
  items.map((item, index) => {
    const startMinutes =
      item.start !== undefined && item.start !== null
        ? parseLocalTimeToMinutes(item.start)
        : parseLocalTimeToMinutes(item.startTime)

    const defaultEnd = Math.min(startMinutes + 60, MINUTES_PER_DAY)
    const endMinutes =
      item.end !== undefined && item.end !== null
        ? parseLocalTimeToMinutes(item.end, defaultEnd)
        : parseLocalTimeToMinutes(item.endTime, defaultEnd)

    return {
      id: item.id ?? `${index}-${startMinutes}-${endMinutes}`,
      name: item.name || `Block ${index + 1}`,
      start: startMinutes,
      end: endMinutes,
      color: item.color || basePalette[index % basePalette.length],
      duration: item.duration || calcDurationStr(startMinutes, endMinutes),
    }
  })

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

function EditingBoard({ storageKey = 'weekday', currentDefaultRoutine }) {

  const [currentTime, setCurrentTime] = useState(getCurrentMinutes())
  const [isLive, setIsLive] = useState(true)
  const [hoveredTask, setHoveredTask] = useState(null)
  const [draggedIdx, setDraggedIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const containerRef = useRef(null)

  const todayStr = new Date().toDateString()
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
    setScheduleData(baseSchedule)
    setCompletedTasks({})
  }

  const handleDragStart = (event, index) => {
    setDraggedIdx(index)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event, index) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverIdx !== index) {
      setDragOverIdx(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIdx(null)
  }

  const handleDrop = (event, dropIndex) => {
    event.preventDefault()
    setDragOverIdx(null)

    if (draggedIdx === null || draggedIdx === dropIndex) {
      return
    }

    const reordered = [...scheduleData]
    const draggedTask = reordered[draggedIdx]

    reordered.splice(draggedIdx, 1)
    reordered.splice(dropIndex, 0, draggedTask)

    let currentMin = 0
    reordered.forEach((task) => {
      let duration = task.endTime - task.startTime
      if (duration < 0) {
        duration += MINUTES_PER_DAY
      }
      task.startTime = currentMin
      task.endTime = currentMin + duration
      currentMin = task.endTime
      task.duration = calcDurationStr(task.startTime, task.endTime)
    })

    const remappedCompleted = {}
    reordered.forEach((task, newIdx) => {
      const oldIdx = scheduleData.findIndex((original) => original.id === task.id)
      if (completedTasks[oldIdx]) {
        remappedCompleted[newIdx] = true
      }
    })

    setCompletedTasks(remappedCompleted)
    setScheduleData(reordered)
    setDraggedIdx(null)
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
        <div className="ob-board-track" style={{ height: `${BOARD_HEIGHT_PX}px` }}>
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
              const taskStartTime = parseLocalTimeToMinutes(task.startTime);
              const taskEndTime = task.endTime != "00:00" ? parseLocalTimeToMinutes(task.endTime) : MINUTES_PER_DAY;

              const top = (taskStartTime * 100) / MINUTES_PER_DAY
              const height = ((taskEndTime - taskStartTime) * 100) / MINUTES_PER_DAY
              const isDone = Boolean(completedTasks[index])
              const isActive = currentTime >= taskStartTime && currentTime < taskEndTime
              

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(event) => handleDrop(event, index)}
                  onClick={() => {
                    setIsLive(false)
                    setCurrentTime(taskStartTime)
                  }}
                  onMouseEnter={() => setHoveredTask(task)}
                  onMouseLeave={() => setHoveredTask(null)}
                  className={[
                    'ob-board-task',
                    isDone ? 'is-done' : '',
                    isActive ? 'is-active' : '',
                    draggedIdx === index ? 'is-dragged' : '',
                    dragOverIdx === index ? 'is-drag-over' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{ top: `${top}%`, height: `${height}%`, backgroundColor: task.color ? task.color : basePalette[index % basePalette.length] }}
                >
                  <div className="ob-board-task-content">
                    <span className="ob-board-task-name">{task.name}</span>
                    <span className="ob-board-task-time">
                      {task.startTime} - {task.endTime} | {showTaskDuration(task.durationMinutes)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => toggleTaskCompletion(index, event)}
                    onDragStart={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
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