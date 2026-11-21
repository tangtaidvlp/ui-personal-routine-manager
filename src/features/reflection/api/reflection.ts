import { ApiError, apiRequest } from '../../../lib/api.ts'
import { assertChatHistoryPage, type ChatHistoryPage } from '../../onboarding/types/chatHistory.ts'
import type { ReflectionTask, ReflectionView } from '../types/reflection.ts'

/** F007: every reflection endpoint returns the full ReflectionView. */
function base(userId: string, date: string): string {
  return `/api/routine-manager/daily-reflection/${userId}/${date}`
}

/** Read only: never creates a reflection. */
export function fetchReflection(userId: string, date: string): Promise<ReflectionView> {
  return apiRequest<ReflectionView>(base(userId, date), { method: 'GET' })
}

/** Create-or-get: copies the day's plan the first time. */
export function ensureReflection(userId: string, date: string): Promise<ReflectionView> {
  return apiRequest<ReflectionView>(base(userId, date), { method: 'POST' })
}

type TaskWrite = Pick<ReflectionTask, 'name' | 'description' | 'startTime' | 'durationMinutes' | 'color'> & { id?: string }

function toWrite(task: ReflectionTask): TaskWrite {
  return {
    id: task.id,
    name: task.name,
    description: task.description ?? null,
    startTime: task.startTime,
    durationMinutes: task.durationMinutes,
    color: task.color ?? null,
  }
}

export function createReflectionTasks(userId: string, date: string, tasks: ReflectionTask[]): Promise<ReflectionView> {
  return apiRequest<ReflectionView>(`${base(userId, date)}/tasks`, {
    method: 'POST',
    json: tasks.map(({ id: _id, ...task }) => toWrite(task)),
  })
}

export function updateReflectionTasks(userId: string, date: string, tasks: ReflectionTask[]): Promise<ReflectionView> {
  return apiRequest<ReflectionView>(`${base(userId, date)}/tasks`, { method: 'PUT', json: tasks.map(toWrite) })
}

export function deleteReflectionTasks(userId: string, date: string, taskIds: string[]): Promise<ReflectionView> {
  return apiRequest<ReflectionView>(`${base(userId, date)}/tasks?taskIds=${taskIds.join(',')}`, { method: 'DELETE' })
}

/** Buddy's encouraging note; ApiError 503 when Buddy is unavailable. */
export function requestReflectionFeedback(userId: string, date: string): Promise<ReflectionView> {
  return apiRequest<ReflectionView>(`${base(userId, date)}/feedback`, { method: 'POST' })
}

export async function submitReflectionChat(userId: string, date: string, message: string): Promise<string> {
  const data = await apiRequest<{ reply?: unknown }>(`/api/ai/chat/daily-reflection/${userId}`, {
    method: 'POST',
    json: { date, message },
  })
  if (!data || typeof data.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }
  return data.reply
}

/** One page of the day's reflection chat (separate from the planning chat). */
export async function fetchReflectionChatHistory(
  userId: string,
  date: string,
  before?: number | null,
): Promise<ChatHistoryPage> {
  const query = before != null ? `?before=${before}` : ''
  const data = await apiRequest<unknown>(`/api/ai/chat/daily-reflection/${userId}/${date}/messages${query}`, {
    method: 'GET',
  })
  try {
    assertChatHistoryPage(data)
  } catch {
    throw new ApiError(502, 'Invalid chat history payload')
  }
  return data
}
