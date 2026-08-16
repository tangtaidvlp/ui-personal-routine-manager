import { useRef, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

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
 *   onSend: (message: string) => Promise<string>,
 *   onAfterSend?: () => void,
 * }} props
 */
function BuddyChat({
  title = 'Routine Buddy',
  subtitle = 'Here to help you plan',
  initialMessage,
  placeholder = 'Type a message…',
  onSend,
  onAfterSend,
}) {
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef(null)
  const [messages, setMessages] = useState([createChatMessage('bot', initialMessage)])
  const [isSendingChat, setIsSendingChat] = useState(false)
  const threadRef = useRef(null)

  useEffect(() => {
    if (!threadRef.current) {
      return
    }
    threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages.length, isSendingChat])

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
      const reply = await onSend(message)
      setMessages((current) => [...current, createChatMessage('bot', reply)])
      onAfterSend?.()
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
    <aside className="ob-buddy-card">
      <div className="ob-buddy-head">
        <div className="ob-buddy-icon">
          <SparkIcon />
        </div>
        <div>
          <p className="ob-buddy-title">{title}</p>
          <p className="ob-buddy-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="ob-buddy-thread" ref={threadRef}>
        {messages.map((chat) => (
          <div key={chat.id}>
            <div className={`ob-message ${chat.role === 'user' ? 'user' : 'bot'}`}>
              <ReactMarkdown>{chat.isError ? `Error: ${chat.text}` : chat.text}</ReactMarkdown>
            </div>
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
