import { useEffect, useRef, useState } from 'react'
import type { BoardTask } from '../../board/types/board.ts'
import {
  createReflectionTasks,
  deleteReflectionTasks,
  ensureReflection,
  fetchReflection,
  requestReflectionFeedback,
  submitReflectionChat,
  updateReflectionTasks,
} from '../api/reflection.ts'
import type { ReflectionTask, ReflectionView } from '../types/reflection.ts'

/**
 * F007 Reflection mode for the Today page. Kept across date changes; never active on future dates.
 * Browsing only reads (GET); a reflection is created by switching to Reality or by "Reflect on this day"
 * (no silent writes). Responses for an earlier user/date/mode are dropped, so fast switching never shows the wrong day.
 * `userId` is undefined until sign-in is known.
 */
export function useReflectionMode(userId: string | undefined, date: string, isFuture: boolean) {
  const [reflectionOn, setReflectionOn] = useState(false)
  const [reflection, setReflection] = useState<ReflectionView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inReflection = reflectionOn && !isFuture
  const reflectionReady = inReflection && Boolean(reflection?.exists)

  const key = `${userId}:${date}:${inReflection}`
  const keyRef = useRef(key)
  keyRef.current = key
  // Set by the toggle: entering the mode creates the reflection (copies the plan once).
  const createOnEnterRef = useRef(false)

  const load = async (fetchView: () => Promise<ReflectionView>, failureMessage: string) => {
    const startedKey = keyRef.current
    try {
      const view = await fetchView()
      if (keyRef.current === startedKey) {
        setReflection(view)
        setError(null)
      }
    } catch (failure) {
      console.error(failureMessage, failure)
      if (keyRef.current === startedKey) {
        setError(failureMessage)
      }
    }
  }

  const refresh = () => {
    if (!userId || !inReflection) {
      return Promise.resolve()
    }
    return load(() => fetchReflection(userId, date), "Couldn't load your reflection. Please try again.")
  }

  const start = () =>
    load(() => ensureReflection(userId as string, date), "Couldn't start your reflection. Please try again.")

  useEffect(() => {
    setReflection(null)
    setError(null)
    if (!userId || !inReflection) {
      return
    }
    if (createOnEnterRef.current) {
      createOnEnterRef.current = false
      start()
    } else {
      refresh()
    }
  }, [date, userId, inReflection])

  const toggle = () => {
    if (inReflection) {
      setReflectionOn(false)
      return
    }
    if (isFuture) {
      return
    }
    createOnEnterRef.current = true
    setReflectionOn(true)
  }

  const taskById = (id: string | null | undefined) => reflection?.tasks?.find((current) => current.id === id)

  const submitTask = async (mode: 'create' | 'edit', task: BoardTask) => {
    const view = mode === 'create'
      ? await createReflectionTasks(userId as string, date, [task])
      : await updateReflectionTasks(userId as string, date, [{ ...task, color: task.color ?? taskById(task.id)?.color }])
    setReflection(view)
    return view
  }

  const persistTasks = async (updatedTasks: BoardTask | BoardTask[]) => {
    const tasks: ReflectionTask[] = Array.isArray(updatedTasks) ? updatedTasks : [updatedTasks]
    setReflection(await updateReflectionTasks(userId as string, date, tasks))
  }

  const deleteTask = async (task: BoardTask) => {
    if (!task?.id) {
      return
    }
    try {
      setReflection(await deleteReflectionTasks(userId as string, date, [task.id]))
    } catch (failure) {
      console.error('Failed to delete reflection task:', failure)
    }
  }

  const requestFeedback = async () => setReflection(await requestReflectionFeedback(userId as string, date))

  const sendChat = async (message: string) => {
    if (!reflection?.exists) {
      setReflection(await ensureReflection(userId as string, date))
    }
    return submitReflectionChat(userId as string, date, message)
  }

  return {
    reflectionOn, reflection, error, inReflection, reflectionReady,
    toggle, start, refresh, taskById, submitTask, persistTasks, deleteTask, requestFeedback, sendChat,
  }
}
