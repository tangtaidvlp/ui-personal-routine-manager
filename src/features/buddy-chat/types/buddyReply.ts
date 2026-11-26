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
