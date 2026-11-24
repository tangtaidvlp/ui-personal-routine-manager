// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BuddyTonePicker from './BuddyTonePicker.tsx'

describe('BuddyTonePicker', () => {
  it('shows the six tones with the saved one checked', () => {
    render(<BuddyTonePicker value="STOIC" onChange={vi.fn()} />)

    const group = screen.getByRole('group', { name: 'Buddy tone' })
    const radios = screen.getAllByRole('radio')
    expect(group).toBeInTheDocument()
    expect(radios).toHaveLength(6)
    expect(screen.getByRole('radio', { name: /Grounded Stoic/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Balanced/ })).not.toBeChecked()
  })

  it('saves a new tone and says so', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    render(<BuddyTonePicker value="BALANCED" onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: /Warm Anchor/ }))

    expect(onChange).toHaveBeenCalledWith('WARM_ANCHOR')
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Warm Anchor/ })).toBeChecked()
  })

  it('puts the previous tone back when saving fails', async () => {
    const onChange = vi.fn().mockRejectedValue(new Error('offline'))
    render(<BuddyTonePicker value="BALANCED" onChange={onChange} />)

    await userEvent.click(screen.getByRole('radio', { name: /High-Accountability Coach/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save your tone. Please try again.")
    expect(screen.getByRole('radio', { name: /Balanced/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /High-Accountability Coach/ })).not.toBeChecked()
  })
})
