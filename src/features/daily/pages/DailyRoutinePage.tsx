import { useState, type ComponentType } from 'react'
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
import { routineTypeForDate, routineTypeLabel } from '../../../utils/routineTypeForDate.ts'
import { submitDailyRoutineChat, fetchDailyRoutineChatHistory } from '../api/dailyRoutineTasks.ts'
import ReflectionSummaryStrip from '../../reflection/components/ReflectionSummaryStrip.tsx'
import ReflectionNote from '../../reflection/components/ReflectionNote.tsx'
import ReflectionToggle from '../../reflection/components/ReflectionToggle.tsx'
import ReflectionTaskPopup from '../../reflection/components/ReflectionTaskPopup.tsx'
import CompareBoards from '../../reflection/components/CompareBoards.jsx'
import { itemForActualTask } from '../../reflection/utils/comparisonLookup.ts'
import { useMediaQuery } from '../../../hooks/useMediaQuery.ts'
import { fetchReflectionChatHistory } from '../../reflection/api/reflection.ts'
import { FUTURE_REFLECTION_HINT } from '../../reflection/utils/reflectionAvailability.ts'
import { useReflectionMode } from '../../reflection/hooks/useReflectionMode.ts'
import { useSelectedDate } from '../hooks/useSelectedDate.ts'
import { useDailyPlan } from '../hooks/useDailyPlan.ts'
import DateNav from '../components/DateNav.tsx'
import { nextDefaultDraftTask, parseDateInputValue } from '../utils/dateInput.ts'
import type { BoardProps, BoardTask, TaskDraft } from '../../board/types/board.ts'
import type { DailyRoutine } from '../types/dailyRoutine.ts'

const renderProposal = goalProposalRenderer()

// F007 FR-012: Plan and Reality side by side from this width; one board below it.
const COMPARE_MEDIA_QUERY = '(min-width: 1280px)'
const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }

// Every task action names its board, because side by side both are editable at once (research R14).
type Target = 'plan' | 'reality'
type TaskModalState = { mode: 'create' | 'edit'; draft: TaskDraft | BoardTask; target: Target }

function DailyRoutinePage() {
  const userId = useShellContext().user?.id as string // pages render only for a signed-in user
  const { selectedDate, isToday, isPast, isFuture, setDate, shift, goToday } = useSelectedDate()
  const reflection = useReflectionMode(userId, selectedDate, isFuture)
  const { inReflection, reflectionReady } = reflection
  const reflectionView = reflection.reflection
  // A plan change while reflecting also refreshes the comparison.
  const plan = useDailyPlan(userId, selectedDate, { onChanged: reflection.refresh })
  const actionsFor = (target: Target) => (target === 'reality' ? reflection : plan)

  const [taskModalState, setTaskModalState] = useState<TaskModalState | null>(null)
  const [mobileView, setMobileView] = useState('board')
  // F016: Timeline or Circle, remembered on this device.
  const [boardView, setBoardView] = useDevicePreference(BOARD_VIEW_KEY, BOARD_VIEWS, 'vertical')
  // F016: Buddy chat shown or hidden (wide screens). `chatToggled`: the user toggled it on this page, so focus follows.
  const [chatPanel, setChatPanel] = useDevicePreference(CHAT_PANEL_KEY, CHAT_PANEL_STATES, 'shown')
  const [chatToggled, setChatToggled] = useState(false)
  // Narrow screens: the reality task whose plan-vs-reality pop-up is open (FR-012a).
  const [popupTaskId, setPopupTaskId] = useState<string | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const isWide = useMediaQuery(COMPARE_MEDIA_QUERY)

  const openCreateTaskModal = (target: Target, draft: TaskDraft) => setTaskModalState({ mode: 'create', draft, target })
  const openEditTaskModal = (target: Target, task: BoardTask) => setTaskModalState({ mode: 'edit', draft: task, target })

  const toggleReflection = () => {
    setPopupTaskId(null)
    reflection.toggle()
  }

  const handleConfirmReset = async () => {
    await plan.resetDay()
    setResetConfirmOpen(false)
  }
  const openResetConfirm = () => setResetConfirmOpen(true)

  const hasTasks = (plan.routine?.tasks ?? []).length > 0
  const layout = reflectionReady && isWide ? 'compare' : 'single'
  const realityRoutine = reflectionReady && reflectionView
    ? { id: reflectionView.id ?? undefined, date: selectedDate, tasks: reflectionView.tasks as BoardTask[], // a reflection description may be null; boards read it as optional text
       nextColor: reflectionView.nextColor }
    : null

  const boardHandlers = (target: Target) => {
    const actions = actionsFor(target)
    return {
      onRequestCreateTask: (draft: TaskDraft) => openCreateTaskModal(target, draft),
      onRequestEditTask: (task: BoardTask) => openEditTaskModal(target, task),
      onPersistTaskChange: (tasks: BoardTask[]) => actions.persistTasks(tasks),
      onRequestDeleteTask: (task: BoardTask) => actions.deleteTask(task),
      ...(target === 'plan' ? { onToggleComplete: plan.toggleComplete } : {}),
    }
  }
  const planHandlers = boardHandlers('plan')
  const realityHandlers = {
    ...boardHandlers('reality'),
    // Narrow screens: a tap first shows how the task compares to the plan (FR-012a).
    ...(isWide ? {} : { onRequestEditTask: (task: BoardTask) => setPopupTaskId(task.id ?? null) }),
  }
  const hideChat = () => {
    setChatToggled(true)
    setChatPanel('hidden')
  }
  const showChat = () => {
    setChatToggled(true)
    setChatPanel('shown')
  }
  // Both boards take the same props (F016).
  const Board: ComponentType<BoardProps> = boardView === 'radial' ? RadialBoard : EditingBoard
  const popupItem = inReflection && !isWide ? itemForActualTask(reflectionView, popupTaskId) : null
  const modalTarget = taskModalState?.target ?? 'plan'
  const modalActions = actionsFor(modalTarget)

  const reflectionToggle = <ReflectionToggle on={inReflection} disabled={isFuture} onToggle={toggleReflection} />
  const cleanUpButton = (
    <button type="button" className="ui-btn ui-btn-danger-text" onClick={plan.cleanUp} disabled={!hasTasks}>
      Clean up
    </button>
  )
  const selectedDay = parseDateInputValue(selectedDate)
  const routineLabel = routineTypeLabel(routineTypeForDate(selectedDay))
  const addTargetOnFab = reflectionReady ? 'reality' : 'plan'

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
        <DateNav date={selectedDate} isToday={isToday} onShift={shift} onPick={setDate} onToday={goToday} />
        {isFuture && reflection.reflectionOn ? <p className="rf-mode-hint">{FUTURE_REFLECTION_HINT}</p> : null}
      </PageHeader>

      <main className="dr-main">
        <section className="dr-canvas-card">
          {plan.resetFailure === selectedDate ? (
            <p className="rf-note-error" role="alert">Couldn't reset the day. Nothing was changed.</p>
          ) : null}
          {inReflection ? (
            <div className="rf-intro">
              {reflection.error ? <p className="rf-note-error" role="alert">{reflection.error}</p> : null}
              {reflectionReady && reflectionView ? (
                <ReflectionSummaryStrip view={reflectionView} />
              ) : reflectionView ? (
                <p className="rf-start">
                  <span>No reflection for this day yet.</span>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={reflection.start}>
                    Reflect on this day
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}
          {layout === 'compare' ? (
            <CompareBoards
              planRoutine={plan.routine}
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
              routine={reflectionReady ? realityRoutine : plan.routine}
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
                    onClick={() => openCreateTaskModal(addTargetOnFab, nextDefaultDraftTask())}
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
            loadHistory={(before) => fetchReflectionChatHistory(userId, selectedDate, before)}
            title="Routine Buddy"
            panelId="buddy-chat"
            onHide={hideChat}
            focusHideButton={chatToggled && chatPanel === 'shown'}
            subtitle={`Reflecting on ${selectedDay.toLocaleDateString('en-GB', SHORT_DATE)}`}
            compactHeader
            topSlot={reflectionReady && reflectionView ? (
              <ReflectionNote view={reflectionView} onRequestFeedback={reflection.requestFeedback} />
            ) : null}
            initialMessage="How did your day really go? Tell me and I'll update your reflection. No judgement, just a look back."
            placeholder='Try: "I woke up an hour late and skipped the gym"'
            onSend={reflection.sendChat}
            renderProposal={renderProposal}
            onAfterSend={({ hasGoalProposal }) => {
              reflection.refresh()
              // A goal proposal (F013) waits for the user in the chat.
              if (!hasGoalProposal) setMobileView('board')
            }}
          />
        ) : (
          <BuddyChat
            // One conversation per day (F004): remount on date change to load that day's history.
            key={`${selectedDate}:plan`}
            loadHistory={(before) => fetchDailyRoutineChatHistory(userId, selectedDate, before)}
            title="Routine Buddy"
            panelId="buddy-chat"
            onHide={hideChat}
            focusHideButton={chatToggled && chatPanel === 'shown'}
            subtitle={`Here to help with ${selectedDay.toLocaleDateString('en-GB', SHORT_DATE)}`}
            initialMessage="Hi! Ask me to add, adjust, or check off tasks for this day."
            placeholder='Try: "Mark my workout as done"'
            // The routine is null until the first load, as before.
            onSend={(message) => submitDailyRoutineChat(userId, plan.routine as DailyRoutine, selectedDate, message)}
            renderProposal={renderProposal}
            onAfterSend={({ hasGoalProposal }) => {
              plan.refresh()
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
            openCreateTaskModal(addTargetOnFab, nextDefaultDraftTask())
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
        onSubmitTask={(mode, task) => modalActions.submitTask(mode, task)}
        onClose={() => setTaskModalState(null)}
        // The plan's onSaved reloads the plan (and the reflection while reflecting); the reality's reloads the reflection.
        onSaved={modalTarget === 'reality' ? reflection.refresh : plan.afterChange}
        onDeleteTask={(task) => modalActions.deleteTask(task)}
      />

      <ConfirmDialog
        isOpen={resetConfirmOpen}
        message="Replace all tasks on this day with a fresh copy of your default routine? Your reflection stays as it is."
        confirmLabel="Reset day"
        loadingLabel="Resetting..."
        isLoading={plan.isResetting}
        onConfirm={handleConfirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />

      <ReflectionTaskPopup
        item={popupItem}
        onClose={() => setPopupTaskId(null)}
        onEdit={() => {
          const task = reflection.taskById(popupTaskId)
          setPopupTaskId(null)
          if (task) {
            openEditTaskModal('reality', task as BoardTask) // a null description reads as empty in the form
          }
        }}
      />

    </div>
  )
}

export default DailyRoutinePage
