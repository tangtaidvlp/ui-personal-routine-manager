// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api.ts'
import ReflectionNote from './ReflectionNote.tsx'
import { testView } from './testView.ts'

describe('ReflectionNote', () => {
  it('asks Buddy for a note', async () => {
    const onRequestFeedback = vi.fn().mockResolvedValue(undefined)
    render(<ReflectionNote view={testView()} onRequestFeedback={onRequestFeedback} />)
    await userEvent.click(screen.getByRole('button', { name: "Get Buddy's note" }))
    expect(onRequestFeedback).toHaveBeenCalledOnce()
  })

  it('shows a stored note and the stale hint', () => {
    render(
      <ReflectionNote
        view={testView({ feedback: { text: 'Nice work today!', generatedAt: '2026-11-21T20:00:00Z', stale: true } })}
        onRequestFeedback={vi.fn()}
      />,
    )
    expect(screen.getByRole('region', { name: "Buddy's note" })).toHaveTextContent('Nice work today!')
    expect(screen.getByText(/changed since this note/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh note' })).toBeInTheDocument()
  })

  it('shows a friendly message when Buddy is unavailable', async () => {
    const onRequestFeedback = vi.fn().mockRejectedValue(new ApiError(503, 'Buddy is unavailable right now'))
    render(<ReflectionNote view={testView()} onRequestFeedback={onRequestFeedback} />)
    await userEvent.click(screen.getByRole('button', { name: "Get Buddy's note" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Buddy is unavailable right now')
  })

  it('shows the rate-limit message when the user asks too often', async () => {
    const onRequestFeedback = vi.fn().mockRejectedValue(new ApiError(429, "You're messaging Buddy too fast. Please wait a minute and try again."))
    render(<ReflectionNote view={testView()} onRequestFeedback={onRequestFeedback} />)
    await userEvent.click(screen.getByRole('button', { name: "Get Buddy's note" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('messaging Buddy too fast')
  })
})
