import { useMemo, useState } from 'react'

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

function HourRow({ label }) {
  return (
    <div className="ob-hour-row">
      <span className="ob-hour-label">{label}</span>
      <span className="ob-hour-line" />
    </div>
  )
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
  const [blocks, setBlocks] = useState([])

  const hourLabels = useMemo(
    () => [
      '12 AM',
      '1 AM',
      '2 AM',
      '3 AM',
      '4 AM',
      '5 AM',
      '6 AM',
      '7 AM',
      '8 AM',
      '9 AM',
    ],
    [],
  )

  const handleAddBlock = () => {
    setBlocks((current) => [
      ...current,
      {
        id: Date.now(),
        label: prompt.trim() || 'New routine block',
      },
    ])
    setPrompt('')
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
            <span className="ob-block-count">{blocks.length} blocks</span>
          </div>

          <div className="ob-timeline">
            {hourLabels.map((label) => (
              <HourRow key={label} label={label} />
            ))}
          </div>
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
            <div className="ob-message bot">
              Hi! I&apos;m your Routine Buddy. We can build your schedule together. Try telling me your first habit,
              like: &quot;I wake up at 7:00 AM.&quot; Or, you can just click the + button to add it yourself.
            </div>
          </div>

          <div className="ob-buddy-input-wrap">
            <input
              type="text"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="ob-buddy-input"
              placeholder='Try: "I work from 9 to 5"'
            />
            <button type="button" className="ob-send-btn" aria-label="Send message">
              <SendIcon />
            </button>
          </div>

          <button type="button" className="ob-add-btn" onClick={handleAddBlock}>
            +
            <span>Add Routine Block</span>
          </button>
        </aside>
      </main>

      <footer className="ob-user-chip">
        Planning for {user?.email || 'your account'}
      </footer>
    </div>
  )
}

export default OnboardingPage