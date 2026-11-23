import { useContext, useState, useTransition } from 'react'
import { Link } from 'react-router-dom'
import AuthContext from '../../../context/AuthContext.ts'
import { ApiError } from '../../../lib/api.ts'
import { createGoal, updateGoal } from '../api/goals.ts'
import type { GoalProposal } from '../types/goal.ts'

type Outcome =
  | { kind: 'open' }
  | { kind: 'saved' }
  | { kind: 'dismissed' }
  /** `retry`: a network error; the user may try again. Server refusals (4xx) are final. */
  | { kind: 'error'; message: string; retry: boolean }

type GoalProposalCardProps = {
  proposal: GoalProposal
}

/**
 * A goal Buddy proposed in chat (specs/F013 US3, contracts/ui.md "Buddy chat proposal card").
 * Nothing is saved until the user clicks Confirm, which goes through the normal goals API, so
 * the limit, length and ownership rules apply.
 */
function GoalProposalCard({ proposal }: GoalProposalCardProps) {
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
        if (isUpdate && proposal.goalId) {
          await updateGoal(userId, proposal.goalId, input)
        } else {
          await createGoal(userId, input)
        }
        setOutcome({ kind: 'saved' })
      } catch (err) {
        const isNetwork = err instanceof ApiError && err.status === 0
        const message = err instanceof ApiError ? err.message : "Couldn't save the goal. Please try again."
        setOutcome({ kind: 'error', message, retry: isNetwork || !(err instanceof ApiError) })
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
      </p>
    </section>
  )
}

export default GoalProposalCard
