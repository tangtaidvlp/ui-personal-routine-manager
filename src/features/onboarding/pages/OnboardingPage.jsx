import { useState, useEffect, useContext } from 'react'
import { submitOnboardingChat } from '../api/completeOnboarding.ts'
import { createDefaultTasks, updateDefaultTasks } from '../api/defaultRoutineTasks.ts'
import { apiRequest } from '../../../lib/api.ts'
import EditingBoard from '../components/EditingBoard.jsx'
import TaskEditModal from '../components/TaskEditModal.tsx'
import FabButton from '../components/FabButton.tsx'
import BuddyChat, { SendIcon } from '../components/BuddyChat.jsx'
import AuthContext from '../../../context/AuthContext.ts'

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

const fetchDefaultRoutine = async (userId) => {
  console.log("Fetching default routine for userId:", userId);
  var result = await apiRequest(`/default-routine/users/${userId}`, {
    method: 'GET',
  })
  return result
}


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
  const [currentDefaultRoutine, setCurrentDefaultRoutine] = useState([])
  const [taskModalState, setTaskModalState] = useState(null)
  const [mobileView, setMobileView] = useState('board')
  var authContext = useContext(AuthContext);

  const openCreateTaskModal = (draft) => {
    setTaskModalState({ mode: 'create', draft })
  }

  const openEditTaskModal = (task) => {
    setTaskModalState({ mode: 'edit', draft: task })
  }

  const closeTaskModal = () => setTaskModalState(null)

  const refreshDefaultRoutine = async () => {
    try {
      const routine = await fetchDefaultRoutine(authContext.user.id)
      console.log("Fetched default routine for userId:", authContext.user.id, "routine:", routine);
      setCurrentDefaultRoutine(routine)
    } catch (error) {
      console.error('Failed to fetch default routine:', error)
      setCurrentDefaultRoutine({
        tasks: []
      })
    }
  }

  // Load initial state
  useEffect(() => {
    refreshDefaultRoutine()
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
          <div className="ob-segmented" role="tablist" aria-label="Schedule type">
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
          <button type="button" className="ob-ready-btn" onClick={onComplete}>
            {isCompleting ? 'Saving...' : 'Ready to roll'}
          </button>
        </div>
      </header>

      {completeError && (
        <div style={{ marginTop: '12px' }}>
          <div className="alert alert-error" role="alert">
            <span>{completeError}</span>
          </div>
        </div>
      )}

      <main className="ob-main">
        <section className="ob-canvas-card">
          <div className="ob-card-header">
            <h1>{scheduleMode === 'weekday' ? 'Weekday Routine' : 'Weekend Routine'}</h1>
            <span className="ob-block-count">Drag to reorder</span>
          </div>

          <EditingBoard
            routine={currentDefaultRoutine}
            onRequestCreateTask={openCreateTaskModal}
            onRequestEditTask={openEditTaskModal}
            onPersistTaskChange={(task) => updateDefaultTasks([task]).then(refreshDefaultRoutine)}
          />
        </section>

        <BuddyChat
          title="Routine Buddy"
          subtitle="Here to help you plan"
          initialMessage={"Hi! I'm your Routine Buddy. We can build your schedule together. Try telling me your first habit, like: \"I wake up at 7:00 AM.\" Or, you can just click the + button to add it yourself."}
          placeholder='Try: "I work from 9 to 5"'
          onSend={(message) => submitOnboardingChat(user.id, currentDefaultRoutine, message)}
          onAfterSend={() => {
            refreshDefaultRoutine()
            setMobileView('board')
          }}
        />
      </main>

      <footer className="ob-user-chip">
        Planning for {user?.email || 'your account'}
      </footer>

      <div className="ob-fab-group">
        <FabButton
          onClick={() => openCreateTaskModal(nextDefaultDraftTask())}
          disabled={!currentDefaultRoutine?.id}
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
          mode === 'create' ? createDefaultTasks(currentDefaultRoutine?.id, [task]) : updateDefaultTasks([task])
        }
        onClose={closeTaskModal}
        onSaved={refreshDefaultRoutine}
      />
    </div>
  )
}

export default OnboardingPage