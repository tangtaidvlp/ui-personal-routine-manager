import { useState } from 'react'
import { ApiError } from '../../../lib/api.ts'
import type { ReflectionView } from '../types/reflection.ts'

type Props = {
  view: ReflectionView
  /** Asks Buddy for a (new) note; the parent stores the returned view. */
  onRequestFeedback: () => Promise<unknown>
}

/** F007 FR-015–FR-017a: Buddy's encouraging note, pinned to the top of the Buddy chat. */
function ReflectionNote({ view, onRequestFeedback }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { feedback } = view

  const askBuddy = async () => {
    setLoading(true)
    setError(null)
    try {
      await onRequestFeedback()
    } catch (e) {
      setError(e instanceof ApiError && e.status === 503
        ? 'Buddy is unavailable right now. Your reflection is saved — try again in a bit.'
        : e instanceof ApiError && e.status === 429
          ? e.message
          : "Couldn't get Buddy's note. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const buttonLabel = loading ? 'Buddy is thinking…' : feedback ? 'Refresh note' : "Get Buddy's note"

  return (
    <section className="rf-note" aria-label="Buddy's note" aria-live="polite">
      {feedback ? (
        <p className="rf-note-text">{feedback.text}</p>
      ) : (
        <p className="rf-note-empty">Ask Buddy for a kind look back at your day.</p>
      )}
      {feedback?.stale ? <p className="rf-note-hint">Your day changed since this note — refresh it any time.</p> : null}
      {error ? <p className="rf-note-error" role="alert">{error}</p> : null}
      <button type="button" className="ui-btn rf-note-btn" onClick={askBuddy} disabled={loading}>
        {buttonLabel}
      </button>
    </section>
  )
}

export default ReflectionNote
