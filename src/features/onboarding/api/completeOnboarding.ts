import { apiRequest } from '../../../lib/api.ts'
import { currentLocalTime } from '../../../lib/localTime.ts'
import type { BuddyReply } from '../../buddy-chat/types/buddyReply.ts'
import { parseBuddyReply } from '../../buddy-chat/utils/buddyReply.ts'

export async function completeOnboarding(userId: string): Promise<void> {
  await apiRequest<unknown>(`/api/users/${userId}/onboarding/complete`, {
    method: 'POST',
  })
}

export async function submitOnboardingChat(userId: string, defaultRoutine: object, message: string): Promise<BuddyReply> {
  console.log("Submitting onboarding chat for userId:", userId, "defaultRoutine:", defaultRoutine, "message:", message);
  const data = await apiRequest<unknown>(`/api/ai/chat/default-routine/${userId}`, {
    method: 'POST',
    json: { 
      defaultRoutine: defaultRoutine,
      message: "Onboarding: [" + message + "]",
      localTime: currentLocalTime(),
    },
  })

  return parseBuddyReply(data)
}