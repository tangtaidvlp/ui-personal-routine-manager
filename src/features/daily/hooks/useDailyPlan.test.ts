// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/dailyRoutineTasks.ts'
import type { DailyRoutine } from '../types/dailyRoutine.ts'
import { useDailyPlan } from './useDailyPlan.ts'

vi.mock('../api/dailyRoutineTasks.ts')
const mocked = vi.mocked(api)

const withId: DailyRoutine = { id: 'r1', date: '2026-03-01', tasks: [{ id: 't1', name: 'Run', startTime: '07:00', durationMinutes: 30, completed: true }] }
const noId: DailyRoutine = { date: '2026-03-01', tasks: [] }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocked.updateDailyTasks.mockResolvedValue([])
  mocked.createDailyTasks.mockResolvedValue([])
  mocked.deleteDailyTasks.mockResolvedValue()
  mocked.resetDailyRoutine.mockResolvedValue()
})

async function setup(routine = withId, onChanged = vi.fn()) {
  mocked.fetchDailyRoutine.mockResolvedValue(routine)
  const hook = renderHook(() => useDailyPlan('u1', '2026-03-01', { onChanged }))
  await waitFor(() => expect(hook.result.current.routine).toEqual(routine))
  return { ...hook, onChanged }
}

describe('useDailyPlan', () => {
  it('shows an empty day and exposes loadError when the load fails', async () => {
    mocked.fetchDailyRoutine.mockRejectedValue(new Error('down'))
    const { result } = renderHook(() => useDailyPlan('u1', '2026-03-01'))
    await waitFor(() => expect(result.current.routine).toEqual({ date: '2026-03-01', tasks: [] }))
    expect(result.current.loadError).toBeInstanceOf(Error)
  })

  it('does not load without a user', () => {
    renderHook(() => useDailyPlan(undefined, '2026-03-01'))
    expect(mocked.fetchDailyRoutine).not.toHaveBeenCalled()
  })

  it('creates the day on the first write when it has no id', async () => {
    mocked.ensureDailyRoutine.mockResolvedValue({ id: 'r9', date: '2026-03-01', tasks: [] })
    const { result } = await setup(noId)
    await act(() => result.current.submitTask('create', { name: 'New', startTime: '08:00', durationMinutes: 30 }))
    expect(mocked.ensureDailyRoutine).toHaveBeenCalledWith('u1', '2026-03-01')
    expect(mocked.createDailyTasks).toHaveBeenCalledWith('r9', [{ name: 'New', startTime: '08:00', durationMinutes: 30, completed: false }])
  })

  it('does not create the day again when it has an id', async () => {
    const { result } = await setup()
    await act(() => result.current.submitTask('create', { name: 'New', startTime: '08:00', durationMinutes: 30 }))
    expect(mocked.ensureDailyRoutine).not.toHaveBeenCalled()
    expect(mocked.createDailyTasks).toHaveBeenCalledWith('r1', expect.any(Array))
  })

  it('keeps the completed flag when a task is edited', async () => {
    const { result } = await setup()
    await act(() => result.current.submitTask('edit', { id: 't1', name: 'Run far', startTime: '07:00', durationMinutes: 45 }))
    expect(mocked.updateDailyTasks).toHaveBeenCalledWith([{ id: 't1', name: 'Run far', startTime: '07:00', durationMinutes: 45, completed: true }])
  })

  it('keeps the completed flag on a drag, reloads the plan, then calls onChanged', async () => {
    const order: string[] = []
    const onChanged = vi.fn(() => { order.push('changed') })
    const { result } = await setup(withId, onChanged)
    mocked.fetchDailyRoutine.mockImplementation(async () => { order.push('fetch'); return withId })
    await act(() => result.current.persistTasks([{ id: 't1', name: 'Run', startTime: '09:00', durationMinutes: 30 }]))
    expect(mocked.updateDailyTasks).toHaveBeenCalledWith([expect.objectContaining({ id: 't1', startTime: '09:00', completed: true })])
    expect(order).toEqual(['fetch', 'changed'])
  })

  it('toggleComplete flips the flag and reloads the plan only', async () => {
    const { result, onChanged } = await setup()
    await act(() => result.current.toggleComplete({ id: 't1', name: 'Run', startTime: '07:00', durationMinutes: 30, completed: true }))
    expect(mocked.updateDailyTasks).toHaveBeenCalledWith([expect.objectContaining({ id: 't1', completed: false })])
    expect(mocked.fetchDailyRoutine).toHaveBeenCalledTimes(2)
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('deleteTask ignores a task without an id and logs a failed delete', async () => {
    const { result, onChanged } = await setup()
    await act(() => result.current.deleteTask({ name: 'x', startTime: '07:00', durationMinutes: 30 }))
    expect(mocked.deleteDailyTasks).not.toHaveBeenCalled()
    mocked.deleteDailyTasks.mockRejectedValue(new Error('no'))
    await act(() => result.current.deleteTask({ id: 't1', name: 'Run', startTime: '07:00', durationMinutes: 30 }))
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('cleanUp deletes every task, and does nothing on an empty day', async () => {
    const { result, onChanged } = await setup()
    await act(() => result.current.cleanUp())
    expect(mocked.deleteDailyTasks).toHaveBeenCalledWith(['t1'])
    expect(onChanged).toHaveBeenCalledTimes(1)
    const empty = await setup(noId)
    mocked.deleteDailyTasks.mockClear()
    await act(() => empty.result.current.cleanUp())
    expect(mocked.deleteDailyTasks).not.toHaveBeenCalled()
  })

  it('resetDay reloads and notifies; a failure is remembered for that date', async () => {
    const { result, onChanged } = await setup()
    await act(() => result.current.resetDay())
    expect(mocked.resetDailyRoutine).toHaveBeenCalledWith('u1', '2026-03-01')
    expect(onChanged).toHaveBeenCalledTimes(1)
    mocked.resetDailyRoutine.mockRejectedValue(new Error('no'))
    await act(() => result.current.resetDay())
    expect(result.current.resetFailure).toBe('2026-03-01')
    expect(result.current.isResetting).toBe(false)
  })
})
