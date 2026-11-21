import type { ReflectionView } from '../types/reflection.ts'

/** A reflection with one task in every group (shared by the reflection component tests). */
export function testView(overrides: Partial<ReflectionView> = {}): ReflectionView {
  return {
    exists: true,
    id: 'r1',
    date: '2026-11-21',
    tasks: [],
    plannedTasks: [],
    comparison: {
      plannedMinutes: 300,
      actualMinutes: 330,
      counts: { asPlanned: 1, changed: 1, skipped: 1, unplanned: 1 },
      items: [
        { status: 'AS_PLANNED', planned: { id: 'p1', name: 'Gym', startTime: '07:00', durationMinutes: 60 }, actual: { id: 'a1', name: 'Gym', startTime: '07:00', durationMinutes: 60 } },
        { status: 'CHANGED', planned: { id: 'p2', name: 'Work', startTime: '09:00', durationMinutes: 210 }, actual: { id: 'a2', name: 'Deep work', startTime: '09:30', durationMinutes: 225 } },
        { status: 'UNPLANNED', planned: null, actual: { id: 'a3', name: 'Coffee', startTime: '16:00', durationMinutes: 45 } },
        { status: 'SKIPPED', planned: { id: 'p3', name: 'Read', startTime: '21:00', durationMinutes: 30 }, actual: null },
      ],
    },
    feedback: null,
    ...overrides,
  }
}
