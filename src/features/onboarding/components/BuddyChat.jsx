import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { nextCursor, prependOlder, toChatItems } from './chatHistory.ts'
import GoalProposalCard from '../../personal-target/components/GoalProposalCard.tsx'

// Load older history when the thread is scrolled to within this many px of the top.
const LOAD_OLDER_THRESHOLD_PX = 40

export function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l1.9 4.8L19 10l-5.1 2.2L12 17l-1.9-4.8L5 10l5.1-2.2L12 3z" fill="currentColor" />
    </svg>
  )
}

export function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function createChatMessage(role, text, isError = false) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    isError,
  }
}

/**
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   initialMessage: string,
 *   placeholder?: string,
 *   onSend: (message: string) => Promise<string | import('../../personal-target/types/goal.ts').BuddyReply>,
 *   onAfterSend?: (info: { hasGoalProposal: boolean }) => void,
 *   tourId?: string,
 *   isHidden?: boolean,
 *   loadHistory?: (before?: number | null) => Promise<import('../types/chatHistory.ts').ChatHistoryPage>,
 *   topSlot?: import('react').ReactNode,
 *   compactHeader?: boolean,
 *   onGoalSaved?: () => void,
 * }} props
 *
 * `loadHistory` (F004): when given, the stored conversation is shown under the greeting
 * (newest page first) and older pages load when the thread is scrolled to the top.
 * `topSlot` (F007): content pinned between the header and the thread (Buddy's reflection note).
 * `compactHeader` (F007): a shorter header, to leave room for `topSlot`.
 * `onSend` (F013) may return a BuddyReply; a goal proposal in it is shown as a confirm card
 * under the reply, and `onAfterSend` is told so the page can keep the chat in view.
 * `onGoalSaved` (F013 US4) is called when a proposal is confirmed, so a page listing goals can reload.
 */
function BuddyChat({
  title = 'Routine Buddy',
  subtitle = 'Here to help you plan',
  initialMessage,
  placeholder = 'Type a message…',
  onSend,
  onAfterSend,
  tourId,
  isHidden = false,
  loadHistory,
  topSlot = null,
  compactHeader = false,
  onGoalSaved,
}) {
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef(null)
  const [messages, setMessages] = useState([createChatMessage('bot', initialMessage)])
  const [isSendingChat, setIsSendingChat] = useState(false)
  const threadRef = useRef(null)
  // History paging (F004). status: 'idle' | 'loading' | 'error'
  const [history, setHistory] = useState({ status: 'idle', hasMore: false, nextBefore: null })
  const loadHistoryRef = useRef(loadHistory)
  loadHistoryRef.current = loadHistory
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  // scrollHeight before an older page is prepended, so the reading position can be kept.
  const prependAnchorRef = useRef(null)

  const lastMessageId = messages[messages.length - 1]?.id

  // Scroll to the bottom when a message is added at the end (not when older ones are prepended).
  useEffect(() => {
    if (!threadRef.current) {
      return
    }
    threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [lastMessageId, isSendingChat, isHidden])

  // Keep the reading position after older messages are prepended.
  useLayoutEffect(() => {
    const thread = threadRef.current
    const prevHeight = prependAnchorRef.current
    if (!thread || prevHeight === null) {
      return
    }
    prependAnchorRef.current = null
    thread.scrollTop += thread.scrollHeight - prevHeight
  }, [messages])

  const loadPage = useCallback(async (before) => {
    const load = loadHistoryRef.current
    if (!load || loadingRef.current) {
      return
    }
    loadingRef.current = true
    setHistory((current) => ({ ...current, status: 'loading' }))
    try {
      const page = await load(before)
      if (!mountedRef.current) {
        return
      }
      if (before != null && threadRef.current) {
        prependAnchorRef.current = threadRef.current.scrollHeight
      }
      setMessages((current) => prependOlder(current, toChatItems(page.messages)))
      const cursor = nextCursor(page)
      setHistory({ status: 'idle', hasMore: cursor !== null, nextBefore: cursor })
    } catch {
      if (mountedRef.current) {
        // Keep hasMore/nextBefore so the next scroll-up retries (FR-013: chat stays usable).
        setHistory((current) => ({ ...current, status: 'error' }))
      }
    } finally {
      loadingRef.current = false
    }
  }, [])

  // Load the newest page once on mount.
  useEffect(() => {
    mountedRef.current = true
    if (loadHistoryRef.current) {
      void loadPage(null)
    }
    return () => {
      mountedRef.current = false
    }
  }, [loadPage])

  const loadOlder = () => {
    if (history.hasMore && history.nextBefore !== null) {
      void loadPage(history.nextBefore)
    }
  }

  const handleThreadScroll = (event) => {
    if (event.currentTarget.scrollTop <= LOAD_OLDER_THRESHOLD_PX && history.status !== 'loading') {
      loadOlder()
    }
  }

  const handleSubmitChat = async (event) => {
    event.preventDefault()

    const message = prompt.trim()
    if (!message || isSendingChat) {
      inputRef.current?.focus()
      return
    }

    try {
      setIsSendingChat(true)
      setMessages((current) => [...current, createChatMessage('user', message)])
      setPrompt('')
      const result = await onSend(message)
      const { reply, goalProposal } = typeof result === 'string' ? { reply: result, goalProposal: null } : result
      setMessages((current) => [...current, { ...createChatMessage('bot', reply), goalProposal }])
      onAfterSend?.({ hasGoalProposal: Boolean(goalProposal) })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
      setMessages((current) => [...current, createChatMessage('bot', errorMessage, true)])
    } finally {
      setIsSendingChat(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }

  return (
    <aside className="ob-buddy-card" data-tour={tourId} style={isHidden ? { display: 'none' } : undefined}>
      <div className={compactHeader ? 'ob-buddy-head ob-buddy-head-compact' : 'ob-buddy-head'}>
        <div className="ob-buddy-icon">
          <SparkIcon />
        </div>
        <div>
          <p className="ob-buddy-title">{title}</p>
          <p className="ob-buddy-subtitle">{subtitle}</p>
        </div>
      </div>

      {topSlot ? <div className="ob-buddy-top-slot">{topSlot}</div> : null}
      <div className="ob-buddy-thread" ref={threadRef} onScroll={loadHistory ? handleThreadScroll : undefined}>
        {history.status === 'loading' && (
          <p className="ob-history-status" role="status">Loading earlier messages…</p>
        )}
        {history.status === 'error' && (
          <p className="ob-history-status ob-history-notice" role="status">Couldn&apos;t load earlier messages.</p>
        )}
        {history.status !== 'loading' && history.hasMore && (
          <button type="button" className="ob-history-more" onClick={loadOlder}>
            Show earlier messages
          </button>
        )}
        {messages.map((chat) => (
          <div key={chat.id}>
            <div className={`ob-message ${chat.role === 'user' ? 'user' : 'bot'}`}>
              <ReactMarkdown>{chat.isError ? `Error: ${chat.text}` : chat.text}</ReactMarkdown>
            </div>
            {chat.goalProposal ? <GoalProposalCard proposal={chat.goalProposal} onSaved={onGoalSaved} /> : null}
            <div className="ob-message-spacer"></div>
          </div>
        ))}
        {isSendingChat && (
          <div className="ob-message bot ob-typing" aria-label={`${title} is typing`}>
            <span className="ob-typing-dot" />
            <span className="ob-typing-dot" />
            <span className="ob-typing-dot" />
          </div>
        )}
      </div>

      <form className="ob-buddy-input-wrap" onSubmit={handleSubmitChat}>
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="ob-buddy-input"
          placeholder={placeholder}
          readOnly={isSendingChat}
          aria-busy={isSendingChat}
        />
        <button type="submit" className="ob-send-btn" aria-label="Send message" disabled={isSendingChat}>
          <SendIcon />
        </button>
      </form>
    </aside>
  )
}

export default BuddyChat
