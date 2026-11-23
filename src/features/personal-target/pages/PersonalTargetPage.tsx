import { useEffect, useRef, useState, useTransition } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import { ApiError } from '../../../lib/api.ts'
import { fetchUserSettings, saveUserSettings } from '../../settings/api/userSettings.ts'
import type { BuddyToneId } from '../../settings/types/settings.ts'
import { DEFAULT_BUDDY_TONE } from '../../settings/utils/settingsSchema.ts'
import { createGoal, deleteGoal, fetchGoals, updateGoal } from '../api/goals.ts'
import BuddyTonePicker from '../components/BuddyTonePicker.tsx'
import GoalForm from '../components/GoalForm.tsx'
import type { Goal, GoalInput } from '../types/goal.ts'
import { LIMIT_REACHED, MAX_GOALS } from '../utils/goalRules.ts'

type LoadStatus = 'loading' | 'ready' | 'error'
/** Which form is open: a new goal, an existing goal's id, or none. */
type Editing = { kind: 'new' } | { kind: 'edit'; id: string } | null

const ADD_BUTTON_ID = 'pt-add-goal'
const editButtonId = (goalId: string) => `pt-edit-${goalId}`

/**
 * Personal Target: the user's goals and Buddy's tone, which Buddy uses in every chat
 * (specs/F013-personal-goals US1, specs/F014-buddy-tone US1, contracts/ui.md).
 */
function PersonalTargetPage() {
  const { user } = useShellContext()
  const userId = user?.id
  const [goals, setGoals] = useState<Goal[]>([])
  const [limit, setLimit] = useState(MAX_GOALS)
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [reloadCount, setReloadCount] = useState(0)
  const [editing, setEditing] = useState<Editing>(null)
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, startDeleting] = useTransition()
  const [tone, setTone] = useState<BuddyToneId>(DEFAULT_BUDDY_TONE)
  const [toneStatus, setToneStatus] = useState<LoadStatus>('loading')
  const [toneReloadCount, setToneReloadCount] = useState(0)
  // After a form closes, focus goes back to the button that opened it.
  const focusAfterRenderRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setStatus('error')
      return
    }
    let active = true
    setStatus('loading')
    fetchGoals(userId)
      .then((list) => {
        if (!active) return
        setGoals(list.goals)
        setLimit(list.limit)
        setStatus('ready')
      })
      .catch(() => active && setStatus('error'))
    return () => {
      active = false
    }
  }, [userId, reloadCount])

  // The tone is an account setting (F014 research R1), read and saved here directly: a failed
  // save must not look applied, because Buddy reads the tone from the server (research R3).
  useEffect(() => {
    if (!userId) {
      setToneStatus('error')
      return
    }
    let active = true
    setToneStatus('loading')
    fetchUserSettings(userId)
      .then((view) => {
        if (!active) return
        setTone(view.settings.buddyTone)
        setToneStatus('ready')
      })
      .catch(() => active && setToneStatus('error'))
    return () => {
      active = false
    }
  }, [userId, toneReloadCount])

  const handleToneChange = async (next: BuddyToneId) => {
    if (!userId) throw new Error('Not signed in')
    const view = await saveUserSettings(userId, { buddyTone: next })
    setTone(view.settings.buddyTone)
  }

  useEffect(() => {
    const id = focusAfterRenderRef.current
    if (id) {
      focusAfterRenderRef.current = null
      document.getElementById(id)?.focus()
    }
  })

  const closeForm = (focusId: string) => {
    focusAfterRenderRef.current = focusId
    setEditing(null)
  }

  const handleCreate = async (input: GoalInput) => {
    if (!userId) return
    const created = await createGoal(userId, input)
    setGoals((current) => [...current, created])
    closeForm(ADD_BUTTON_ID)
  }

  const handleUpdate = async (goalId: string, input: GoalInput) => {
    if (!userId) return
    const updated = await updateGoal(userId, goalId, input)
    setGoals((current) => current.map((goal) => (goal.id === goalId ? updated : goal)))
    closeForm(editButtonId(goalId))
  }

  const handleConfirmDelete = () => {
    const goal = pendingDelete
    if (!goal || !userId) return
    startDeleting(async () => {
      try {
        await deleteGoal(userId, goal.id)
        setGoals((current) => current.filter((item) => item.id !== goal.id))
        setDeleteError(null)
        focusAfterRenderRef.current = ADD_BUTTON_ID
      } catch (err) {
        setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete the goal. Please try again.")
      }
      setPendingDelete(null)
    })
  }

  const atLimit = goals.length >= limit
  const formOpen = editing !== null

  return (
    <>
      <PageHeader>
        <h1>Personal Target</h1>
      </PageHeader>
      <div className="pt-page">
        <section className="ui-card pt-card" aria-labelledby="pt-goals-title">
          <div className="pt-card-head">
            <h2 id="pt-goals-title" className="pt-card-title">Your goals</h2>
            {status === 'ready' ? (
              <span className="pt-total">
                {goals.length}/{limit}
              </span>
            ) : null}
          </div>
          <p className="pt-intro">Buddy uses your goals to tailor its suggestions. Add up to {limit}.</p>

          {status === 'loading' ? (
            <p className="pt-note" role="status">
              Loading goals…
            </p>
          ) : null}

          {status === 'error' ? (
            <div className="pt-load-error" role="alert">
              <span>Couldn&apos;t load your goals.</span>
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setReloadCount((n) => n + 1)}>
                Retry
              </button>
            </div>
          ) : null}

          {status === 'ready' ? (
            <>
              {goals.length === 0 && editing?.kind !== 'new' ? (
                <p className="pt-note">You haven&apos;t set any goals yet.</p>
              ) : null}

              {goals.length > 0 ? (
                <ul className="pt-goal-list">
                  {goals.map((goal) => (
                    <li key={goal.id} className="pt-goal">
                      {editing?.kind === 'edit' && editing.id === goal.id ? (
                        <GoalForm
                          initial={{ goal: goal.goal, howToHelp: goal.howToHelp }}
                          onSave={(input) => handleUpdate(goal.id, input)}
                          onCancel={() => closeForm(editButtonId(goal.id))}
                        />
                      ) : (
                        <>
                          <div className="pt-goal-text">
                            <p className="pt-goal-title">{goal.goal}</p>
                            {goal.howToHelp ? <p className="pt-goal-help">{goal.howToHelp}</p> : null}
                          </div>
                          <div className="pt-goal-actions">
                            <button
                              type="button"
                              id={editButtonId(goal.id)}
                              className="ui-btn ui-btn-ghost"
                              onClick={() => setEditing({ kind: 'edit', id: goal.id })}
                              disabled={formOpen}
                              aria-label={`Edit goal: ${goal.goal}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="ui-btn ui-btn-danger-text"
                              onClick={() => setPendingDelete(goal)}
                              disabled={formOpen}
                              aria-label={`Delete goal: ${goal.goal}`}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}

              {editing?.kind === 'new' ? (
                <GoalForm onSave={handleCreate} onCancel={() => closeForm(ADD_BUTTON_ID)} />
              ) : (
                <div className="pt-add-row">
                  <button
                    type="button"
                    id={ADD_BUTTON_ID}
                    className="ui-btn ui-btn-primary"
                    onClick={() => setEditing({ kind: 'new' })}
                    disabled={atLimit || formOpen}
                  >
                    Add goal
                  </button>
                  {atLimit ? <p className="pt-note">{LIMIT_REACHED}</p> : null}
                </div>
              )}

              {deleteError ? (
                <p className="pt-error" role="alert">
                  {deleteError}
                </p>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="ui-card pt-card" aria-labelledby="pt-tone-title">
          <h2 id="pt-tone-title" className="pt-card-title">Buddy tone</h2>
          <p className="pt-intro">Choose how Buddy talks to you. You can change it any time.</p>
          {toneStatus === 'loading' ? (
            <p className="pt-note" role="status">
              Loading tone…
            </p>
          ) : null}
          {toneStatus === 'error' ? (
            <div className="pt-load-error" role="alert">
              <span>Couldn&apos;t load Buddy&apos;s tone.</span>
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setToneReloadCount((n) => n + 1)}>
                Retry
              </button>
            </div>
          ) : null}
          {toneStatus === 'ready' ? <BuddyTonePicker value={tone} onChange={handleToneChange} /> : null}
        </section>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        message="Delete this goal?"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}

export default PersonalTargetPage
