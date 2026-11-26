import GoalProposalCard from './GoalProposalCard.tsx'
import type { GoalProposal } from '../../buddy-chat/types/buddyReply.ts'

/**
 * The `renderProposal` prop for `BuddyChat`: shows Buddy's goal proposal as a confirm card.
 * `onSaved` runs after the goal is saved, so a page listing goals can reload (F013 US4).
 */
export function goalProposalRenderer(onSaved?: () => void) {
  return (proposal: GoalProposal) => <GoalProposalCard proposal={proposal} onSaved={onSaved} />
}
