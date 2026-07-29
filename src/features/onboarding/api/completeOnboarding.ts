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

export async function submitOnboardingChat(userId: string, defaultRoutine: object, message: string): Promise<string> {
  console.log("Submitting onboarding chat for userId:", userId, "defaultRoutine:", defaultRoutine, "message:", message);
  const data = await apiRequest<ChatResponse>(toAbsoluteApiUrl(`/api/ai/chat/default-routine/${userId}`), {
    method: 'POST',
    json: { 
      defaultRoutine: defaultRoutine,
      message: "Onboarding: [" + message + "]" 
    },
  })

  if (!data || typeof data.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }

  return data.reply
}