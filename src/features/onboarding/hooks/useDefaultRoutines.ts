import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDefaultRoutine } from '../api/defaultRoutine.ts'
import { createDefaultTasks, deleteDefaultTasks, updateDefaultTasks } from '../api/defaultRoutineTasks.ts'
import type { DefaultRoutine, RoutineTask } from '../types/routine.ts'
import { routineTypeForTab, type ScheduleTab } from '../utils/routineTypeForTab.ts'

export const SCHEDULE_TABS: readonly ScheduleTab[] = ['weekday', 'weekend']

export const LOAD_ERROR = "Couldn't load your routine."
// The board only ever shows what the server returned, so a failed save never looks saved.
export const SAVE_ERROR = "Couldn't save that change."

export type TaskModalState = { mode: 'create' | 'edit'; draft: RoutineTask } | null

type Routines = Record<ScheduleTab, DefaultRoutine | null>

/**
 * Weekday + Weekend default routines with load/save error handling (extracted from the
 * onboarding page for reuse on the Default Routine page — specs/F002-ui-refactoring R6).
 * Weekday and Weekend are separate default routines (specs/002-onboarding-instruction, decision D2).
 */
export function useDefaultRoutines(userId: string | undefined) {
  const [scheduleMode, setScheduleMode] = useState<ScheduleTab>('weekday')
  const [routines, setRoutines] = useState<Routines>({ weekday: null, weekend: null })
  const [routineError, setRoutineError] = useState<string | null>(null)
  const [taskModalState, setTaskModalState] = useState<TaskModalState>(null)
  const [loadedTabs, setLoadedTabs] = useState<Record<ScheduleTab, boolean>>({ weekday: false, weekend: false })

  const scheduleModeRef = useRef(scheduleMode)
  scheduleModeRef.current = scheduleMode

  const activeRoutine = routines[scheduleMode]

  // On failure the last loaded routine stays on screen; it is never replaced by an empty one (FR-011, spec 002).
  const refreshRoutine = useCallback(
    async (tab: ScheduleTab = scheduleModeRef.current, { keepError = false }: { keepError?: boolean } = {}) => {
      if (!userId) return
      try {
        const routine = await fetchDefaultRoutine(userId, routineTypeForTab(tab))
        setRoutines((current) => ({ ...current, [tab]: routine }))
        setLoadedTabs((current) => ({ ...current, [tab]: true }))
        if (!keepError) setRoutineError(null)
      } catch (error) {
        console.error(`Failed to fetch ${tab} routine:`, error)
        // Keep a save error visible: it is the more important message.
        setRoutineError((current) => (current === SAVE_ERROR ? current : LOAD_ERROR))
      }
    },
    [userId],
  )

  const refreshAll = useCallback(() => {
    SCHEDULE_TABS.forEach((tab) => void refreshRoutine(tab))
  }, [refreshRoutine])

  const handleSaveError = useCallback(
    (error: unknown) => {
      console.error('Failed to save routine change:', error)
      setRoutineError(SAVE_ERROR)
      // Reload so the board shows what the server really has, but keep the message visible.
      void refreshRoutine(scheduleModeRef.current, { keepError: true })
    },
    [refreshRoutine],
  )

  const handleDeleteTask = useCallback(
    async (task: { id?: string } | null | undefined) => {
      if (!task?.id) return
      try {
        await deleteDefaultTasks([task.id])
        await refreshRoutine()
      } catch (error) {
        handleSaveError(error)
      }
    },
    [refreshRoutine, handleSaveError],
  )

  const submitTask = useCallback(
    (mode: 'create' | 'edit', task: RoutineTask) =>
      mode === 'create' ? createDefaultTasks(activeRoutine?.id ?? '', [task]) : updateDefaultTasks([task]),
    [activeRoutine?.id],
  )

  const persistTaskChange = useCallback(
    (tasks: RoutineTask | RoutineTask[]) => {
      const taskArray = Array.isArray(tasks) ? tasks : [tasks]
      return updateDefaultTasks(taskArray).then(() => refreshRoutine())
    },
    [refreshRoutine],
  )

  // Load both routines once per user.
  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  return {
    scheduleMode,
    setScheduleMode,
    routines,
    activeRoutine,
    isActiveLoaded: loadedTabs[scheduleMode],
    routineError,
    refreshRoutine,
    refreshAll,
    handleSaveError,
    handleDeleteTask,
    submitTask,
    persistTaskChange,
    taskModalState,
    openCreateTaskModal: (draft: RoutineTask) => setTaskModalState({ mode: 'create', draft }),
    openEditTaskModal: (task: RoutineTask) => setTaskModalState({ mode: 'edit', draft: task }),
    closeTaskModal: () => setTaskModalState(null),
  }
}

export type DefaultRoutinesState = ReturnType<typeof useDefaultRoutines>
