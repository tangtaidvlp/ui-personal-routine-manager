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

/** A goal Buddy suggests in chat; saved only when the user confirms (contracts/buddy-chat-goal-proposal.md). */
export type GoalProposal = {
  action: 'ADD' | 'UPDATE'
  /** Set for UPDATE. */
  goalId: string | null
  goal: string
  howToHelp: string | null
  /** UPDATE only: the goal as it is now. */
  current: { goal: string; howToHelp: string | null } | null
}

/** One Buddy chat reply, with an optional goal proposal. */
export type BuddyReply = {
  reply: string
  goalProposal: GoalProposal | null
}
