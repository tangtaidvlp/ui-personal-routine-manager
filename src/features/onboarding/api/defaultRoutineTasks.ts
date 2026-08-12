import { apiRequest } from '../../../lib/api.ts'
import type { RoutineTask } from '../types/routine.ts'

export async function createDefaultTasks(routineId: string, tasks: RoutineTask[]): Promise<RoutineTask[]> {
  return apiRequest<RoutineTask[]>(`/default-routine/${routineId}/tasks`, {
    method: 'POST',
    json: tasks,
  })
}

export async function updateDefaultTasks(tasks: RoutineTask[]): Promise<RoutineTask[]> {
  return apiRequest<RoutineTask[]>('/default-routine/tasks', {
    method: 'PUT',
    json: tasks,
  })
}
