import { ApiError, apiRequest } from '../../../lib/api.ts'
import { currentLocalTime } from '../../../lib/localTime.ts'
import type { DefaultRoutine } from '../types/routine.ts'
import { assertChatHistoryPage, type ChatHistoryPage } from '../../buddy-chat/types/chatHistory.ts'
import type { BuddyReply } from '../../buddy-chat/types/buddyReply.ts'
import { parseBuddyReply } from '../../buddy-chat/utils/buddyReply.ts'

/**
 * Ask Routine Buddy to change a default routine after onboarding. Same endpoint as the
 * onboarding chat, without the "Onboarding: […]" framing (the server keeps one
 * conversation per routine).
 */
export async function submitDefaultRoutineChat(userId: string, defaultRoutine: DefaultRoutine | null, message: string): Promise<BuddyReply> {
  const data = await apiRequest<unknown>(`/api/ai/chat/default-routine/${userId}`, {
    method: 'POST',
    json: { defaultRoutine, message, localTime: currentLocalTime() },
  })

  return parseBuddyReply(data)
}

/**
 * One page of the stored Buddy conversation for a default routine (F004).
 * Includes onboarding messages, which share the conversation. Omit `before` for the newest page.
 */
export async function fetchDefaultRoutineChatHistory(
  userId: string,
  routineId: string,
  before?: number | null,
): Promise<ChatHistoryPage> {
  const query = before != null ? `?before=${before}` : ''
  const data = await apiRequest<unknown>(`/api/ai/chat/default-routine/${userId}/${routineId}/messages${query}`, {
    method: 'GET',
  })
  try {
    assertChatHistoryPage(data)
  } catch {
    throw new ApiError(502, 'Invalid chat history payload')
  }
  return data
}
