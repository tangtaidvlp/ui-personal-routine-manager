import { useEffect, useRef } from 'react'
import { XIcon } from '../../../components/icons/index.ts'

const HIDE_AFTER_MS = 5000

type BoardNoticeProps = {
  /** null = nothing shown (the live region stays in the page). */
  message: string | null
  tone: 'error' | 'info'
  onDismiss: () => void
}

/** A bottom-of-screen message for the board: errors (`role="alert"`) and hints (`role="status"`), gone after 5 s (T002 R7). */
function BoardNotice({ message, tone, onDismiss }: BoardNoticeProps) {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(() => dismissRef.current(), HIDE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [message])

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="ui-notice-region">
      {message !== null ? (
        <div className="ui-notice">
          <span>{message}</span>
          <button type="button" className="ui-icon-btn is-plain" aria-label="Dismiss" onClick={onDismiss}>
            <XIcon size={16} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default BoardNotice
