/** One stored Buddy chat message (F004 contract: ChatMessageDto). */
export type ChatHistoryMessage = {
  seq: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** A page of history, oldest → newest (F004 contract: ChatHistoryPage). */
export type ChatHistoryPage = {
  messages: ChatHistoryMessage[]
  hasMore: boolean
  nextBefore: number | null
}

/** Throws unless `data` has the ChatHistoryPage shape. */
export function assertChatHistoryPage(data: unknown): asserts data is ChatHistoryPage {
  const page = data as Partial<ChatHistoryPage> | null
  const ok =
    !!page &&
    Array.isArray(page.messages) &&
    typeof page.hasMore === 'boolean' &&
    page.messages.every(
      (m) =>
        !!m &&
        typeof m.seq === 'number' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string',
    )
  if (!ok) {
    throw new Error('Invalid chat history payload')
  }
}
