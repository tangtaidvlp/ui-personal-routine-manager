import type { ChatHistoryMessage, ChatHistoryPage } from '../types/chatHistory.ts'

/** A bubble in BuddyChat. Stored messages carry `seq`; the greeting and live/error bubbles do not. */
export type ChatItem = {
  id: string
  role: 'user' | 'bot'
  text: string
  isError: boolean
  seq?: number
}

// Onboarding sends `Onboarding: [<text>]` to the shared default-routine conversation.
const ONBOARDING_WRAPPER = /^Onboarding: \[([\s\S]*)\]$/

/** Map stored messages to chat bubbles, showing what the user actually typed. */
export function toChatItems(messages: ChatHistoryMessage[]): ChatItem[] {
  return messages.map((m) => ({
    id: `h-${m.seq}`,
    seq: m.seq,
    role: m.role === 'assistant' ? 'bot' : 'user',
    text: m.role === 'user' ? m.content.replace(ONBOARDING_WRAPPER, '$1') : m.content,
    isError: false,
  }))
}

/**
 * Insert older stored messages after the leading items without a seq (the greeting)
 * and before everything else, skipping seqs already shown. Live bubbles stay last.
 */
export function prependOlder(current: ChatItem[], older: ChatItem[]): ChatItem[] {
  const shown = new Set(current.filter((c) => c.seq !== undefined).map((c) => c.seq))
  const fresh = older
    .filter((o) => o.seq !== undefined && !shown.has(o.seq))
    .sort((a, b) => (a.seq as number) - (b.seq as number))
  if (fresh.length === 0) return current

  let head = 0
  while (head < current.length && current[head].seq === undefined) head += 1
  // No stored messages yet: keep the greeting(s) first, live bubbles after the history.
  if (head === current.length) head = Math.min(1, current.length)
  return [...current.slice(0, head), ...fresh, ...current.slice(head)]
}

/** Cursor for the next older page, or null when the start has been reached. */
export function nextCursor(page: ChatHistoryPage): number | null {
  return page.hasMore ? page.nextBefore : null
}
