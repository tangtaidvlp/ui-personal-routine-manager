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
const saved: Goal = { id: 'g-9', goal: 'x', howToHelp: null, createdAt: '', updatedAt: '' }

function renderCard(proposal: GoalProposal) {
  return render(
    <AuthContext.Provider value={{ user: { id: 'user-1', name: 'Tom' }, setUser: vi.fn() }}>
      <MemoryRouter>
        <GoalProposalCard proposal={proposal} />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.mocked(createGoal).mockReset()
  vi.mocked(updateGoal).mockReset()
})

describe('GoalProposalCard', () => {
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
