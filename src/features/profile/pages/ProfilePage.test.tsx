// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShellOutletContext } from '../../../components/layout/shellContext.ts'

vi.mock('../api/profile.ts', () => ({ fetchUserProfile: vi.fn() }))

import { fetchUserProfile } from '../api/profile.ts'
import ProfilePage from './ProfilePage.tsx'
import { setThemePreference } from '../../../theme/useTheme.ts'

const fetchProfile = vi.mocked(fetchUserProfile)

function renderProfile(overrides: Partial<ShellOutletContext> = {}) {
  const context: ShellOutletContext = {
    user: { id: 'u1', email: 'tom@example.com', name: 'Tom' },
    onLogout: vi.fn(),
    openSidebar: vi.fn(),
    isMobile: false,
    isMobileOpen: false,
    menuButtonRef: createRef<HTMLButtonElement>(),
    ...overrides,
  }
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  return context
}

describe('ProfilePage (F006 US2)', () => {
  beforeEach(() => {
    fetchProfile.mockReset()
    setThemePreference('system')
  })

  it('shows the name, email and plan from the server', async () => {
    fetchProfile.mockResolvedValue({ id: 'u1', username: 'Tommy', email: 'tom@example.com', plan: { code: 'FREE', name: 'Free plan' } })
    renderProfile()
    expect(await screen.findByText('Tommy')).toBeInTheDocument()
    expect(screen.getByText('tom@example.com')).toBeInTheDocument()
    expect(screen.getByText('Free plan')).toBeInTheDocument()
    expect(fetchProfile).toHaveBeenCalledWith('u1')
  })

  it('has Preferences with the theme choice and the shared board zoom', async () => {
    fetchProfile.mockResolvedValue({ id: 'u1', username: 'Tom', email: 'tom@example.com', plan: { code: 'FREE', name: 'Free plan' } })
    const user = userEvent.setup()
    renderProfile()
    const preferences = screen.getByRole('region', { name: 'Preferences' })
    expect(within(preferences).getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(within(preferences).getByText('100%')).toBeInTheDocument()
    await user.click(within(preferences).getByRole('button', { name: 'Zoom in' }))
    expect(within(preferences).getByText('125%')).toBeInTheDocument()
    await user.click(within(preferences).getByRole('button', { name: 'Zoom out' }))
  })

  it('signs out with the page button', async () => {
    fetchProfile.mockResolvedValue({ id: 'u1', username: 'Tom', email: 'tom@example.com', plan: { code: 'FREE', name: 'Free plan' } })
    const user = userEvent.setup()
    const context = renderProfile()
    const account = screen.getByRole('region', { name: 'Account' })
    await user.click(within(account).getByRole('button', { name: 'Sign out' }))
    expect(context.onLogout).toHaveBeenCalled()
  })

  it('still shows what it knows when the profile fails to load', async () => {
    fetchProfile.mockRejectedValue(new Error('offline'))
    renderProfile()
    expect(await screen.findByText("Couldn't load all profile details.")).toBeInTheDocument()
    expect(screen.getByText('Tom')).toBeInTheDocument()
    expect(screen.getByText('tom@example.com')).toBeInTheDocument()
    expect(screen.getByText('Free plan')).toBeInTheDocument()
  })
})
