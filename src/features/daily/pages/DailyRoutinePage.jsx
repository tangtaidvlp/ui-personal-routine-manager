import { useEffect, useState } from 'react'
import EditingBoard from '../../onboarding/components/EditingBoard.jsx'
import TaskEditModal from '../../onboarding/components/TaskEditModal.tsx'
import FabButton from '../../onboarding/components/FabButton.tsx'
import {
  fetchDailyRoutine,
  ensureDailyRoutine,
  createDailyTasks,
  updateDailyTasks,
  deleteDailyTasks,
} from '../api/dailyRoutineTasks.ts'

const MINUTES_PER_DAY = 1440

function toDateInputValue(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTimeOfDay(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = Math.floor(minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function nextDefaultDraftTask() {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.min(Math.ceil(nowMinutes / 30) * 30, MINUTES_PER_DAY - 30)
  return { name: '', startTime: formatTimeOfDay(rounded), durationMinutes: 30 }
}

function parseDateInputValue(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function LogoMark() {
  return (
    <div className="ob-brand-mark" aria-hidden="true">
      <span>R</span>
    </div>
  )
}

function DailyRoutinePage({ user, onLogout }) {
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()))
  const [currentDailyRoutine, setCurrentDailyRoutine] = useState(null)
  const [taskModalState, setTaskModalState] = useState(null)

  const refreshDailyRoutine = async () => {
    if (!user?.id) {
      return
    }
    try {
      const routine = await fetchDailyRoutine(user.id, selectedDate)
      setCurrentDailyRoutine(routine)
    } catch (error) {
      console.error('Failed to fetch daily routine:', error)
      setCurrentDailyRoutine({ date: selectedDate, tasks: [] })
    }
  }

  useEffect(() => {
    refreshDailyRoutine()
  }, [selectedDate, user?.id])

  const openCreateTaskModal = (draft) => {
    setTaskModalState({ mode: 'create', draft })
  }

  const openEditTaskModal = (task) => {
    setTaskModalState({ mode: 'edit', draft: task })
  }

  const closeTaskModal = () => setTaskModalState(null)

  const shiftDate = (deltaDays) => {
    const date = parseDateInputValue(selectedDate)
    date.setDate(date.getDate() + deltaDays)
    setSelectedDate(toDateInputValue(date))
  }

  const handleSubmitTask = async (mode, task) => {
    let routineId = currentDailyRoutine?.id
    if (!routineId) {
      // No real DailyRoutine yet for this date (only happens for non-today
      // dates that haven't been touched) — create it now, cloning from the
      // default routine.
      const ensured = await ensureDailyRoutine(user.id, selectedDate)
      routineId = ensured.id
    }

    if (mode === 'create') {
      return createDailyTasks(routineId, [{ ...task, completed: false }])
    }

    const existing = currentDailyRoutine?.tasks?.find((current) => current.id === task.id)
    return updateDailyTasks([{ ...task, completed: existing?.completed ?? false }])
  }

  const handlePersistTaskChange = async (updatedTask) => {
    const existing = currentDailyRoutine?.tasks?.find((current) => current.id === updatedTask.id)
    await updateDailyTasks([{ ...updatedTask, completed: existing?.completed ?? false }])
    await refreshDailyRoutine()
  }

  const handleToggleComplete = async (task) => {
    await updateDailyTasks([
      {
        id: task.id,
        name: task.name,
        description: task.description,
        startTime: task.startTime,
        durationMinutes: task.durationMinutes,
        completed: !task.completed,
      },
    ])
    await refreshDailyRoutine()
  }

  const handleCleanUp = async () => {
    const taskIds = (currentDailyRoutine?.tasks ?? []).map((task) => task.id).filter(Boolean)
    if (taskIds.length === 0) {
      return
    }
    await deleteDailyTasks(taskIds)
    await refreshDailyRoutine()
  }

  const hasTasks = (currentDailyRoutine?.tasks ?? []).length > 0

  return (
    <div className="dr-page">
      <header className="dr-topbar">
        <div className="ob-brand">
          <LogoMark />
          <span className="ob-brand-name">
            Routine <strong>Canvas</strong>
          </span>
        </div>
        <button type="button" className="dr-logout-btn" onClick={onLogout}>
          Sign Out
        </button>
      </header>

      <div className="dr-date-bar">
        <button type="button" className="dr-date-nav-btn" onClick={() => shiftDate(-1)} aria-label="Previous day">
          ‹
        </button>
        <input
          type="date"
          className="dr-date-input"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
        <button type="button" className="dr-date-nav-btn" onClick={() => shiftDate(1)} aria-label="Next day">
          ›
        </button>
        <button
          type="button"
          className="dr-cleanup-btn"
          onClick={handleCleanUp}
          disabled={!hasTasks}
        >
          Clean up
        </button>
      </div>

      <main className="dr-main">
        <section className="dr-canvas-card">
          <EditingBoard
            routine={currentDailyRoutine}
            onRequestCreateTask={openCreateTaskModal}
            onRequestEditTask={openEditTaskModal}
            onPersistTaskChange={handlePersistTaskChange}
            onToggleComplete={handleToggleComplete}
          />
        </section>
      </main>

      <div className="ob-fab-group">
        <FabButton onClick={() => openCreateTaskModal(nextDefaultDraftTask())} />
      </div>

      <TaskEditModal
        isOpen={Boolean(taskModalState)}
        mode={taskModalState?.mode ?? 'create'}
        draftTask={taskModalState?.draft ?? null}
        onSubmitTask={handleSubmitTask}
        onClose={closeTaskModal}
        onSaved={refreshDailyRoutine}
        showColor={false}
      />
    </div>
  )
}

export default DailyRoutinePage
