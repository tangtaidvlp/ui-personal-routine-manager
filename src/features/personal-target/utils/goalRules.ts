import type { GoalInput } from '../types/goal.ts'

/**
 * What a valid goal is. Mirror of the backend `funcs/GoalRules.java` (specs/F013 data-model §2):
 * same limits and messages, lengths counted after trimming.
 */
export const MAX_GOALS = 3
export const GOAL_MAX = 150
export const HELP_MAX = 500

export const GOAL_REQUIRED = 'Goal is required.'
export const GOAL_TOO_LONG = `Goal must be ${GOAL_MAX} characters or fewer.`
export const HELP_TOO_LONG = `How Buddy should help must be ${HELP_MAX} characters or fewer.`
export const LIMIT_REACHED = `You can have up to ${MAX_GOALS} goals.`

export type GoalValidation = { ok: true; value: GoalInput } | { ok: false; message: string }

export function validateGoal(goal: string | null | undefined, howToHelp: string | null | undefined): GoalValidation {
  const trimmedGoal = (goal ?? '').trim()
  if (trimmedGoal === '') {
    return { ok: false, message: GOAL_REQUIRED }
  }
  if (trimmedGoal.length > GOAL_MAX) {
    return { ok: false, message: GOAL_TOO_LONG }
  }
  const trimmedHelp = (howToHelp ?? '').trim()
  if (trimmedHelp.length > HELP_MAX) {
    return { ok: false, message: HELP_TOO_LONG }
  }
  return { ok: true, value: { goal: trimmedGoal, howToHelp: trimmedHelp === '' ? null : trimmedHelp } }
}
