// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthContext from '../../../context/AuthContext.ts'
import { ApiError } from '../../../lib/api.ts'
import { createGoal, updateGoal } from '../api/goals.ts'
import type { Goal, GoalProposal } from '../types/goal.ts'
import GoalProposalCard from './GoalProposalCard.tsx'

vi.mock('../api/goals.ts', () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
}))

const add: GoalProposal = { action: 'ADD', goalId: null, goal: 'Be in bed by 11 PM', howToHelp: 'Nudge me at 10:30', current: null }
const update: GoalProposal = {
  action: 'UPDATE',
  goalId: 'g-1',
  goal: 'Run a half marathon',
  howToHelp: null,
  current: { goal: 'Run a 10k', howToHelp: 'Keep me training' },
}
const savedGoal: Goal = { id: 'g-9', goal: 'x', howToHelp: null, createdAt: '', updatedAt: '' }
const saved = { goal: savedGoal, review: null }

function renderCard(proposal: GoalProposal, onSaved?: () => void) {
  return render(
    <AuthContext.Provider value={{ user: { id: 'user-1', name: 'Tom' }, setUser: vi.fn() }}>
      <MemoryRouter>
        <GoalProposalCard proposal={proposal} onSaved={onSaved} />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.mocked(createGoal).mockReset()
  vi.mocked(updateGoal).mockReset()
})

describe('GoalProposalCard', () => {
  it('tells the page once the goal is saved, never on dismiss', async () => {
    vi.mocked(createGoal).mockResolvedValue(saved)
    const onSaved = vi.fn()
    const { unmount } = renderCard(add, onSaved)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onSaved).not.toHaveBeenCalled()
    unmount()

    renderCard(add, onSaved)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await screen.findByText(/Saved to your goals\./)
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it("shows Buddy's refusal as final, with the suggestion", async () => {
    vi.mocked(createGoal).mockResolvedValue({
      goal: null,
      review: { reason: 'Too little sleep is not safe.', suggestion: { goal: 'Sleep 7 hours a night', howToHelp: null } },
    })
    const onSaved = vi.fn()
    renderCard(add, onSaved)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText(/Too little sleep is not safe\. Try: Sleep 7 hours a night/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('keeps Confirm when Buddy is unavailable (503)', async () => {
    vi.mocked(createGoal).mockRejectedValue(new ApiError(503, "Buddy couldn't check your goal right now. Please try again in a moment."))
    renderCard(add)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText(/Buddy couldn't check your goal right now/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()
  })

  it('keeps Confirm when the user is rate limited (429)', async () => {
    vi.mocked(createGoal).mockRejectedValue(new ApiError(429, "You're messaging Buddy too fast. Please wait a minute and try again."))
    renderCard(add)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText(/messaging Buddy too fast/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()
  })

  it('saves a new goal only when the user confirms', async () => {
    vi.mocked(createGoal).mockResolvedValue(saved)
    renderCard(add)

    expect(screen.getByRole('region', { name: 'New goal' })).toHaveTextContent('Be in bed by 11 PM')
    expect(createGoal).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(createGoal).toHaveBeenCalledWith('user-1', { goal: 'Be in bed by 11 PM', howToHelp: 'Nudge me at 10:30' })
    expect(await screen.findByText(/Saved to your goals\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View goals' })).toHaveAttribute('href', '/personal-target')
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  })

  it('shows the current and proposed goal for a change and updates it on confirm', async () => {
    vi.mocked(updateGoal).mockResolvedValue(saved)
    renderCard(update)

    const card = screen.getByRole('region', { name: 'Change goal' })
    expect(card).toHaveTextContent('Now')
    expect(card).toHaveTextContent('Run a 10k')
    expect(card).toHaveTextContent('Proposed')
    expect(card).toHaveTextContent('Run a half marathon')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(updateGoal).toHaveBeenCalledWith('user-1', 'g-1', { goal: 'Run a half marathon', howToHelp: null })
    expect(await screen.findByText(/Saved to your goals\./)).toBeInTheDocument()
  })

  it('saves nothing when dismissed', async () => {
    renderCard(add)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.getByRole('status')).toHaveTextContent('Not saved.')
    expect(createGoal).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  })

  it('shows a server refusal and does not offer to try again', async () => {
    vi.mocked(createGoal).mockRejectedValue(new ApiError(409, 'You can have up to 3 goals.'))
    renderCard(add)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText('You can have up to 3 goals.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  })

  it('shows a deleted goal as not found', async () => {
    vi.mocked(updateGoal).mockRejectedValue(new ApiError(404, 'Goal not found'))
    renderCard(update)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(await screen.findByText('Goal not found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
  })

  it('lets the user try again after a network error', async () => {
    vi.mocked(createGoal)
      .mockRejectedValueOnce(new ApiError(0, 'A network error occurred. Please try again later.'))
      .mockResolvedValueOnce(saved)
    renderCard(add)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('A network error occurred. Please try again later.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText(/Saved to your goals\./)).toBeInTheDocument()
    expect(createGoal).toHaveBeenCalledTimes(2)
  })
})
