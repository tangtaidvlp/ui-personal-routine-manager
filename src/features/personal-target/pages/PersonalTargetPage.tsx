import { useEffect, useRef, useState, useTransition } from 'react'
import ConfirmDialog from '../../../components/ConfirmDialog.tsx'
import PageHeader from '../../../components/layout/PageHeader.tsx'
import { useShellContext } from '../../../components/layout/shellContext.ts'
import { ApiError } from '../../../lib/api.ts'
import BuddyChat, { SendIcon } from '../../buddy-chat/components/BuddyChat.tsx'
import { goalProposalRenderer } from '../components/renderGoalProposal.tsx'
import { fetchUserSettings, saveUserSettings } from '../../settings/api/userSettings.ts'
import type { BuddyToneId } from '../../settings/types/settings.ts'
import { DEFAULT_BUDDY_TONE } from '../../settings/utils/settingsSchema.ts'
import { createGoal, deleteGoal, fetchGoals, updateGoal } from '../api/goals.ts'
import { fetchPersonalTargetChatHistory, submitPersonalTargetChat } from '../api/personalTargetChat.ts'
import BuddyTonePicker from '../components/BuddyTonePicker.tsx'
import GoalForm from '../components/GoalForm.tsx'
import type { Goal, GoalInput, GoalReview } from '../types/goal.ts'
import { LIMIT_REACHED, MAX_GOALS } from '../utils/goalRules.ts'

type LoadStatus = 'loading' | 'ready' | 'error'
/** Which form is open: a new goal, an existing goal's id, or none. */
type Editing = { kind: 'new' } | { kind: 'edit'; id: string } | null

const ADD_BUTTON_ID = 'pt-add-goal'
const GREETING = "Hi! Tell me what you'd like to work on, and I'll help you shape it into a goal."
const editButtonId = (goalId: string) => `pt-edit-${goalId}`

/**
 * Personal Target: the user's goals and Buddy's tone, which Buddy uses in every chat
 * (specs/.done.F013-personal-goals US1, specs/.done.F014-buddy-tone US1, contracts/ui.md), with Buddy's
 * goals chat beside them (F013 US4; on phones the page switches between goals and chat).
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
  const [mobileView, setMobileView] = useState<'goals' | 'chat'>('goals')
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

  // A goal confirmed in Buddy chat (F013 US4): reload the list without the loading state, so an
  // open form isn't closed. A failed reload shows the usual error with Retry.
  const refreshGoals = () => {
    if (!userId) return
    fetchGoals(userId)
      .then((list) => {
        setGoals(list.goals)
        setLimit(list.limit)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }

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

  // Buddy checks the goal on save (US5): a refusal goes back to the form, which stays open.
  const handleCreate = async (input: GoalInput): Promise<GoalReview | null> => {
    if (!userId) return null
    const result = await createGoal(userId, input)
    if (result.goal === null) return result.review
    const created = result.goal
    setGoals((current) => [...current, created])
    closeForm(ADD_BUTTON_ID)
    return null
  }

  const handleUpdate = async (goalId: string, input: GoalInput): Promise<GoalReview | null> => {
    if (!userId) return null
    const result = await updateGoal(userId, goalId, input)
    if (result.goal === null) return result.review
    const updated = result.goal
    setGoals((current) => current.map((goal) => (goal.id === goalId ? updated : goal)))
    closeForm(editButtonId(goalId))
    return null
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
    <div className="pt-layout" data-mobile-view={mobileView}>
      <div className="pt-main">
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
      </div>

      {userId ? (
        <BuddyChat
          title="Routine Buddy"
          subtitle="Here to help with your goals"
          initialMessage={GREETING}
          placeholder='Try: "Help me set a sleep goal"'
          loadHistory={(before?: number | null) => fetchPersonalTargetChatHistory(userId, before)}
          onSend={(message: string) => submitPersonalTargetChat(userId, message)}
          renderProposal={goalProposalRenderer(refreshGoals)}
        />
      ) : null}
      <div className="ob-fab-group">
        <button type="button" className="ob-fab-btn-chat" aria-label="Chat with Routine Buddy" onClick={() => setMobileView('chat')}>
          <SendIcon />
        </button>
      </div>
      <button type="button" className="ob-fab-btn-view-schedule" onClick={() => setMobileView('goals')}>
        View goals
      </button>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        message="Delete this goal?"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

export default PersonalTargetPage
