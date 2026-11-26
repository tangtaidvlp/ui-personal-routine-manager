// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api/reflection.ts'
import type { ReflectionView } from '../types/reflection.ts'
import { useReflectionMode } from './useReflectionMode.ts'

vi.mock('../api/reflection.ts')
const mocked = vi.mocked(api)

function view(date: string, exists = true): ReflectionView {
  return {
    exists, id: exists ? `rf-${date}` : null, date, tasks: [], plannedTasks: [], feedback: null,
    comparison: { plannedMinutes: 0, actualMinutes: 0, counts: { asPlanned: 0, changed: 0, skipped: 0, unplanned: 0 }, items: [] },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocked.fetchReflection.mockImplementation(async (_user, date) => view(date))
  mocked.ensureReflection.mockImplementation(async (_user, date) => view(date))
})

function setup(isFuture = false) {
  return renderHook(({ date }) => useReflectionMode('u1', date, isFuture), { initialProps: { date: '2026-03-01' } })
}

describe('useReflectionMode', () => {
  it('does nothing until the mode is on', () => {
    setup()
    expect(mocked.fetchReflection).not.toHaveBeenCalled()
    expect(mocked.ensureReflection).not.toHaveBeenCalled()
  })

  it('creates the reflection when entering through the toggle', async () => {
    const { result } = setup()
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.reflectionReady).toBe(true))
    expect(mocked.ensureReflection).toHaveBeenCalledWith('u1', '2026-03-01')
    expect(mocked.fetchReflection).not.toHaveBeenCalled()
  })

  it('only reads when the date changes while reflecting', async () => {
    const { result, rerender } = setup()
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.reflectionReady).toBe(true))
    rerender({ date: '2026-02-28' })
    await waitFor(() => expect(result.current.reflection?.date).toBe('2026-02-28'))
    expect(mocked.fetchReflection).toHaveBeenCalledWith('u1', '2026-02-28')
    expect(mocked.ensureReflection).toHaveBeenCalledTimes(1)
  })

  it('drops a slow response for an earlier date', async () => {
    const slow = deferred<ReflectionView>()
    mocked.ensureReflection.mockReturnValueOnce(slow.promise)
    const { result, rerender } = setup()
    act(() => result.current.toggle())
    rerender({ date: '2026-02-28' })
    await waitFor(() => expect(result.current.reflection?.date).toBe('2026-02-28'))
    await act(async () => slow.resolve(view('2026-03-01')))
    expect(result.current.reflection?.date).toBe('2026-02-28')
  })

  it('drops a response that arrives after leaving the mode', async () => {
    const slow = deferred<ReflectionView>()
    mocked.ensureReflection.mockReturnValueOnce(slow.promise)
    const { result } = setup()
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    await act(async () => slow.resolve(view('2026-03-01')))
    expect(result.current.reflection).toBeNull()
    expect(result.current.inReflection).toBe(false)
  })

  it('shows a load error and keeps no reflection', async () => {
    mocked.ensureReflection.mockRejectedValue(new Error('down'))
    const { result } = setup()
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.error).toBe("Couldn't start your reflection. Please try again."))
    expect(result.current.reflection).toBeNull()
  })

  it('cannot be entered on a future date', () => {
    const { result } = setup(true)
    act(() => result.current.toggle())
    expect(result.current.reflectionOn).toBe(false)
    expect(mocked.ensureReflection).not.toHaveBeenCalled()
  })

  it('refresh reads only while reflecting', async () => {
    const { result } = setup()
    await act(() => result.current.refresh())
    expect(mocked.fetchReflection).not.toHaveBeenCalled()
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.reflectionReady).toBe(true))
    await act(() => result.current.refresh())
    expect(mocked.fetchReflection).toHaveBeenCalledTimes(1)
  })

  it('keeps the colour of an edited reality task', async () => {
    const withTask = { ...view('2026-03-01'), tasks: [{ id: 'a1', name: 'Gym', startTime: '07:00', durationMinutes: 30, color: 'blue' }] }
    mocked.ensureReflection.mockResolvedValue(withTask)
    mocked.updateReflectionTasks.mockResolvedValue(withTask)
    const { result } = setup()
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.reflectionReady).toBe(true))
    await act(() => result.current.submitTask('edit', { id: 'a1', name: 'Gym!', startTime: '07:00', durationMinutes: 30 }))
    expect(mocked.updateReflectionTasks).toHaveBeenCalledWith('u1', '2026-03-01', [expect.objectContaining({ id: 'a1', color: 'blue' })])
  })

  it('deleteTask ignores a task without an id and swallows a failed delete', async () => {
    const { result } = setup()
    await act(() => result.current.deleteTask({ name: 'x', startTime: '07:00', durationMinutes: 30 }))
    expect(mocked.deleteReflectionTasks).not.toHaveBeenCalled()
    mocked.deleteReflectionTasks.mockRejectedValue(new Error('no'))
    await act(() => result.current.deleteTask({ id: 'a1', name: 'x', startTime: '07:00', durationMinutes: 30 }))
    expect(mocked.deleteReflectionTasks).toHaveBeenCalledWith('u1', '2026-03-01', ['a1'])
  })

  it('sendChat creates the reflection first when there is none', async () => {
    mocked.ensureReflection.mockResolvedValueOnce(view('2026-03-01', false))
    mocked.submitReflectionChat.mockResolvedValue({ text: 'ok' } as never)
    const { result } = setup()
    act(() => result.current.toggle())
    await waitFor(() => expect(result.current.reflection?.exists).toBe(false))
    mocked.ensureReflection.mockClear()
    await act(() => result.current.sendChat('hi'))
    expect(mocked.ensureReflection).toHaveBeenCalledTimes(1)
    expect(mocked.submitReflectionChat).toHaveBeenCalledWith('u1', '2026-03-01', 'hi')
  })
})
