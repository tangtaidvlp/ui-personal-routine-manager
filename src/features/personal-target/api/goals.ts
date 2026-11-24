import { apiRequest } from '../../../lib/api.ts'
import type { GoalInput, GoalList, GoalSaveResult } from '../types/goal.ts'
import { parseGoalSaveResult, toGoal } from '../utils/goalPayload.ts'
import { MAX_GOALS } from '../utils/goalRules.ts'

/** Personal goals API (specs/F013 contracts/goals-api.md). */

const goalsPath = (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}/goals`
const goalPath = (userId: string, goalId: string) => `${goalsPath(userId)}/${encodeURIComponent(goalId)}`

export async function fetchGoals(userId: string): Promise<GoalList> {
  const raw = await apiRequest<{ goals?: unknown; limit?: unknown } | null>(goalsPath(userId), { method: 'GET' })
  const goals = Array.isArray(raw?.goals) ? raw.goals.map(toGoal) : []
  const limit = typeof raw?.limit === 'number' ? raw.limit : MAX_GOALS
  return { goals, limit }
}

/** Buddy checks the goal first (US5): the result is the saved goal or Buddy's refusal. */
export async function createGoal(userId: string, input: GoalInput): Promise<GoalSaveResult> {
  return parseGoalSaveResult(await apiRequest(goalsPath(userId), { method: 'POST', json: input }))
}

export async function updateGoal(userId: string, goalId: string, input: GoalInput): Promise<GoalSaveResult> {
  return parseGoalSaveResult(await apiRequest(goalPath(userId, goalId), { method: 'PUT', json: input }))
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  await apiRequest(goalPath(userId, goalId), { method: 'DELETE' })
}
