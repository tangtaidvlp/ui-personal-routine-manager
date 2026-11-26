import { ApiError, apiRequest } from '../../../lib/api.ts'
import { currentLocalTime } from '../../../lib/localTime.ts'
import { assertChatHistoryPage, type ChatHistoryPage } from '../../buddy-chat/types/chatHistory.ts'
import type { BuddyReply } from '../../buddy-chat/types/buddyReply.ts'
import { parseBuddyReply } from '../../buddy-chat/utils/buddyReply.ts'

/**
 * Buddy chat on the Personal Target page (specs/F013 US4, contracts/personal-target-chat-api.md):
 * one conversation per user, where Buddy can only propose goals.
 */
export async function submitPersonalTargetChat(userId: string, message: string): Promise<BuddyReply> {
  const data = await apiRequest<unknown>(`/api/ai/chat/personal-target/${userId}`, {
    method: 'POST',
    json: { message, localTime: currentLocalTime() },
  })
  return parseBuddyReply(data)
}

/** One page of the stored Personal Target conversation (F004 paging). Omit `before` for the newest page. */
export async function fetchPersonalTargetChatHistory(userId: string, before?: number | null): Promise<ChatHistoryPage> {
  const query = before != null ? `?before=${before}` : ''
  const data = await apiRequest<unknown>(`/api/ai/chat/personal-target/${userId}/messages${query}`, {
    method: 'GET',
  })
  try {
    assertChatHistoryPage(data)
  } catch {
    throw new ApiError(502, 'Invalid chat history payload')
  }
  return data
}
