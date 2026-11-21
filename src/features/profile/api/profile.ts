import { apiRequest } from '../../../lib/api.ts'
import type { UserProfile } from '../types/profile.ts'

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/api/v1/users/${encodeURIComponent(userId)}/profile`, { method: 'GET' })
}
