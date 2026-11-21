import { ApiError, apiRequest } from '../../../lib/api.ts'
import type { DailyRoutine, DailyTask } from '../types/dailyRoutine.ts'
import { assertChatHistoryPage, type ChatHistoryPage } from '../../onboarding/types/chatHistory.ts'

type ChatResponse = {
  reply?: unknown
}

export async function fetchDailyRoutine(userId: string, date: string): Promise<DailyRoutine> {
  return apiRequest<DailyRoutine>(`/api/routine-manager/daily-routine/${userId}?date=${date}`,
    { method: 'GET' },
  )
}

export async function ensureDailyRoutine(userId: string, date: string): Promise<DailyRoutine> {
  return apiRequest<DailyRoutine>(
    `/api/routine-manager/daily-routine/${userId}?date=${date}`,
    { method: 'POST' },
  )
}

export async function createDailyTasks(routineId: string, tasks: DailyTask[]): Promise<DailyTask[]> {
  return apiRequest<DailyTask[]>(
    `/api/routine-manager/daily-routine/${routineId}/tasks`,
    { method: 'POST', json: tasks },
  )
}

export async function updateDailyTasks(tasks: DailyTask[]): Promise<DailyTask[]> {
  return apiRequest<DailyTask[]>(
    '/api/routine-manager/daily-routine/tasks',
    { method: 'PUT', json: tasks },
  )
}

export async function deleteDailyTasks(taskIds: string[]): Promise<void> {
  await apiRequest<void>(
    `/api/routine-manager/daily-routine/tasks?taskIds=${taskIds.join(',')}`,
    { method: 'DELETE' },
  )
}

export async function submitDailyRoutineChat(
  userId: string,
  dailyRoutine: DailyRoutine,
  date: string,
  message: string,
): Promise<string> {
  const data = await apiRequest<ChatResponse>(`/api/ai/chat/daily-routine/${userId}`, {
    method: 'POST',
    json: { dailyRoutine, date, message },
  })

  if (!data || typeof data.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }

  return data.reply
}

/** One page of the stored Buddy conversation for a day (F004). Omit `before` for the newest page. */
export async function fetchDailyRoutineChatHistory(
  userId: string,
  date: string,
  before?: number | null,
): Promise<ChatHistoryPage> {
  const query = before != null ? `?before=${before}` : ''
  const data = await apiRequest<unknown>(`/api/ai/chat/daily-routine/${userId}/${date}/messages${query}`, {
    method: 'GET',
  })
  try {
    assertChatHistoryPage(data)
  } catch {
    throw new ApiError(502, 'Invalid chat history payload')
  }
  return data
}
