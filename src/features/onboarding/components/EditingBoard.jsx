
import { useEffect, useMemo, useRef, useState } from 'react'

const MINUTES_PER_DAY = 1440
const BOARD_HEIGHT_PX = 2400

const basePalette = ['#0f172a', '#047857', '#0e7490', '#2563eb', '#c2410c', '#6d28d9', '#be123c', '#334155']

const initialBaseSchedule = [
  { name: 'Sleep', start: 0, end: 390 },
  { name: 'Morning workout', start: 390, end: 435 },
  { name: 'Breakfast and reset', start: 435, end: 515 },
  { name: 'Deep work block', start: 515, end: 750 },
  { name: 'Lunch and social', start: 750, end: 930 },
  { name: 'Rest and recharge', start: 930, end: 1080 },
  { name: 'Commute or errands', start: 1080, end: 1290 },
  { name: 'Evening unwind', start: 1290, end: 1410 },
  { name: 'Night shutdown', start: 1410, end: 1440 },
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

const normalizeSchedule = (items) =>
  items.map((item, index) => ({
    id: item.id ?? `${index}-${item.start}-${item.end}`,
    name: item.name || `Block ${index + 1}`,
    start: Number(item.start) || 0,
    end: Number(item.end) || 0,
    color: item.color || basePalette[index % basePalette.length],
    duration: item.duration || calcDurationStr(Number(item.start) || 0, Number(item.end) || 0),
  }))

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

function EditingBoard({ storageKey = 'weekday' }) {
  const [currentTime, setCurrentTime] = useState(getCurrentMinutes())
  const [isLive, setIsLive] = useState(true)
  const [hoveredTask, setHoveredTask] = useState(null)
  const [draggedIdx, setDraggedIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const containerRef = useRef(null)

  const todayStr = new Date().toDateString()
  const storagePrefix = useMemo(() => `onboarding_timeline_${storageKey}_`, [storageKey])

  const [baseSchedule, setBaseSchedule] = useState(() => {
    const saved = localStorage.getItem(`${storagePrefix}baseSchedule`)
    return saved ? normalizeSchedule(JSON.parse(saved)) : normalizeSchedule(initialBaseSchedule)
  })

  const [scheduleData, setScheduleData] = useState(() => {
    const savedDate = localStorage.getItem(`${storagePrefix}date`)
    const savedSchedule = localStorage.getItem(`${storagePrefix}scheduleData`)
    if (savedDate === todayStr && savedSchedule) {
      return normalizeSchedule(JSON.parse(savedSchedule))
    }
    const savedBase = localStorage.getItem(`${storagePrefix}baseSchedule`)
    return savedBase ? normalizeSchedule(JSON.parse(savedBase)) : normalizeSchedule(initialBaseSchedule)
  })

  const [completedTasks, setCompletedTasks] = useState(() => {
    const savedDate = localStorage.getItem(`${storagePrefix}date`)
    const savedTasks = localStorage.getItem(`${storagePrefix}completedTasks`)
    return savedDate === todayStr && savedTasks ? JSON.parse(savedTasks) : {}
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

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}baseSchedule`, JSON.stringify(baseSchedule))
  }, [baseSchedule, storagePrefix])

  useEffect(() => {
    localStorage.setItem(`${storagePrefix}date`, todayStr)
    localStorage.setItem(`${storagePrefix}scheduleData`, JSON.stringify(scheduleData))
    localStorage.setItem(`${storagePrefix}completedTasks`, JSON.stringify(completedTasks))
  }, [scheduleData, completedTasks, storagePrefix, todayStr])

  const activeTask =
    scheduleData.find((task) => currentTime >= task.start && currentTime < task.end) || scheduleData[scheduleData.length - 1]

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
      let duration = task.end - task.start
      if (duration < 0) {
        duration += MINUTES_PER_DAY
      }
      task.start = currentMin
      task.end = currentMin + duration
      currentMin = task.end
      task.duration = calcDurationStr(task.start, task.end)
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
            {scheduleData.map((task, index) => {
              const top = (task.start * 100) / MINUTES_PER_DAY
              const height = ((task.end - task.start) * 100) / MINUTES_PER_DAY
              const isDone = Boolean(completedTasks[index])
              const isActive = currentTime >= task.start && currentTime < task.end

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
                    setCurrentTime(task.start)
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
                  style={{ top: `${top}%`, height: `${height}%`, backgroundColor: task.color }}
                >
                  <div className="ob-board-task-content">
                    <span className="ob-board-task-name">{task.name}</span>
                    <span className="ob-board-task-time">
                      {formatTime(task.start)} - {formatTime(task.end)} | {task.duration}
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
            {formatTime(hoveredTask.start)} - {formatTime(hoveredTask.end)} ({hoveredTask.duration})
          </span>
        </div>
      )}
    </section>
  )
}

export default EditingBoard