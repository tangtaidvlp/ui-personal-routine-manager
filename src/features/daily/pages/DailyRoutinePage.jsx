import { useEffect, useRef, useState } from 'react'
import EditingBoard from '../../board/components/EditingBoard.tsx'
import RadialBoard from '../../radial-view/components/RadialBoard.tsx'
import BoardViewSwitch from '../../radial-view/components/BoardViewSwitch.tsx'
import { useDevicePreference } from '../../../hooks/useDevicePreference.ts'
import { BOARD_VIEW_KEY, BOARD_VIEWS, CHAT_PANEL_KEY, CHAT_PANEL_STATES } from '../../../lib/devicePreference.ts'
import ChatPanelRail from '../../../components/layout/ChatPanelRail.tsx'
import TaskEditModal from '../../board/components/TaskEditModal.tsx'
import FabButton from '../../../components/FabButton.tsx'
import BuddyChat, { SendIcon } from '../../buddy-chat/components/BuddyChat.tsx'
import { goalProposalRenderer } from '../../personal-target/components/renderGoalProposal.tsx'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import { ChevronLeftIcon, ChevronRightIcon } from '../../../components/icons/index.ts'
import { routineTypeForDate, routineTypeLabel } from '../../../utils/routineTypeForDate.ts'
import {
  fetchDailyRoutine,
  ensureDailyRoutine,
  resetDailyRoutine,
  createDailyTasks,
  updateDailyTasks,
  deleteDailyTasks,
  submitDailyRoutineChat,
  fetchDailyRoutineChatHistory,
} from '../api/dailyRoutineTasks.ts'
import ReflectionSummaryStrip from '../../reflection/components/ReflectionSummaryStrip.tsx'
import ReflectionNote from '../../reflection/components/ReflectionNote.tsx'
import ReflectionToggle from '../../reflection/components/ReflectionToggle.tsx'
import ReflectionTaskPopup from '../../reflection/components/ReflectionTaskPopup.tsx'
import CompareBoards from '../../reflection/components/CompareBoards.jsx'
import { itemForActualTask } from '../../reflection/utils/comparisonLookup.ts'
import { useMediaQuery } from '../../../hooks/useMediaQuery.ts'
import {
  fetchReflection,
  ensureReflection,
  createReflectionTasks,
  updateReflectionTasks,
  deleteReflectionTasks,
  requestReflectionFeedback,
  submitReflectionChat,
  fetchReflectionChatHistory,
} from '../../reflection/api/reflection.ts'
import { FUTURE_REFLECTION_HINT, isFutureDate } from '../../reflection/utils/reflectionAvailability.ts'

const renderProposal = goalProposalRenderer()

const MINUTES_PER_DAY = 1440
// F007 FR-012: Plan and Reality side by side from this width; one board below it.
const COMPARE_MEDIA_QUERY = '(min-width: 1280px)'

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
  // F016: Timeline or Circle, remembered on this device.
  const [boardView, setBoardView] = useDevicePreference(BOARD_VIEW_KEY, BOARD_VIEWS, 'vertical')
  // F016: Buddy chat shown or hidden (wide screens). `chatToggled`: the user toggled it on this page, so focus follows.
  const [chatPanel, setChatPanel] = useDevicePreference(CHAT_PANEL_KEY, CHAT_PANEL_STATES, 'shown')
  const [chatToggled, setChatToggled] = useState(false)
  // F007: Reflection mode. Kept across date changes; never active on future dates.
  const [reflectionOn, setReflectionOn] = useState(false)
  const [reflection, setReflection] = useState(null)
  const [reflectionError, setReflectionError] = useState(null)
  // Narrow screens: the reality task whose plan-vs-reality pop-up is open (FR-012a).
  const [popupTaskId, setPopupTaskId] = useState(null)
  // F012 Reset day: confirm dialog, request in flight, and a failure for one date (hidden on other dates).
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetFailure, setResetFailure] = useState(null)
  const isWide = useMediaQuery(COMPARE_MEDIA_QUERY)
  const todayValue = toDateInputValue(new Date())
  const isFuture = isFutureDate(selectedDate, todayValue)
  // ISO dates compare as strings. Past days can't be reset (F012 FR-005).
  const isPast = selectedDate < todayValue
  const inReflection = reflectionOn && !isFuture

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

  // Reflection for the shown day. Browsing only reads (GET); a reflection is created
  // by switching to Reality or by "Reflect on this day" (no silent writes).
  // Responses for an earlier date/mode are dropped, so fast switching never shows the wrong day.
  const reflectionKey = `${user?.id}:${selectedDate}:${inReflection}`
  const reflectionKeyRef = useRef(reflectionKey)
  reflectionKeyRef.current = reflectionKey
  // Set by the Reflection toggle: entering the mode creates the reflection (copies the plan once).
  const createOnEnterRef = useRef(false)

  const loadReflection = async (load, failureMessage) => {
    const key = reflectionKeyRef.current
    try {
      const view = await load()
      if (reflectionKeyRef.current === key) {
        setReflection(view)
        setReflectionError(null)
      }
    } catch (error) {
      console.error(failureMessage, error)
      if (reflectionKeyRef.current === key) {
        setReflectionError(failureMessage)
      }
    }
  }

  const refreshReflection = () => {
    if (!user?.id || !inReflection) {
      return Promise.resolve()
    }
    return loadReflection(() => fetchReflection(user.id, selectedDate), "Couldn't load your reflection. Please try again.")
  }

  const startReflection = () =>
    loadReflection(() => ensureReflection(user.id, selectedDate), "Couldn't start your reflection. Please try again.")

  useEffect(() => {
    setReflection(null)
    setReflectionError(null)
    if (!user?.id || !inReflection) {
      return
    }
    if (createOnEnterRef.current) {
      createOnEnterRef.current = false
      startReflection()
    } else {
      refreshReflection()
    }
  }, [selectedDate, user?.id, inReflection])

  const switchToReality = () => {
    if (isFuture || inReflection) {
      return
    }
    createOnEnterRef.current = true
    setReflectionOn(true)
  }

  const toggleReflection = () => {
    setPopupTaskId(null)
    if (inReflection) {
      setReflectionOn(false)
      return
    }
    switchToReality()
  }

  const reflectionTaskById = (id) => reflection?.tasks?.find((current) => current.id === id)

  // Every task action names its board ('plan' | 'reality'), because side by side both are
  // editable at once (research R14). A plan change while reflecting also refreshes the comparison.
  const afterPlanChange = async () => {
    await refreshDailyRoutine()
    if (inReflection) {
      await refreshReflection()
    }
  }

  const openCreateTaskModal = (target, draft) => {
    setTaskModalState({ mode: 'create', draft, target })
  }

  const openEditTaskModal = (target, task) => {
    setTaskModalState({ mode: 'edit', draft: task, target })
  }

  const closeTaskModal = () => setTaskModalState(null)

  const handleDeleteTask = async (target, task) => {
    if (!task?.id) {
      return
    }
    if (target === 'reality') {
      try {
        setReflection(await deleteReflectionTasks(user.id, selectedDate, [task.id]))
      } catch (error) {
        console.error('Failed to delete reflection task:', error)
      }
      return
    }
    try {
      await deleteDailyTasks([task.id])
      await afterPlanChange()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const shiftDate = (deltaDays) => {
    const date = parseDateInputValue(selectedDate)
    date.setDate(date.getDate() + deltaDays)
    setSelectedDate(toDateInputValue(date))
  }

  const handleSubmitTask = async (target, mode, task) => {
    if (target === 'reality') {
      const view = mode === 'create'
        ? await createReflectionTasks(user.id, selectedDate, [task])
        : await updateReflectionTasks(user.id, selectedDate, [{ ...task, color: task.color ?? reflectionTaskById(task.id)?.color }])
      setReflection(view)
      return view
    }

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

  const handlePersistTaskChange = async (target, updatedTasks) => {
    const tasks = Array.isArray(updatedTasks) ? updatedTasks : [updatedTasks]

    if (target === 'reality') {
      setReflection(await updateReflectionTasks(user.id, selectedDate, tasks))
      return
    }

    // Preserve existing completed status for each task
    const tasksToUpdate = tasks.map(task => {
      const existing = currentDailyRoutine?.tasks?.find((current) => current.id === task.id)
      return { ...task, completed: existing?.completed ?? false }
    })

    await updateDailyTasks(tasksToUpdate)
    await afterPlanChange()
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
    await afterPlanChange()
  }

  // F012: replace the plan with a fresh copy of the default routine; the reflection is not touched.
  const handleConfirmReset = async () => {
    setIsResetting(true)
    setResetFailure(null)
    try {
      await resetDailyRoutine(user.id, selectedDate)
      await afterPlanChange()
    } catch (error) {
      console.error('Failed to reset the day:', error)
      setResetFailure(selectedDate)
    } finally {
      setIsResetting(false)
      setResetConfirmOpen(false)
    }
  }
  const openResetConfirm = () => setResetConfirmOpen(true)

  const hasTasks = (currentDailyRoutine?.tasks ?? []).length > 0
  const reflectionReady = inReflection && Boolean(reflection?.exists)
  const layout = reflectionReady && isWide ? 'compare' : 'single'
  const realityRoutine = reflectionReady
    ? { id: reflection.id, date: selectedDate, tasks: reflection.tasks, nextColor: reflection.nextColor }
    : null

  const boardHandlers = (target) => ({
    onRequestCreateTask: (draft) => openCreateTaskModal(target, draft),
    onRequestEditTask: (task) => openEditTaskModal(target, task),
    onPersistTaskChange: (tasks) => handlePersistTaskChange(target, tasks),
    onRequestDeleteTask: (task) => handleDeleteTask(target, task),
    ...(target === 'plan' ? { onToggleComplete: handleToggleComplete } : {}),
  })
  const planHandlers = boardHandlers('plan')
  const realityHandlers = {
    ...boardHandlers('reality'),
    // Narrow screens: a tap first shows how the task compares to the plan (FR-012a).
    ...(isWide ? {} : { onRequestEditTask: (task) => setPopupTaskId(task.id) }),
  }
  const hideChat = () => {
    setChatToggled(true)
    setChatPanel('hidden')
  }
  const showChat = () => {
    setChatToggled(true)
    setChatPanel('shown')
  }
  const Board = boardView === 'radial' ? RadialBoard : EditingBoard
  const popupItem = inReflection && !isWide ? itemForActualTask(reflection, popupTaskId) : null
  const modalTarget = taskModalState?.target ?? 'plan'

  const reflectionToggle = <ReflectionToggle on={inReflection} disabled={isFuture} onToggle={toggleReflection} />
  const cleanUpButton = (
    <button type="button" className="ui-btn ui-btn-danger-text" onClick={handleCleanUp} disabled={!hasTasks}>
      Clean up
    </button>
  )
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
    <div
      className="dr-page"
      data-mobile-view={mobileView}
      data-reflection={inReflection ? 'on' : 'off'}
      data-layout={layout}
      data-board-view={boardView}
      data-chat={chatPanel}
    >
      <PageHeader actions={<BoardViewSwitch value={boardView} onChange={setBoardView} />}>
        <p className="dr-breadcrumb">
          {isToday ? 'Today' : selectedDay.toLocaleDateString('en-GB', { weekday: 'long' })} · {routineLabel}
          {inReflection ? <span className="rf-badge">Reality</span> : null}
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
        {isFuture && reflectionOn ? <p className="rf-mode-hint">{FUTURE_REFLECTION_HINT}</p> : null}
      </PageHeader>

      <main className="dr-main">
        <section className="dr-canvas-card">
          {resetFailure === selectedDate ? (
            <p className="rf-note-error" role="alert">Couldn't reset the day. Nothing was changed.</p>
          ) : null}
          {inReflection ? (
            <div className="rf-intro">
              {reflectionError ? <p className="rf-note-error" role="alert">{reflectionError}</p> : null}
              {reflectionReady ? (
                <ReflectionSummaryStrip view={reflection} />
              ) : reflection ? (
                <p className="rf-start">
                  <span>No reflection for this day yet.</span>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={startReflection}>
                    Reflect on this day
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}
          {layout === 'compare' ? (
            <CompareBoards
              planRoutine={currentDailyRoutine}
              realityRoutine={realityRoutine}
              planHandlers={planHandlers}
              realityHandlers={realityHandlers}
              onAddPlan={() => openCreateTaskModal('plan', nextDefaultDraftTask())}
              onAddReality={() => openCreateTaskModal('reality', nextDefaultDraftTask())}
              planActions={cleanUpButton}
              toolbarActions={reflectionToggle}
              onResetDay={openResetConfirm}
              resetDisabled={isPast}
              view={boardView}
            />
          ) : (
            <Board
              // The Reality board shows once the reflection exists. Until then (Reflection on, nothing
              // recorded yet) the plan is shown view-only, so reflection mode never edits the plan.
              routine={reflectionReady ? realityRoutine : currentDailyRoutine}
              {...(reflectionReady ? realityHandlers : inReflection ? {} : planHandlers)}
              label={reflectionReady ? 'Reality' : 'Day plan'}
              showCompletion={!inReflection}
              toolbarMenuActions={inReflection ? null : cleanUpButton}
              // Reset day acts on the plan, so it isn't offered while the single board shows Reality.
              onResetDay={inReflection ? undefined : openResetConfirm}
              resetDisabled={isPast}
              toolbarActions={
                <>
                  {reflectionToggle}
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary dr-add-task-btn"
                    onClick={() => openCreateTaskModal(reflectionReady ? 'reality' : 'plan', nextDefaultDraftTask())}
                    disabled={inReflection && !reflectionReady}
                  >
                    + Add task
                  </button>
                </>
              }
            />
          )}
        </section>

        {inReflection ? (
          <BuddyChat
            // Reflection chat (F007): its own thread per day, separate from the planning chat.
            key={`${selectedDate}:reality`}
            loadHistory={(before) => fetchReflectionChatHistory(user.id, selectedDate, before)}
            title="Routine Buddy"
            panelId="buddy-chat"
            onHide={hideChat}
            focusHideButton={chatToggled && chatPanel === 'shown'}
            subtitle={`Reflecting on ${selectedDay.toLocaleDateString('en-GB', SHORT_DATE)}`}
            compactHeader
            topSlot={reflectionReady ? (
              <ReflectionNote
                view={reflection}
                onRequestFeedback={async () => setReflection(await requestReflectionFeedback(user.id, selectedDate))}
              />
            ) : null}
            initialMessage="How did your day really go? Tell me and I'll update your reflection. No judgement, just a look back."
            placeholder='Try: "I woke up an hour late and skipped the gym"'
            onSend={async (message) => {
              if (!reflection?.exists) {
                setReflection(await ensureReflection(user.id, selectedDate))
              }
              return submitReflectionChat(user.id, selectedDate, message)
            }}
            renderProposal={renderProposal}
            onAfterSend={({ hasGoalProposal }) => {
              refreshReflection()
              // A goal proposal (F013) waits for the user in the chat.
              if (!hasGoalProposal) setMobileView('board')
            }}
          />
        ) : (
          <BuddyChat
            // One conversation per day (F004): remount on date change to load that day's history.
            key={`${selectedDate}:plan`}
            loadHistory={(before) => fetchDailyRoutineChatHistory(user.id, selectedDate, before)}
            title="Routine Buddy"
            panelId="buddy-chat"
            onHide={hideChat}
            focusHideButton={chatToggled && chatPanel === 'shown'}
            subtitle={`Here to help with ${selectedDay.toLocaleDateString('en-GB', SHORT_DATE)}`}
            initialMessage="Hi! Ask me to add, adjust, or check off tasks for this day."
            placeholder='Try: "Mark my workout as done"'
            onSend={(message) => submitDailyRoutineChat(user.id, currentDailyRoutine, selectedDate, message)}
            renderProposal={renderProposal}
            onAfterSend={({ hasGoalProposal }) => {
              refreshDailyRoutine()
              // A goal proposal (F013) waits for the user in the chat.
              if (!hasGoalProposal) setMobileView('board')
            }}
          />
        )}
        {chatPanel === 'hidden' ? <ChatPanelRail panelId="buddy-chat" autoFocus={chatToggled} onShow={showChat} /> : null}
      </main>

      <div className="ob-fab-group">
        <FabButton
          onClick={() => {
            if (inReflection && !reflectionReady) {
              return
            }
            openCreateTaskModal(reflectionReady ? 'reality' : 'plan', nextDefaultDraftTask())
          }}
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
        onSubmitTask={(mode, task) => handleSubmitTask(modalTarget, mode, task)}
        onClose={closeTaskModal}
        onSaved={modalTarget === 'reality' ? refreshReflection : afterPlanChange}
        onDeleteTask={(task) => handleDeleteTask(modalTarget, task)}
      />

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        message="Replace all tasks on this day with a fresh copy of your default routine? Your reflection stays as it is."
        confirmLabel="Reset day"
        loadingLabel="Resetting..."
        isLoading={isResetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />

      <ReflectionTaskPopup
        item={popupItem}
        onClose={() => setPopupTaskId(null)}
        onEdit={() => {
          const task = reflectionTaskById(popupTaskId)
          setPopupTaskId(null)
          if (task) {
            openEditTaskModal('reality', task)
          }
        }}
      />

    </div>
  )
}

export default DailyRoutinePage
