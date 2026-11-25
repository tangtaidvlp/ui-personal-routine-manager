import { useState, type ReactNode } from 'react'
import EditingBoard from './EditingBoard.jsx'
import RadialBoard from '../../radial-view/components/RadialBoard.tsx'
import type { BoardView, ChatPanelState } from '../../../lib/devicePreference.ts'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import { copyWeekdayToWeekend } from '../api/defaultRoutine.ts'
import TaskEditModal, { type TaskFormValue } from './TaskEditModal.tsx'
import FabButton from './FabButton.tsx'
import { SCHEDULE_TABS, useDefaultRoutines, type DefaultRoutinesState } from '../hooks/useDefaultRoutines.ts'
import type { RoutineTask } from '../types/routine.ts'
import type { ScheduleTab } from '../utils/routineTypeForTab.ts'

const MINUTES_PER_DAY = 1440

const TAB_LABEL: Record<ScheduleTab, string> = { weekday: 'Weekday', weekend: 'Weekend' }

const BOARD_TITLE: Record<ScheduleTab, string> = {
  weekday: 'Weekday Routine',
  weekend: 'Weekend Routine',
}

const BOARD_SUBTITLE: Record<ScheduleTab, string> = {
  weekday: 'Every new weekday starts as a copy of this',
  weekend: 'Every new weekend day starts as a copy of this',
}

const formatTimeOfDay = (minutes: number) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = Math.floor(minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function nextDefaultDraftTask(): RoutineTask {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const rounded = Math.min(Math.ceil(nowMinutes / 30) * 30, MINUTES_PER_DAY - 30)
  return { name: '', startTime: formatTimeOfDay(rounded), durationMinutes: 30 }
}

type DefaultRoutineEditorProps = {
  userId: string | undefined
  /** Root element class (page layout); the root also carries `data-mobile-view`. */
  className: string
  /** Header row; receives the Weekday/Weekend switch to place where the page wants it. */
  renderHeader: (switcher: ReactNode) => ReactNode
  /** Extra banners under the routine error (onboarding: the "complete onboarding" error). */
  banner?: ReactNode
  /** Right-hand panel (onboarding: one BuddyChat per tab). Omitted on the Default Routine page. */
  renderAside?: (routines: DefaultRoutinesState) => ReactNode
  /** Extra floating buttons next to the add-task FAB (onboarding: open chat on mobile). */
  extraFabs?: ReactNode
  /** Board/chat swap on narrow screens (onboarding only). */
  mobileView?: 'board' | 'chat'
  /** F016: 'radial' shows the 24-hour circle instead of the timeline. Onboarding never passes it. */
  view?: BoardView
  /** F016: Buddy chat shown/hidden, set as `data-chat` on the root (Default routine page only). */
  chatPanel?: ChatPanelState
  /** Anything else rendered inside the page root (footers, tour, slides). */
  children?: ReactNode
}

/**
 * Weekday/Weekend default routine editor: switch, error banner, board, add-task and task modal
 * (contracts/ui-shell.md "DefaultRoutineEditor"). Keeps the walkthrough targets
 * `schedule-switch`, `routine-board` and `add-task`.
 */
function DefaultRoutineEditor({
  userId,
  className,
  renderHeader,
  banner,
  renderAside,
  extraFabs,
  mobileView = 'board',
  view = 'vertical',
  chatPanel,
  children,
}: DefaultRoutineEditorProps) {
  const routines = useDefaultRoutines(userId)
  const {
    scheduleMode,
    setScheduleMode,
    activeRoutine,
    isActiveLoaded,
    routineError,
    refreshRoutine,
    refreshAll,
    handleSaveError,
    handleDeleteTask,
    submitTask,
    persistTaskChange,
    taskModalState,
    openCreateTaskModal,
    openEditTaskModal,
    closeTaskModal,
  } = routines

  // F012: Copy Weekday to Weekend, after a confirm.
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const handleConfirmCopy = async () => {
    if (!userId) return
    setIsCopying(true)
    try {
      await copyWeekdayToWeekend(userId)
      await refreshRoutine('weekend')
    } catch (error) {
      handleSaveError(error)
    } finally {
      setIsCopying(false)
      setCopyConfirmOpen(false)
    }
  }

  const Board = view === 'radial' ? RadialBoard : EditingBoard
  const canAddTask = Boolean(activeRoutine?.id)
  const isEmpty = isActiveLoaded && (activeRoutine?.tasks?.length ?? 0) === 0

  const switcher = (
    <div className="ui-segmented" role="tablist" aria-label="Schedule type" data-tour="schedule-switch">
      {SCHEDULE_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={scheduleMode === tab}
          className={`ui-segmented-btn ${scheduleMode === tab ? 'active' : ''}`}
          onClick={() => setScheduleMode(tab)}
        >
          {TAB_LABEL[tab]}
        </button>
      ))}
    </div>
  )

  return (
    <div className={className} data-mobile-view={mobileView} data-board-view={view} data-chat={chatPanel}>
      {renderHeader(switcher)}

      {routineError && (
        <div className="ob-banner-wrap">
          <div className="alert alert-error ob-routine-error" role="alert">
            <span>{routineError}</span>
            <button type="button" className="ob-routine-retry" onClick={refreshAll}>
              Retry
            </button>
          </div>
        </div>
      )}

      {banner}

      <main className="ob-main">
        <section className="ob-canvas-card" data-tour="routine-board">
          <div className="ob-card-header">
            <div>
              <h2>{BOARD_TITLE[scheduleMode]}</h2>
              <p className="ob-card-subtitle">
                {BOARD_SUBTITLE[scheduleMode]} · {view === 'radial' ? 'click a task to edit' : 'drag to move'}
              </p>
            </div>
            <button
              type="button"
              className="ui-btn ui-btn-primary ob-add-task-btn"
              data-tour="add-task"
              onClick={() => openCreateTaskModal(nextDefaultDraftTask())}
              disabled={!canAddTask}
            >
              + Add task
            </button>
          </div>

          {isEmpty ? <p className="ob-board-empty">No tasks yet – add one with + Add task</p> : null}

          <Board
            label={BOARD_TITLE[scheduleMode]}
            routine={activeRoutine}
            liveClock={false}
            onRequestCreateTask={openCreateTaskModal}
            onRequestEditTask={openEditTaskModal}
            onPersistTaskChange={persistTaskChange}
            onPersistError={handleSaveError}
            onRequestDeleteTask={handleDeleteTask}
            toolbarMenuActions={
              <button
                type="button"
                className="ui-btn ui-btn-ghost"
                onClick={() => setCopyConfirmOpen(true)}
                disabled={!userId || isCopying}
              >
                Copy Weekday to Weekend
              </button>
            }
          />
        </section>

        {renderAside?.(routines)}
      </main>

      <div className="ob-fab-group">
        <FabButton onClick={() => openCreateTaskModal(nextDefaultDraftTask())} disabled={!canAddTask} tourId="add-task" />
        {extraFabs}
      </div>

      <TaskEditModal
        isOpen={Boolean(taskModalState)}
        mode={taskModalState?.mode ?? 'create'}
        draftTask={(taskModalState?.draft as TaskFormValue | undefined) ?? null}
        onSubmitTask={(mode, task) => submitTask(mode, task as RoutineTask)}
        onClose={closeTaskModal}
        onSaved={() => refreshRoutine()}
        onDeleteTask={handleDeleteTask}
      />

      <ConfirmDialog
        isOpen={copyConfirmOpen}
        message="Replace all Weekend tasks with a copy of your Weekday routine?"
        confirmLabel="Copy"
        loadingLabel="Copying..."
        isLoading={isCopying}
        onConfirm={handleConfirmCopy}
        onCancel={() => setCopyConfirmOpen(false)}
      />

      {children}
    </div>
  )
}

export default DefaultRoutineEditor
