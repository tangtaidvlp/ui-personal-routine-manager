import { useRef, useState, useEffect, useContext } from 'react'
import { submitOnboardingChat } from '../api/completeOnboarding.ts'
import { apiRequest } from '../../../lib/api.ts'
import EditingBoard from '../components/EditingBoard.jsx'
import AuthContext from '../../../context/AuthContext.ts'

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l1.9 4.8L19 10l-5.1 2.2L12 17l-1.9-4.8L5 10l5.1-2.2L12 3z" fill="currentColor" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogoMark() {
  return (
    <div className="ob-brand-mark" aria-hidden="true">
      <span>R</span>
    </div>
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

const fetchDefaultRoutine = async (userId) => {
  console.log("Fetching default routine for userId:", userId);
  var result = await apiRequest(`/default-routine/users/${userId}`, {
    method: 'GET',
  })
  return result
}


/**
 * @param {{
 *   user: { id?: string; email?: string } | null,
 *   onComplete: () => void | Promise<void>,
 *   isCompleting?: boolean,
 *   completeError?: string | null,
 * }} props
 */
function OnboardingPage({ user, onComplete, isCompleting = false, completeError = null }) {
  const [scheduleMode, setScheduleMode] = useState('weekday')
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef(null)
  const [messages, setMessages] = useState([
    createChatMessage(
      'bot',
      "Hi! I'm your Routine Buddy. We can build your schedule together. Try telling me your first habit, like: \"I wake up at 7:00 AM.\" Or, you can just click the + button to add it yourself."
    ),
  ])
  const [isSendingChat, setIsSendingChat] = useState(false)
  const [currentDefaultRoutine, setCurrentDefaultRoutine] = useState([])
  var authContext = useContext(AuthContext);

  const refreshDefaultRoutine = async () => {
    try {
      const routine = await fetchDefaultRoutine(authContext.user.id)
      console.log("Fetched default routine for userId:", authContext.user.id, "routine:", routine);
      setCurrentDefaultRoutine(routine)
    } catch (error) {
      console.error('Failed to fetch default routine:', error)
      setCurrentDefaultRoutine({
        tasks: []
      })
    }
  }

  // Load initial state
  useEffect(() => {
    refreshDefaultRoutine()
  }, [])

  const handleSubmitChat = async (event) => {
    event.preventDefault()

    const message = prompt.trim()
    if (!message || !user?.id || isSendingChat) {
      inputRef.current?.focus()
      return
    }

    try {
      setIsSendingChat(true)
      setMessages((current) => [...current, createChatMessage('user', message)])
      setPrompt('')
      const reply = await submitOnboardingChat(user.id, currentDefaultRoutine, message)
      setMessages((current) => [...current, createChatMessage('bot', reply)])
      // REFRESH
      refreshDefaultRoutine()
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
    <div className="ob-page">
      <header className="ob-topbar">
        <div className="ob-brand">
          <LogoMark />
          <span className="ob-brand-name">
            Routine <strong>Canvas</strong>
          </span>
        </div>

        <div className="ob-top-actions">
          <div className="ob-segmented" role="tablist" aria-label="Schedule type">
            <button
              type="button"
              className={`ob-segment-btn ${scheduleMode === 'weekday' ? 'active' : ''}`}
              onClick={() => setScheduleMode('weekday')}
            >
              Weekday
            </button>
            <button
              type="button"
              className={`ob-segment-btn ${scheduleMode === 'weekend' ? 'active' : ''}`}
              onClick={() => setScheduleMode('weekend')}
            >
              Weekend
            </button>
          </div>
          <button type="button" className="ob-ready-btn" onClick={onComplete}>
            {isCompleting ? 'Saving...' : 'Ready to roll'}
          </button>
        </div>
      </header>

      {completeError && (
        <div style={{ marginTop: '12px' }}>
          <div className="alert alert-error" role="alert">
            <span>{completeError}</span>
          </div>
        </div>
      )}

      <main className="ob-main">
        <section className="ob-canvas-card">
          <div className="ob-card-header">
            <h1>{scheduleMode === 'weekday' ? 'Weekday Routine' : 'Weekend Routine'}</h1>
            <span className="ob-block-count">Drag to reorder</span>
          </div>

          <EditingBoard storageKey={scheduleMode} currentDefaultRoutine={currentDefaultRoutine} />
        </section>

        <aside className="ob-buddy-card">
          <div className="ob-buddy-head">
            <div className="ob-buddy-icon">
              <SparkIcon />
            </div>
            <div>
              <p className="ob-buddy-title">Routine Buddy</p>
              <p className="ob-buddy-subtitle">Here to help you plan</p>
            </div>
          </div>

          <div className="ob-buddy-thread">
            {messages.map((chat) => (
              <div>
                <div key={chat.id} className={`ob-message ${chat.role === 'user' ? 'user' : 'bot'}`}>
                {chat.isError ? `Error: ${chat.text}` : chat.text}
                </div>
                <div className="ob-message-spacer"></div>
              </div>
            ))}
          </div>

          <form className="ob-buddy-input-wrap" onSubmit={handleSubmitChat}>
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="ob-buddy-input"
              placeholder='Try: "I work from 9 to 5"'
              readOnly={isSendingChat}
              aria-busy={isSendingChat}
            />
            <button type="submit" className="ob-send-btn" aria-label="Send message" disabled={isSendingChat}>
              <SendIcon />
            </button>
          </form>
        </aside>
      </main>

      <footer className="ob-user-chip">
        Planning for {user?.email || 'your account'}
      </footer>
    </div>
  )
}

export default OnboardingPage