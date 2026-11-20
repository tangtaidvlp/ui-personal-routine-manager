import { useEffect, useRef, useState } from 'react'
import EditingBoard from '../../onboarding/components/EditingBoard.jsx'
import TaskEditModal from '../../onboarding/components/TaskEditModal.tsx'
import FabButton from '../../onboarding/components/FabButton.tsx'
import BuddyChat, { SendIcon } from '../../onboarding/components/BuddyChat.jsx'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/icons/index.ts'
import { routineTypeForDate, routineTypeLabel } from '../../onboarding/utils/routineTypeForDate.ts'
import {
  fetchDailyRoutine,
  ensureDailyRoutine,
  createDailyTasks,
  updateDailyTasks,
  deleteDailyTasks,
  submitDailyRoutineChat,
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

const HEADING_DATE = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }
const SHORT_DATE = { weekday: 'short', day: 'numeric', month: 'short' }

function DailyRoutinePage() {
  const { user } = useShellContext()
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()))
  const dateInputRef = useRef(null)
  const [currentDailyRoutine, setCurrentDailyRoutine] = useState(null)
  const [taskModalState, setTaskModalState] = useState(null)
  const [mobileView, setMobileView] = useState('board')

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

  const handleDeleteTask = async (task) => {
    if (!task?.id) {
      return
    }
    try {
      await deleteDailyTasks([task.id])
      await refreshDailyRoutine()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

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

  const handlePersistTaskChange = async (updatedTasks) => {
    const tasks = Array.isArray(updatedTasks) ? updatedTasks : [updatedTasks]

    // Preserve existing completed status for each task
    const tasksToUpdate = tasks.map(task => {
      const existing = currentDailyRoutine?.tasks?.find((current) => current.id === task.id)
      return { ...task, completed: existing?.completed ?? false }
    })

    await updateDailyTasks(tasksToUpdate)
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
  const todayValue = toDateInputValue(new Date())
  const isToday = selectedDate === todayValue
  const selectedDay = parseDateInputValue(selectedDate)
  const routineLabel = routineTypeLabel(routineTypeForDate(selectedDay))

  const openDatePicker = () => {
    const input = dateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
        return
      } catch {
        // Some browsers refuse showPicker outside a direct gesture; fall back to focus.
      }
    }
    input.focus()
  }

  return (
    <div className="dr-page" data-mobile-view={mobileView}>
      <PageHeader>
        <p className="dr-breadcrumb">
          {isToday ? 'Today' : selectedDay.toLocaleDateString('en-GB', { weekday: 'long' })} · {routineLabel}
        </p>
        <div className="dr-date-row">
          <button type="button" className="ui-icon-btn" onClick={() => shiftDate(-1)} aria-label="Previous day">
            <ChevronLeftIcon size={16} />
          </button>
          <div className="dr-date-heading">
            <h1>
              <button type="button" className="dr-date-trigger" onClick={openDatePicker} aria-label="Pick a date">
                <span className="dr-date-long">{selectedDay.toLocaleDateString('en-GB', HEADING_DATE)}</span>
                <span className="dr-date-short">{selectedDay.toLocaleDateString('en-GB', SHORT_DATE)}</span>
              </button>
            </h1>
            <input
              ref={dateInputRef}
              type="date"
              className="dr-date-input"
              value={selectedDate}
              onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <button type="button" className="ui-icon-btn" onClick={() => shiftDate(1)} aria-label="Next day">
            <ChevronRightIcon size={16} />
          </button>
          <button type="button" className="ui-btn" onClick={() => setSelectedDate(todayValue)} disabled={isToday}>
            Today
          </button>
        </div>
      </PageHeader>

      <main className="dr-main">
        <section className="dr-canvas-card">
          <EditingBoard
            routine={currentDailyRoutine}
            onRequestCreateTask={openCreateTaskModal}
            onRequestEditTask={openEditTaskModal}
            onPersistTaskChange={handlePersistTaskChange}
            onToggleComplete={handleToggleComplete}
            onRequestDeleteTask={handleDeleteTask}
            toolbarActions={
              <>
                <button type="button" className="ui-btn ui-btn-danger-text" onClick={handleCleanUp} disabled={!hasTasks}>
                  Clean up
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary dr-add-task-btn"
                  onClick={() => openCreateTaskModal(nextDefaultDraftTask())}
                >
                  + Add task
                </button>
              </>
            }
          />
        </section>

        <BuddyChat
          title="Routine Buddy"
          subtitle={`Here to help with ${selectedDay.toLocaleDateString('en-GB', SHORT_DATE)}`}
          initialMessage="Hi! Ask me to add, adjust, or check off tasks for this day."
          placeholder='Try: "Mark my workout as done"'
          onSend={(message) => submitDailyRoutineChat(user.id, currentDailyRoutine, selectedDate, message)}
          onAfterSend={() => {
            refreshDailyRoutine()
            setMobileView('board')
          }}
        />
      </main>

      <div className="ob-fab-group">
        <FabButton onClick={() => openCreateTaskModal(nextDefaultDraftTask())} />
        <button
          type="button"
          className="ob-fab-btn-chat"
          aria-label="Chat with Routine Buddy"
          onClick={() => setMobileView('chat')}
        >
          <SendIcon />
        </button>
      </div>

      <button type="button" className="ob-fab-btn-view-schedule" onClick={() => setMobileView('board')}>
        View schedule
      </button>

      <TaskEditModal
        isOpen={Boolean(taskModalState)}
        mode={taskModalState?.mode ?? 'create'}
        draftTask={taskModalState?.draft ?? null}
        onSubmitTask={handleSubmitTask}
        onClose={closeTaskModal}
        onSaved={refreshDailyRoutine}
        onDeleteTask={handleDeleteTask}
        showColor={false}
      />

    </div>
  )
}

export default DailyRoutinePage
