import { useContext, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import AuthContext from '../../../context/AuthContext.ts'
import { ApiError } from '../../../lib/api.ts'
import { createGoal, updateGoal } from '../api/goals.ts'
import type { GoalProposal, GoalReview } from '../types/goal.ts'

type Outcome =
  | { kind: 'open' }
  | { kind: 'saved' }
  | { kind: 'dismissed' }
  /** Buddy's check refused the goal on save (US5); final. */
  | { kind: 'refused'; review: GoalReview }
  /** `retry`: a network error; the user may try again. Server refusals (4xx) are final. */
  | { kind: 'error'; message: string; retry: boolean }

type GoalProposalCardProps = {
  proposal: GoalProposal
  /** Called after the goal is saved, so a page showing the goals can reload them (F013 US4). */
  onSaved?: () => void
}

/**
 * A goal Buddy proposed in chat (specs/F013 US3, contracts/ui.md "Buddy chat proposal card").
 * Nothing is saved until the user clicks Confirm, which goes through the normal goals API, so
 * the limit, length and ownership rules apply.
 */
function GoalProposalCard({ proposal, onSaved }: GoalProposalCardProps) {
  const { user } = useContext(AuthContext)
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'open' })
  const [isSaving, startSaving] = useTransition()
  const isUpdate = proposal.action === 'UPDATE'
  const input = { goal: proposal.goal, howToHelp: proposal.howToHelp }

  const handleConfirm = () => {
    const userId = user?.id
    if (!userId) {
      setOutcome({ kind: 'error', message: 'Please sign in to continue.', retry: false })
      return
    }
    startSaving(async () => {
      try {
        const result =
          isUpdate && proposal.goalId ? await updateGoal(userId, proposal.goalId, input) : await createGoal(userId, input)
        if (result.goal === null) {
          setOutcome({ kind: 'refused', review: result.review })
          return
        }
        setOutcome({ kind: 'saved' })
        onSaved?.()
      } catch (err) {
        // A network error or Buddy being unavailable (503) or a rate limit (429) may be retried; other refusals are final.
        const retryable = !(err instanceof ApiError) || err.status === 0 || err.status === 503 || err.status === 429
        const message = err instanceof ApiError ? err.message : "Couldn't save the goal. Please try again."
        setOutcome({ kind: 'error', message, retry: retryable })
      }
    })
  }

  const actionable = outcome.kind === 'open' || (outcome.kind === 'error' && outcome.retry)

  return (
    <section className="pt-proposal" aria-label={isUpdate ? 'Change goal' : 'New goal'}>
      <p className="pt-proposal-title">{isUpdate ? 'Change goal' : 'New goal'}</p>
      {isUpdate && proposal.current ? (
        <dl className="pt-proposal-compare">
          <div>
            <dt>Now</dt>
            <dd>
              <span className="pt-proposal-goal">{proposal.current.goal}</span>
              {proposal.current.howToHelp ? <span className="pt-proposal-help">{proposal.current.howToHelp}</span> : null}
            </dd>
          </div>
          <div>
            <dt>Proposed</dt>
            <dd>
              <span className="pt-proposal-goal">{proposal.goal}</span>
              {proposal.howToHelp ? <span className="pt-proposal-help">{proposal.howToHelp}</span> : null}
            </dd>
          </div>
        </dl>
      ) : (
        <div>
          <p className="pt-proposal-goal">{proposal.goal}</p>
          {proposal.howToHelp ? <p className="pt-proposal-help">{proposal.howToHelp}</p> : null}
        </div>
      )}

      {actionable ? (
        <div className="pt-proposal-actions">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setOutcome({ kind: 'dismissed' })} disabled={isSaving}>
            Dismiss
          </button>
          <button type="button" className="ui-btn ui-btn-primary" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      ) : null}

      <p className="pt-proposal-status" role="status">
        {outcome.kind === 'saved' ? (
          <>
            Saved to your goals. <Link to="/personal-target">View goals</Link>
          </>
        ) : null}
        {outcome.kind === 'dismissed' ? 'Not saved.' : null}
        {outcome.kind === 'error' ? <span className="pt-error">{outcome.message}</span> : null}
        {outcome.kind === 'refused' ? (
          <span className="pt-review-reason">
            {outcome.review.reason}
            {outcome.review.suggestion ? <> Try: {outcome.review.suggestion.goal}</> : null}
          </span>
        ) : null}
      </p>
    </section>
  )
}

export default GoalProposalCard
