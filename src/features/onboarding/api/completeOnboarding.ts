import { ApiError } from '../../../lib/api.ts'

export async function completeOnboarding(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}/onboarding/complete`, {
    method: 'POST',
    credentials: 'include',
  })

  if (response.ok) {
    return
  }

  let message = `Request failed with status ${response.status}`

  try {
    const data = await response.json()
    if (data && typeof data === 'object' && 'message' in data) {
      message = String((data as { message: unknown }).message)
    }
  } catch {
    // Response body is empty or non-JSON.
  }

  throw new ApiError(response.status, message)
}