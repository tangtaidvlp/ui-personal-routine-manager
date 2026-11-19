import { apiRequest } from '../../../lib/api.ts'
import type { RoutineTask } from '../types/routine.ts'

export async function createDefaultTasks(routineId: string, tasks: RoutineTask[]): Promise<RoutineTask[]> {
  return apiRequest<RoutineTask[]>(`/api/v1/default-routine/${routineId}/tasks`, {
    method: 'POST',
    json: tasks,
  })
}

export async function updateDefaultTasks(tasks: RoutineTask[]): Promise<RoutineTask[]> {
  return apiRequest<RoutineTask[]>('/api/v1/default-routine/tasks', {
    method: 'PUT',
    json: tasks,
  })
}

export async function deleteDefaultTasks(taskIds: string[]): Promise<void> {
  await apiRequest<void>(`/api/v1/default-routine/tasks?taskIds=${taskIds.join(',')}`, {
    method: 'DELETE',
  })
}
