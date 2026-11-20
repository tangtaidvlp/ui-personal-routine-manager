import { apiRequest } from '../../../lib/api.ts'
import type { DefaultRoutine } from '../types/routine.ts'

/** `DAILY` is the weekday routine; `WEEKEND` the weekend one (contracts/default-routine-api.md). */
export type RoutineType = 'DAILY' | 'WEEKEND'

/**
 * Get one of the user's default routines. The server creates an empty weekend
 * routine on first request for users who don't have one yet.
 */
export async function fetchDefaultRoutine(userId: string, type: RoutineType): Promise<DefaultRoutine> {
  return apiRequest<DefaultRoutine>(`/api/v1/default-routine/users/${userId}?type=${type}`, {
    method: 'GET',
  })
}
