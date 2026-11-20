import { ApiError, apiRequest } from '../../../lib/api.ts'
import type { DefaultRoutine } from '../../onboarding/types/routine.ts'

type ChatResponse = { reply?: unknown }

/**
 * Ask Routine Buddy to change a default routine after onboarding. Same endpoint as the
 * onboarding chat, without the "Onboarding: […]" framing (the server keeps one
 * conversation per routine).
 */
export async function submitDefaultRoutineChat(userId: string, defaultRoutine: DefaultRoutine | null, message: string): Promise<string> {
  const data = await apiRequest<ChatResponse>(`/api/ai/chat/default-routine/${userId}`, {
    method: 'POST',
    json: { defaultRoutine, message },
  })

  if (!data || typeof data.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }

  return data.reply
}
