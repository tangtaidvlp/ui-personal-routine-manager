import { ApiError, apiRequest } from '../../../lib/api.ts'

type ChatResponse = {
  reply?: unknown
}

function toAbsoluteApiUrl(path: string): string {
  return new URL(path, window.location.origin).toString()
}

export async function completeOnboarding(userId: string): Promise<void> {
  await apiRequest<unknown>(toAbsoluteApiUrl(`/api/users/${userId}/onboarding/complete`), {
    method: 'POST',
  })
}

export async function submitOnboardingChat(userId: string, message: string): Promise<string> {
  const data = await apiRequest<ChatResponse>(toAbsoluteApiUrl(`/api/ai/chat/${userId}`), {
    method: 'POST',
    json: { message: "Onboarding: [" + message + "]" },
  })

  if (!data || typeof data.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }

  return data.reply
}