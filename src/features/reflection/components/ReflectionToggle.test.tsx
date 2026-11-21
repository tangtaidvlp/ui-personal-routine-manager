// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ReflectionToggle from './ReflectionToggle.tsx'

describe('ReflectionToggle', () => {
  it('is a pressed/unpressed button named Reflection', async () => {
    const onToggle = vi.fn()
    const { rerender } = render(<ReflectionToggle on={false} onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: 'Reflection' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
    rerender(<ReflectionToggle on onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Reflection' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('is disabled with the future-day hint', () => {
    render(<ReflectionToggle on={false} disabled onToggle={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Reflection' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'You can reflect once the day has happened.')
  })
})
