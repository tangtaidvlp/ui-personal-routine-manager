import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react'
import { ApiError } from '../../../lib/api.ts'
import type { GoalInput } from '../types/goal.ts'
import { GOAL_MAX, HELP_MAX, validateGoal } from '../utils/goalRules.ts'

type GoalFormProps = {
  /** The goal being edited; empty for a new goal. */
  initial?: GoalInput
  /** Saves the goal; throws (ApiError) when the server refuses it. */
  onSave: (input: GoalInput) => Promise<void>
  onCancel: () => void
}

/**
 * Add/edit form for one goal (specs/F013 contracts/ui.md "Add/Edit form"). A refused save keeps
 * what the user typed and shows the server's message.
 */
function GoalForm({ initial, onSave, onCancel }: GoalFormProps) {
  const goalId = useId()
  const helpId = useId()
  const errorId = useId()
  const goalRef = useRef<HTMLInputElement>(null)
  const [goal, setGoal] = useState(initial?.goal ?? '')
  const [help, setHelp] = useState(initial?.howToHelp ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  // Focus moves into the form when it opens (contracts/ui.md, keyboard use).
  useEffect(() => {
    goalRef.current?.focus()
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateGoal(goal, help)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError(null)
    startSaving(async () => {
      try {
        await onSave(result.value)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Couldn't save the goal. Please try again.")
      }
    })
  }

  return (
    <form className="pt-form" onSubmit={handleSubmit} noValidate aria-describedby={error ? errorId : undefined}>
      <div className="pt-field">
        <label htmlFor={goalId}>Goal</label>
        <input
          ref={goalRef}
          id={goalId}
          type="text"
          value={goal}
          maxLength={GOAL_MAX}
          required
          onChange={(event) => setGoal(event.target.value)}
          placeholder="e.g. Run a 10k by March"
        />
        <span className="pt-count" aria-live="off">{goal.length}/{GOAL_MAX}</span>
      </div>
      <div className="pt-field">
        <label htmlFor={helpId}>How should Buddy help? (optional)</label>
        <textarea
          id={helpId}
          value={help}
          maxLength={HELP_MAX}
          rows={3}
          onChange={(event) => setHelp(event.target.value)}
          placeholder="e.g. Keep me training 3 times a week"
        />
        <span className="pt-count" aria-live="off">{help.length}/{HELP_MAX}</span>
      </div>
      {error ? (
        <p id={errorId} className="pt-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="pt-form-actions">
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
        <button type="submit" className="ui-btn ui-btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

export default GoalForm
