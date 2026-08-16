import { ApiError, apiRequest } from '../../../lib/api.ts'
import type { DailyRoutine, DailyTask } from '../types/dailyRoutine.ts'

type ChatResponse = {
  reply?: unknown
}

function toAbsoluteApiUrl(path: string): string {
  return new URL(path, window.location.origin).toString()
}

export async function fetchDailyRoutine(userId: string, date: string): Promise<DailyRoutine> {
  return apiRequest<DailyRoutine>(
    toAbsoluteApiUrl(`/api/routine-manager/daily-routine/${userId}?date=${date}`),
    { method: 'GET' },
  )
}

export async function ensureDailyRoutine(userId: string, date: string): Promise<DailyRoutine> {
  return apiRequest<DailyRoutine>(
    toAbsoluteApiUrl(`/api/routine-manager/daily-routine/${userId}?date=${date}`),
    { method: 'POST' },
  )
}

export async function createDailyTasks(routineId: string, tasks: DailyTask[]): Promise<DailyTask[]> {
  return apiRequest<DailyTask[]>(
    toAbsoluteApiUrl(`/api/routine-manager/daily-routine/${routineId}/tasks`),
    { method: 'POST', json: tasks },
  )
}

export async function updateDailyTasks(tasks: DailyTask[]): Promise<DailyTask[]> {
  return apiRequest<DailyTask[]>(
    toAbsoluteApiUrl('/api/routine-manager/daily-routine/tasks'),
    { method: 'PUT', json: tasks },
  )
}

export async function deleteDailyTasks(taskIds: string[]): Promise<void> {
  await apiRequest<void>(
    toAbsoluteApiUrl(`/api/routine-manager/daily-routine/tasks?taskIds=${taskIds.join(',')}`),
    { method: 'DELETE' },
  )
}

export async function submitDailyRoutineChat(
  userId: string,
  dailyRoutine: DailyRoutine,
  date: string,
  message: string,
): Promise<string> {
  const data = await apiRequest<ChatResponse>(toAbsoluteApiUrl(`/api/ai/chat/daily-routine/${userId}`), {
    method: 'POST',
    json: { dailyRoutine, date, message },
  })

  if (!data || typeof data.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }

  return data.reply
}
