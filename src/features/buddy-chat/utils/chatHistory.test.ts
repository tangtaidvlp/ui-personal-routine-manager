import { describe, expect, it } from 'vitest'
import { nextCursor, prependOlder, toChatItems, type ChatItem } from './chatHistory.ts'
import type { ChatHistoryMessage } from '../types/chatHistory.ts'

const msg = (seq: number, role: 'user' | 'assistant', content = `m${seq}`): ChatHistoryMessage => ({
  seq,
  role,
  content,
  createdAt: '2026-11-21T08:00:00Z',
})

const greeting: ChatItem = { id: 'g', role: 'bot', text: 'Hi!', isError: false }

describe('toChatItems', () => {
  it('maps roles and keeps seq', () => {
    const items = toChatItems([msg(1, 'user'), msg(2, 'assistant')])
    expect(items.map((i) => [i.seq, i.role, i.id])).toEqual([
      [1, 'user', 'h-1'],
      [2, 'bot', 'h-2'],
    ])
  })

  it('strips the onboarding wrapper from user messages only', () => {
    const items = toChatItems([
      msg(1, 'user', 'Onboarding: [I work 9 to 5]'),
      msg(2, 'assistant', 'Onboarding: [kept]'),
    ])
    expect(items[0].text).toBe('I work 9 to 5')
    expect(items[1].text).toBe('Onboarding: [kept]')
  })
})

describe('prependOlder', () => {
  it('puts older messages after the greeting, in order', () => {
    const current = [greeting, ...toChatItems([msg(3, 'user'), msg(4, 'assistant')])]
    const result = prependOlder(current, toChatItems([msg(2, 'assistant'), msg(1, 'user')]))
    expect(result[0]).toBe(greeting)
    expect(result.slice(1).map((i) => i.seq)).toEqual([1, 2, 3, 4])
  })

  it('skips messages already shown', () => {
    const current = [greeting, ...toChatItems([msg(2, 'assistant'), msg(3, 'user')])]
    const result = prependOlder(current, toChatItems([msg(1, 'user'), msg(2, 'assistant')]))
    expect(result.slice(1).map((i) => i.seq)).toEqual([1, 2, 3])
  })

  it('returns the same array for an empty page', () => {
    const current = [greeting]
    expect(prependOlder(current, [])).toBe(current)
  })

  it('keeps live bubbles after history when nothing stored was shown yet', () => {
    const live: ChatItem = { id: 'live', role: 'user', text: 'new', isError: false }
    const result = prependOlder([greeting, live], toChatItems([msg(1, 'user'), msg(2, 'assistant')]))
    expect(result.map((i) => i.id)).toEqual(['g', 'h-1', 'h-2', 'live'])
  })
})

describe('nextCursor', () => {
  it('returns nextBefore only when there is more', () => {
    expect(nextCursor({ messages: [], hasMore: true, nextBefore: 11 })).toBe(11)
    expect(nextCursor({ messages: [], hasMore: false, nextBefore: null })).toBeNull()
  })
})
