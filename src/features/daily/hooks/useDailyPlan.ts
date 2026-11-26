import { useEffect, useState } from 'react'
import type { BoardTask } from '../../board/types/board.ts'
import {
  createDailyTasks,
  deleteDailyTasks,
  ensureDailyRoutine,
  fetchDailyRoutine,
  resetDailyRoutine,
  updateDailyTasks,
} from '../api/dailyRoutineTasks.ts'
import type { DailyRoutine } from '../types/dailyRoutine.ts'

type Options = {
  /** Called after a plan change that reloads the plan (not after "mark as done"). */
  onChanged?: () => unknown
}

/** The plan (daily routine) for one day and every action on it. `userId` is undefined until sign-in is known. */
export function useDailyPlan(userId: string | undefined, date: string, { onChanged }: Options = {}) {
  const [routine, setRoutine] = useState<DailyRoutine | null>(null)
  // Exposed for a future error banner; the page doesn't show it yet.
  const [loadError, setLoadError] = useState<unknown>(null)
  // F012 Reset day: request in flight, and a failure for one date (hidden on other dates).
  const [isResetting, setIsResetting] = useState(false)
  const [resetFailure, setResetFailure] = useState<string | null>(null)

  const refresh = async () => {
    if (!userId) {
      return
    }
    try {
      setRoutine(await fetchDailyRoutine(userId, date))
      setLoadError(null)
    } catch (error) {
      console.error('Failed to fetch daily routine:', error)
      setLoadError(error)
      setRoutine({ date, tasks: [] })
    }
  }

  useEffect(() => {
    refresh()
  }, [date, userId])

  // Exposed for the task modal's onSaved. A plan change reloads the plan, then tells the owner (the page refreshes the reflection while reflecting).
  const afterChange = async () => {
    await refresh()
    await onChanged?.()
  }

  const completedOf = (id: string | undefined) => routine?.tasks?.find((current) => current.id === id)?.completed ?? false

  const submitTask = async (mode: 'create' | 'edit', task: BoardTask) => {
    let routineId = routine?.id
    if (!routineId) {
      // No real DailyRoutine yet for this date (only happens for non-today
      // dates that haven't been touched) — create it now, cloning from the
      // default routine.
      const ensured = await ensureDailyRoutine(userId as string, date)
      routineId = ensured.id
    }

    if (mode === 'create') {
      return createDailyTasks(routineId as string, [{ ...task, completed: false }])
    }
    return updateDailyTasks([{ ...task, completed: completedOf(task.id) }])
  }

  const persistTasks = async (updatedTasks: BoardTask | BoardTask[]) => {
    const tasks = Array.isArray(updatedTasks) ? updatedTasks : [updatedTasks]
    // Preserve existing completed status for each task
    await updateDailyTasks(tasks.map((task) => ({ ...task, completed: completedOf(task.id) })))
    await afterChange()
  }

  const deleteTask = async (task: BoardTask) => {
    if (!task?.id) {
      return
    }
    try {
      await deleteDailyTasks([task.id])
      await afterChange()
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const toggleComplete = async (task: BoardTask) => {
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
    await refresh()
  }

  const cleanUp = async () => {
    const taskIds = (routine?.tasks ?? []).map((task) => task.id).filter(Boolean) as string[]
    if (taskIds.length === 0) {
      return
    }
    await deleteDailyTasks(taskIds)
    await afterChange()
  }

  // F012: replace the plan with a fresh copy of the default routine; the reflection is not touched.
  const resetDay = async () => {
    setIsResetting(true)
    setResetFailure(null)
    try {
      await resetDailyRoutine(userId as string, date)
      await afterChange()
    } catch (error) {
      console.error('Failed to reset the day:', error)
      setResetFailure(date)
    } finally {
      setIsResetting(false)
    }
  }

  return { routine, loadError, isResetting, resetFailure, refresh, afterChange, submitTask, persistTasks, deleteTask, toggleComplete, cleanUp, resetDay }
}
