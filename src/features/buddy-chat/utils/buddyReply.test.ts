import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../lib/api.ts'
import { parseBuddyReply } from './buddyReply.ts'

const add = { action: 'ADD', goalId: null, goal: 'Be in bed by 11 PM', howToHelp: null, current: null }
const update = {
  action: 'UPDATE',
  goalId: 'g-1',
  goal: 'Run a half marathon',
  howToHelp: 'Keep me training',
  current: { goal: 'Run a 10k', howToHelp: null },
}

describe('parseBuddyReply', () => {
  it('reads a plain reply', () => {
    expect(parseBuddyReply({ reply: 'Done!' })).toEqual({ reply: 'Done!', goalProposal: null })
    expect(parseBuddyReply({ reply: 'Done!', goalProposal: null })).toEqual({ reply: 'Done!', goalProposal: null })
  })

  it('reads an ADD proposal', () => {
    expect(parseBuddyReply({ reply: 'Confirm below.', goalProposal: add })).toEqual({ reply: 'Confirm below.', goalProposal: add })
  })

  it('reads an UPDATE proposal with the current goal', () => {
    expect(parseBuddyReply({ reply: 'ok', goalProposal: update }).goalProposal).toEqual(update)
  })

  it('drops a malformed proposal but keeps the reply', () => {
    const malformed = [
      { ...add, action: 'DELETE' },
      { ...add, goal: '' },
      { ...add, goal: 42 },
      { ...add, howToHelp: 7 },
      { ...update, goalId: null },
      { ...update, current: null },
      { ...update, current: { goal: 1, howToHelp: null } },
      'ADD',
      [],
    ]
    for (const goalProposal of malformed) {
      expect(parseBuddyReply({ reply: 'ok', goalProposal })).toEqual({ reply: 'ok', goalProposal: null })
    }
  })

  it('fails when the reply text is missing, as the chat APIs did before', () => {
    for (const data of [null, undefined, {}, { reply: 3 }, 'text']) {
      expect(() => parseBuddyReply(data)).toThrow(ApiError)
    }
  })
})
