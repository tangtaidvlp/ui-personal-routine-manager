import { ApiError } from '../../../lib/api.ts'
import type { Goal, GoalReview, GoalSaveResult } from '../types/goal.ts'

/** Reads one goal from the API, with safe defaults for missing fields. */
export function toGoal(raw: unknown): Goal {
  const value = (raw ?? {}) as Record<string, unknown>
  return {
    id: String(value.id ?? ''),
    goal: typeof value.goal === 'string' ? value.goal : '',
    howToHelp: typeof value.howToHelp === 'string' ? value.howToHelp : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : '',
  }
}

function toReview(raw: unknown): GoalReview | null {
  const value = (raw ?? {}) as Record<string, unknown>
  if (typeof value.reason !== 'string' || value.reason.trim() === '') return null
  const suggestion = (value.suggestion ?? null) as Record<string, unknown> | null
  const hasSuggestion = suggestion !== null && typeof suggestion.goal === 'string' && suggestion.goal.trim() !== ''
  return {
    reason: value.reason,
    suggestion: hasSuggestion
      ? { goal: suggestion.goal as string, howToHelp: typeof suggestion.howToHelp === 'string' ? suggestion.howToHelp : null }
      : null,
  }
}

/**
 * Reads a POST/PUT goal response (specs/F013 contracts/goals-api.md): `{goal}` when saved, or
 * `{review}` when Buddy refused it. Anything else is a bad response.
 */
export function parseGoalSaveResult(raw: unknown): GoalSaveResult {
  const value = (raw ?? {}) as Record<string, unknown>
  if (value.goal && typeof value.goal === 'object') {
    return { goal: toGoal(value.goal), review: null }
  }
  const review = toReview(value.review)
  if (review) {
    return { goal: null, review }
  }
  throw new ApiError(502, "Couldn't save the goal. Please try again.")
}
