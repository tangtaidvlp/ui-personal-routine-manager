// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import ThemeControl from './ThemeControl.tsx'
import { setThemePreference } from '../theme/useTheme.ts'

describe('ThemeControl (F006 FR-009)', () => {
  beforeEach(() => {
    setThemePreference('system')
  })

  it('is a radiogroup named Theme with Light, Dark and System', () => {
    render(<ThemeControl variant="full" />)
    const group = screen.getByRole('radiogroup', { name: 'Theme' })
    expect(group).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('aria-label') ?? radio.textContent)).toEqual([
      'Light',
      'Dark',
      'System',
    ])
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
  })

  it('applies a choice at once', async () => {
    const user = userEvent.setup()
    render(<ThemeControl variant="full" />)
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'false')
  })

  it('moves and selects with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<ThemeControl variant="full" />)
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'System' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps every mounted control in sync', async () => {
    const user = userEvent.setup()
    render(
      <>
        <ThemeControl variant="sidebar" />
        <ThemeControl variant="compact" />
      </>,
    )
    const [first, second] = screen.getAllByRole('radiogroup', { name: 'Theme' })
    await user.click(first.querySelector('[data-value="light"]') as HTMLElement)
    expect(second.querySelector('[data-value="light"]')).toHaveAttribute('aria-checked', 'true')
  })
})
