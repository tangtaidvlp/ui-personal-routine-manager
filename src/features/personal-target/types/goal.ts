/** Personal goals (specs/F013-personal-goals, contracts/goals-api.md). */

export type Goal = {
  id: string
  goal: string
  howToHelp: string | null
  createdAt: string
  updatedAt: string
}

export type GoalList = {
  goals: Goal[]
  /** How many goals a user may have (3). */
  limit: number
}

/** What the user typed, already trimmed (see utils/goalRules.ts). */
export type GoalInput = {
  goal: string
  howToHelp: string | null
}

/** Why Buddy refused a goal on save, with a suggested version (specs/F013 US5, contracts/goals-api.md). */
export type GoalReview = {
  reason: string
  suggestion: GoalInput | null
}

/** A goal save: the saved goal, or Buddy's refusal with nothing saved. */
export type GoalSaveResult = { goal: Goal; review: null } | { goal: null; review: GoalReview }
