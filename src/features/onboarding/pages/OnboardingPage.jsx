import { useState, useEffect, useContext } from 'react'
import { submitOnboardingChat } from '../api/completeOnboarding.ts'
import { createDefaultTasks, updateDefaultTasks, deleteDefaultTasks } from '../api/defaultRoutineTasks.ts'
import { fetchDefaultRoutine } from '../api/defaultRoutine.ts'
import { routineTypeForTab } from '../utils/routineTypeForTab.ts'
import EditingBoard from '../components/EditingBoard.jsx'
import TaskEditModal from '../components/TaskEditModal.tsx'
import FabButton from '../components/FabButton.tsx'
import BuddyChat, { SendIcon } from '../components/BuddyChat.jsx'
import AuthContext from '../../../context/AuthContext.ts'
import { useWalkthrough } from '../../walkthrough/hooks/useWalkthrough.ts'
import IntroSlides from '../../walkthrough/components/IntroSlides.tsx'
import GuidedTour from '../../walkthrough/components/GuidedTour.tsx'
import HowItWorksButton from '../../walkthrough/components/HowItWorksButton.tsx'

const MINUTES_PER_DAY = 1440

const formatTimeOfDay = (minutes) => {
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

function LogoMark() {
  return (
    <div className="ob-brand-mark" aria-hidden="true">
      <span>R</span>
    </div>
  )
}

const SCHEDULE_TABS = ['weekday', 'weekend']

const BOARD_SUBTITLE = {
  weekday: 'Every new weekday starts as a copy of this · drag to move',
  weekend: 'Every new weekend day starts as a copy of this · drag to move',
}

const BUDDY_GREETING =
  'Hi! I\'m your Routine Buddy. Tell me about your day, like "I wake up at 7:00 and work 9 to 5", and I\'ll build the routine. Or tap + to add tasks yourself.'

const LOAD_ERROR = "Couldn't load your routine."
// The board only ever shows what the server returned, so a failed save never looks saved.
const SAVE_ERROR = "Couldn't save that change."


/**
 * @param {{
 *   user: { id?: string; email?: string } | null,
 *   onComplete: () => void | Promise<void>,
 *   isCompleting?: boolean,
 *   completeError?: string | null,
 * }} props
 */
function OnboardingPage({ user, onComplete, isCompleting = false, completeError = null }) {
  const [scheduleMode, setScheduleMode] = useState('weekday')
  // Weekday and Weekend are separate default routines (specs/002-onboarding-instruction, decision D2).
  const [routines, setRoutines] = useState({ weekday: null, weekend: null })
  const [routineError, setRoutineError] = useState(null)
  const [taskModalState, setTaskModalState] = useState(null)
  const [mobileView, setMobileView] = useState('board')
  var authContext = useContext(AuthContext);
  // Opens on every visit while onboarding is unfinished: App.tsx routes those users here (spec FR-001).
  const walkthrough = useWalkthrough({ autoOpen: 'onboarding' })

  const openCreateTaskModal = (draft) => {
    setTaskModalState({ mode: 'create', draft })
  }

  const openEditTaskModal = (task) => {
    setTaskModalState({ mode: 'edit', draft: task })
  }

  const closeTaskModal = () => setTaskModalState(null)

  const activeRoutine = routines[scheduleMode]

  // On failure the last loaded routine stays on screen; it is never replaced by an empty one (FR-011).
  const refreshRoutine = async (tab = scheduleMode, { keepError = false } = {}) => {
    try {
      const routine = await fetchDefaultRoutine(authContext.user.id, routineTypeForTab(tab))
      setRoutines((current) => ({ ...current, [tab]: routine }))
      if (!keepError) setRoutineError(null)
    } catch (error) {
      console.error(`Failed to fetch ${tab} routine:`, error)
      // Keep a save error visible: it is the more important message.
      setRoutineError((current) => (current === SAVE_ERROR ? current : LOAD_ERROR))
    }
  }

  const handleSaveError = (error) => {
    console.error('Failed to save routine change:', error)
    setRoutineError(SAVE_ERROR)
    // Reload so the board shows what the server really has, but keep the message visible.
    void refreshRoutine(scheduleMode, { keepError: true })
  }

  const handleDeleteTask = async (task) => {
    if (!task?.id) {
      return
    }
    try {
      await deleteDefaultTasks([task.id])
      await refreshRoutine()
    } catch (error) {
      handleSaveError(error)
    }
  }

  // Load both routines once
  useEffect(() => {
    SCHEDULE_TABS.forEach((tab) => void refreshRoutine(tab))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="ob-page" data-mobile-view={mobileView}>
      <header className="ob-topbar">
        <div className="ob-brand">
          <LogoMark />
          <span className="ob-brand-name">
            Routine <strong>Canvas</strong>
          </span>
        </div>

        <div className="ob-top-actions">
          <HowItWorksButton onClick={() => walkthrough.open('onboarding')} />
          <div className="ob-segmented" role="tablist" aria-label="Schedule type" data-tour="schedule-switch">
            <button
              type="button"
              className={`ob-segment-btn ${scheduleMode === 'weekday' ? 'active' : ''}`}
              onClick={() => setScheduleMode('weekday')}
            >
              Weekday
            </button>
            <button
              type="button"
              className={`ob-segment-btn ${scheduleMode === 'weekend' ? 'active' : ''}`}
              onClick={() => setScheduleMode('weekend')}
            >
              Weekend
            </button>
          </div>
          <button type="button" className="ob-ready-btn" onClick={onComplete} data-tour="finish">
            {isCompleting ? 'Saving...' : 'Ready to roll'}
          </button>
        </div>
      </header>

      {routineError && (
        <div style={{ marginTop: '12px' }}>
          <div className="alert alert-error ob-routine-error" role="alert">
            <span>{routineError}</span>
            {routineError && (
              <button type="button" className="ob-routine-retry" onClick={() => SCHEDULE_TABS.forEach((tab) => void refreshRoutine(tab))}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {completeError && (
        <div style={{ marginTop: '12px' }}>
          <div className="alert alert-error" role="alert">
            <span>{completeError}</span>
          </div>
        </div>
      )}

      <main className="ob-main">
        <section className="ob-canvas-card" data-tour="routine-board">
          <div className="ob-card-header">
            <div>
              <h1>{scheduleMode === 'weekday' ? 'Weekday Routine' : 'Weekend Routine'}</h1>
              <p className="ob-card-subtitle">{BOARD_SUBTITLE[scheduleMode]}</p>
            </div>
          </div>

          <EditingBoard
            routine={activeRoutine}
            liveClock={false}
            onRequestCreateTask={openCreateTaskModal}
            onRequestEditTask={openEditTaskModal}
            onPersistTaskChange={(tasks) => {
              const taskArray = Array.isArray(tasks) ? tasks : [tasks]
              return updateDefaultTasks(taskArray).then(() => refreshRoutine())
            }}
            onPersistError={handleSaveError}
            onRequestDeleteTask={handleDeleteTask}
          />
        </section>

        {/* One chat per routine: the server keeps a separate conversation per routine (research R5). */}
        {SCHEDULE_TABS.map((tab) => (
          <BuddyChat
            key={tab}
            title="Routine Buddy"
            tourId={tab === scheduleMode ? 'routine-buddy' : undefined}
            isHidden={tab !== scheduleMode}
            subtitle="Here to help you plan"
            initialMessage={BUDDY_GREETING}
            placeholder='Try: "I work from 9 to 5"'
            onSend={(message) => submitOnboardingChat(user.id, routines[tab], message)}
            onAfterSend={() => {
              refreshRoutine(tab)
              setMobileView('board')
            }}
          />
        ))}
      </main>

      <footer className="ob-user-chip">
        Planning for {user?.email || 'your account'}
      </footer>

      <div className="ob-fab-group">
        <FabButton
          onClick={() => openCreateTaskModal(nextDefaultDraftTask())}
          disabled={!activeRoutine?.id}
          tourId="add-task"
        />
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
        onSubmitTask={(mode, task) =>
          mode === 'create' ? createDefaultTasks(activeRoutine?.id, [task]) : updateDefaultTasks([task])
        }
        onClose={closeTaskModal}
        onSaved={() => refreshRoutine()}
        onDeleteTask={handleDeleteTask}
      />

      <IntroSlides state={walkthrough.state} dispatch={walkthrough.dispatch} />
      <GuidedTour
        state={walkthrough.state}
        dispatch={walkthrough.dispatch}
        mobileView={mobileView}
        onMobileViewChange={setMobileView}
      />
    </div>
  )
}

export default OnboardingPage