import { ApiError } from '../../../lib/api.ts'
import type { BuddyReply, GoalProposal } from '../types/buddyReply.ts'

/**
 * Reads a Buddy chat response `{ reply, goalProposal }` (specs/F013
 * contracts/buddy-chat-goal-proposal.md §1). A missing reply text is an error, as before F013;
 * a malformed proposal is dropped so the reply still shows.
 */
export function parseBuddyReply(data: unknown): BuddyReply {
  const value = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  if (!value || typeof value.reply !== 'string') {
    throw new ApiError(502, 'Invalid AI response payload')
  }
  return { reply: value.reply, goalProposal: parseGoalProposal(value.goalProposal) }
}

function optionalText(raw: unknown): string | null | undefined {
  if (raw === null || raw === undefined) return null
  return typeof raw === 'string' ? raw : undefined
}

export function parseGoalProposal(raw: unknown): GoalProposal | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const action = value.action
  if (action !== 'ADD' && action !== 'UPDATE') return null
  if (typeof value.goal !== 'string' || value.goal.trim() === '') return null
  const howToHelp = optionalText(value.howToHelp)
  if (howToHelp === undefined) return null

  if (action === 'ADD') {
    return { action, goalId: null, goal: value.goal, howToHelp, current: null }
  }

  if (typeof value.goalId !== 'string' || value.goalId === '') return null
  const current = value.current && typeof value.current === 'object' ? (value.current as Record<string, unknown>) : null
  const currentHelp = optionalText(current?.howToHelp)
  if (!current || typeof current.goal !== 'string' || currentHelp === undefined) return null
  return { action, goalId: value.goalId, goal: value.goal, howToHelp, current: { goal: current.goal, howToHelp: currentHelp } }
}
