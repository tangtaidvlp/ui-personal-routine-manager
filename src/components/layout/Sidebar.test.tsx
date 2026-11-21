// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar.tsx'
import type { AuthUser } from '../../context/AuthContext.ts'

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}, path = '/today') {
  const onCloseMobile = vi.fn()
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar
        user={{ id: 'u1', email: 'tom@example.com', name: 'Tommy' }}
        isCollapsed={false}
        isMobile={false}
        isMobileOpen={false}
        onToggleCollapsed={vi.fn()}
        onCloseMobile={onCloseMobile}
        onReplayTour={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onCloseMobile }
}

describe('Sidebar profile entry (F006 FR-001, FR-006)', () => {
  it('the user block is a link to the Profile page', () => {
    renderSidebar()
    const link = screen.getByRole('link', { name: 'Open profile' })
    expect(link.getAttribute('href')).toMatch(/\/profile$/)
    expect(link).toHaveTextContent('Tommy')
    expect(link).not.toHaveAttribute('aria-current')
  })

  it('is marked current on the Profile page', () => {
    renderSidebar({}, '/profile')
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveAttribute('aria-current', 'page')
  })

  it('closes the phone overlay when picked', () => {
    const { onCloseMobile } = renderSidebar({ isMobile: true, isMobileOpen: true })
    fireEvent.click(screen.getByRole('link', { name: 'Open profile' }))
    expect(onCloseMobile).toHaveBeenCalled()
  })

  it('the collapsed rail still offers the profile as an avatar link (U3, SC-004)', () => {
    renderSidebar({ isCollapsed: true })
    const link = screen.getByRole('link', { name: 'Open profile' })
    expect(link.getAttribute('href')).toMatch(/\/profile$/)
    expect(link).toHaveTextContent('T')
  })

  it('shows the email when there is no username (T1)', () => {
    renderSidebar({ user: { id: 'u1', email: 'tom@example.com', name: '' } as AuthUser })
    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveTextContent('tom@example.com')
  })
})
