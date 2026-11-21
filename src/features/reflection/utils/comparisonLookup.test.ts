import { describe, expect, it } from 'vitest'
import type { ReflectionView } from '../types/reflection.ts'
import { itemForActualTask } from './comparisonLookup.ts'

const view = {
  exists: true,
  id: 'r1',
  date: '2026-11-22',
  tasks: [],
  plannedTasks: [],
  feedback: null,
  comparison: {
    plannedMinutes: 90,
    actualMinutes: 60,
    counts: { asPlanned: 0, changed: 1, skipped: 1, unplanned: 0 },
    items: [
      { status: 'CHANGED', planned: { id: 'p1', name: 'Gym', startTime: '07:00', durationMinutes: 60 }, actual: { id: 'a1', name: 'Gym', startTime: '07:30', durationMinutes: 60 } },
      { status: 'SKIPPED', planned: { id: 'p2', name: 'Read', startTime: '21:00', durationMinutes: 30 }, actual: null },
    ],
  },
} as ReflectionView

describe('itemForActualTask', () => {
  it('finds the row for a reality task', () => {
    expect(itemForActualTask(view, 'a1')?.status).toBe('CHANGED')
  })

  it('returns null for unknown ids, planned-only ids and missing input', () => {
    expect(itemForActualTask(view, 'nope')).toBeNull()
    expect(itemForActualTask(view, 'p2')).toBeNull()
    expect(itemForActualTask(null, 'a1')).toBeNull()
    expect(itemForActualTask(view, undefined)).toBeNull()
  })
})
