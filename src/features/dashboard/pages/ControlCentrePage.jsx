import { useState } from 'react'

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function TrendingUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 17 8.5 11.5 1 19" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function AwardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  )
}

const INITIAL_ROUTINES = [
  { id: 1, title: 'Morning hydration & stretching', done: true, tag: 'Daily', isPriority: false },
  { id: 2, title: 'Review today\'s top goals & schedule', done: true, tag: 'Daily', isPriority: true },
  { id: 3, title: 'Check codebase and issues list', done: false, tag: 'Work', isPriority: true },
  { id: 4, title: '30-minute cardio exercise', done: false, tag: 'Health', isPriority: false },
  { id: 5, title: 'Read 10 pages of a book', done: false, tag: 'Personal', isPriority: false },
]

function ControlCentrePage({ onLogout, user }) {
  const [routines, setRoutines] = useState(INITIAL_ROUTINES)
  const [newRoutineText, setNewRoutineText] = useState('')

  const handleToggle = (id) => {
    setRoutines(
      routines.map((routine) =>
        routine.id === id ? { ...routine, done: !routine.done } : routine
      )
    )
  }

  const handleDelete = (id) => {
    setRoutines(routines.filter((routine) => routine.id !== id))
  }

  const handleAdd = (event) => {
    event.preventDefault()
    if (!newRoutineText.trim()) return

    const newRoutine = {
      id: Date.now(),
      title: newRoutineText.trim(),
      done: false,
      tag: 'General',
      isPriority: false,
    }

    setRoutines([...routines, newRoutine])
    setNewRoutineText('')
  }

  const completedCount = routines.filter((routine) => routine.done).length
  const totalCount = routines.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="cc-container">
      <header className="cc-header">
        <div className="logo sm">
          <div className="logo-icon" aria-hidden="true">
            <span className="logo-r">R</span>
          </div>
          <span className="logo-text">
            <span className="logo-routine">Routine</span>{' '}
            <span className="logo-manager">Control Centre</span>
          </span>
        </div>

        <div className="cc-user-section">
          <div className="cc-user-info">
            <p className="cc-user-name">Welcome, {user?.email ? user.email.split('@')[0] : 'Tom'}!</p>
            <p className="cc-user-role">{user?.email || 'Premium Manager Account'}</p>
          </div>
          <button className="cc-logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="cc-main">
        <aside className="cc-sidebar">
          <div className="cc-card">
            <h3 className="cc-card-title">
              <TrendingUpIcon />
              Today&apos;s Stats
            </h3>
            <div className="cc-stats-grid">
              <div className="cc-stat-item">
                <span className="cc-stat-value">
                  {completedCount}/{totalCount}
                </span>
                <span className="cc-stat-label">Routines Completed</span>
              </div>
              <div className="cc-stat-item">
                <span className="cc-stat-value">{completionPercentage}%</span>
                <span className="cc-stat-label">Day Progress</span>
              </div>
            </div>
          </div>

          <div className="cc-card">
            <h3 className="cc-card-title">
              <AwardIcon />
              Weekly Streaks
            </h3>
            <div style={{ marginTop: '8px' }}>
              <span className="cc-streak-day completed" title="Monday">M</span>
              <span className="cc-streak-day completed" title="Tuesday">T</span>
              <span className="cc-streak-day completed" title="Wednesday">W</span>
              <span className="cc-streak-day completed" title="Thursday">T</span>
              <span className="cc-streak-day completed" title="Friday">F</span>
              <span className="cc-streak-day" title="Saturday">S</span>
              <span className="cc-streak-day" title="Sunday">S</span>
              <p style={{ fontSize: '12px', color: 'var(--text)', marginTop: '12px', margin: '12px 0 0 0' }}>
                You are on a <strong>5-day streak</strong>! Keep it going!
              </p>
            </div>
          </div>
        </aside>

        <section className="cc-dashboard">
          <div className="cc-welcome-banner">
            <h1>Stay Productive, {user?.email ? user.email.split('@')[0] : 'Tom'}!</h1>
            <p>Your personal control center is ready. Check off your routines below or add new daily habits.</p>
          </div>

          <div className="cc-card">
            <h3 className="cc-card-title">
              <CalendarIcon />
              Your Personal Routines ({totalCount})
            </h3>

            <form onSubmit={handleAdd} className="cc-quick-add">
              <input
                type="text"
                placeholder="What is your next habit or routine?"
                value={newRoutineText}
                onChange={(event) => setNewRoutineText(event.target.value)}
                className="cc-quick-add-input"
              />
              <button type="submit" className="cc-quick-add-btn">
                Add Routine
              </button>
            </form>

            <div className="cc-routine-list">
              {routines.map((routine) => (
                <div key={routine.id} className={`cc-routine-item ${routine.done ? 'done' : ''}`}>
                  <div className="cc-routine-item-left">
                    <button
                      type="button"
                      className={`cc-checkbox ${routine.done ? 'checked' : ''}`}
                      onClick={() => handleToggle(routine.id)}
                      aria-label={routine.done ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {routine.done && <CheckIcon />}
                    </button>
                    <span className="cc-routine-title">{routine.title}</span>
                    <span className={`cc-routine-tag ${routine.isPriority ? 'priority' : ''}`}>
                      {routine.tag}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cc-delete-btn"
                    onClick={() => handleDelete(routine.id)}
                    aria-label="Delete routine"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
              {routines.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px' }}>
                  No routines added yet. Type above to add your first one!
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default ControlCentrePage