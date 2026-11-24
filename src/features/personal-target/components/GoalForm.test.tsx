// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api.ts'
import type { GoalReview } from '../types/goal.ts'
import GoalForm from './GoalForm.tsx'

const refusal: GoalReview = {
  reason: 'Sleeping 3 hours a night is not safe for long.',
  suggestion: { goal: 'Sleep 7 hours a night', howToHelp: 'Remind me at 10:30 PM' },
}

describe('GoalForm with Buddy review (F013 US5)', () => {
  it("keeps the text, shows Buddy's reason and fills the form with the suggestion", async () => {
    const onSave = vi.fn().mockResolvedValueOnce(refusal).mockResolvedValueOnce(null)
    render(<GoalForm onSave={onSave} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Goal'), 'Sleep 3 hours a night')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const box = await screen.findByRole('alert')
    expect(box).toHaveTextContent('Sleeping 3 hours a night is not safe for long.')
    expect(box).toHaveTextContent('Try: Sleep 7 hours a night')
    expect(screen.getByLabelText('Goal')).toHaveValue('Sleep 3 hours a night')

    await userEvent.click(screen.getByRole('button', { name: 'Use suggestion' }))
    expect(screen.getByLabelText('Goal')).toHaveValue('Sleep 7 hours a night')
    expect(screen.getByLabelText('How should Buddy help? (optional)')).toHaveValue('Remind me at 10:30 PM')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onSave).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenLastCalledWith({ goal: 'Sleep 7 hours a night', howToHelp: 'Remind me at 10:30 PM' })
  })

  it("shows the server's message when Buddy is unavailable, and the text stays", async () => {
    const onSave = vi.fn().mockRejectedValue(new ApiError(503, "Buddy couldn't check your goal right now. Please try again in a moment."))
    render(<GoalForm onSave={onSave} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Goal'), 'Run a 10k')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Buddy couldn't check your goal right now.")
    expect(screen.getByLabelText('Goal')).toHaveValue('Run a 10k')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
