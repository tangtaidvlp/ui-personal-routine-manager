// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ReflectionTaskPopup from './ReflectionTaskPopup.tsx'
import { testView } from './testView.ts'

const [asPlanned, changed, unplanned, skipped] = testView().comparison.items

describe('ReflectionTaskPopup', () => {
  it('shows the group and planned vs actual times', () => {
    render(<ReflectionTaskPopup item={changed} onEdit={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Deep work' })
    expect(dialog).toHaveTextContent('Changed')
    expect(dialog).toHaveTextContent('Planned as Work')
    expect(dialog).toHaveTextContent('09:00 · 3h 30m')
    expect(dialog).toHaveTextContent('09:30 · 3h 45m')
  })

  it('has no plan row for an unplanned task', () => {
    render(<ReflectionTaskPopup item={unplanned} onEdit={vi.fn()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Coffee' })
    expect(dialog).toHaveTextContent('Unplanned')
    expect(dialog).not.toHaveTextContent('Plan16')
    expect(screen.queryByText('Plan')).toBeNull()
  })

  it('edits and closes', async () => {
    const onEdit = vi.fn()
    const onClose = vi.fn()
    render(<ReflectionTaskPopup item={asPlanned} onEdit={onEdit} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('renders nothing when closed or for a skipped task', () => {
    const { container, rerender } = render(<ReflectionTaskPopup item={null} onEdit={vi.fn()} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ReflectionTaskPopup item={skipped} onEdit={vi.fn()} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
