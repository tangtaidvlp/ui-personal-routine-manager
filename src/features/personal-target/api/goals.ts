import { apiRequest } from '../../../lib/api.ts'
import type { Goal, GoalInput, GoalList } from '../types/goal.ts'
import { MAX_GOALS } from '../utils/goalRules.ts'

/** Personal goals API (specs/F013 contracts/goals-api.md). */

const goalsPath = (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}/goals`
const goalPath = (userId: string, goalId: string) => `${goalsPath(userId)}/${encodeURIComponent(goalId)}`

function toGoal(raw: unknown): Goal {
  const value = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(value.id ?? ''),
    goal: typeof value.goal === 'string' ? value.goal : '',
    howToHelp: typeof value.howToHelp === 'string' ? value.howToHelp : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  }
}

export async function fetchGoals(userId: string): Promise<GoalList> {
  const raw = await apiRequest<{ goals?: unknown; limit?: unknown } | null>(goalsPath(userId), { method: 'GET' })
  const goals = Array.isArray(raw?.goals) ? raw.goals.map(toGoal) : []
  const limit = typeof raw?.limit === 'number' ? raw.limit : MAX_GOALS
  return { goals, limit }
}

export async function createGoal(userId: string, input: GoalInput): Promise<Goal> {
  return toGoal(await apiRequest(goalsPath(userId), { method: 'POST', json: input }))
}

export async function updateGoal(userId: string, goalId: string, input: GoalInput): Promise<Goal> {
  return toGoal(await apiRequest(goalPath(userId, goalId), { method: 'PUT', json: input }))
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  await apiRequest(goalPath(userId, goalId), { method: 'DELETE' })
}
