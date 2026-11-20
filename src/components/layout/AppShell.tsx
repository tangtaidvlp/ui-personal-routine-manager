import { useContext, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import AuthContext from '../../context/AuthContext.ts'
import { useWalkthrough } from '../../features/walkthrough/hooks/useWalkthrough.ts'
import IntroSlides from '../../features/walkthrough/components/IntroSlides.tsx'
import Sidebar from './Sidebar.tsx'
import type { ShellOutletContext } from './shellContext.ts'
import { useSidebar } from './useSidebar.ts'
import './AppShell.css'

type AppShellProps = {
  onLogout: () => void
}

/** Layout route for every signed-in, onboarded page: sidebar + page outlet (contracts/ui-shell.md). */
function AppShell({ onLogout }: AppShellProps) {
  const { user } = useContext(AuthContext)
  const sidebar = useSidebar()
  const { isMobile, isCollapsed, isMobileOpen, closeMobile, openMobile, toggleCollapsed } = sidebar
  // After onboarding, the instructions only open on request ("Replay tour", FR-009).
  const walkthrough = useWalkthrough()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const overlayOpen = isMobile && isMobileOpen
  const wasOverlayOpen = useRef(false)

  // Escape closes the overlay.
  useEffect(() => {
    if (!overlayOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [overlayOpen, closeMobile])

  // Closing the overlay returns focus to the burger.
  useEffect(() => {
    if (wasOverlayOpen.current && !overlayOpen) menuButtonRef.current?.focus()
    wasOverlayOpen.current = overlayOpen
  }, [overlayOpen])

  const sidebarState = isMobile ? (isMobileOpen ? 'open' : 'closed') : isCollapsed ? 'collapsed' : 'expanded'

  const outletContext: ShellOutletContext = {
    user,
    onLogout,
    openSidebar: openMobile,
    isMobile,
    isMobileOpen,
    menuButtonRef,
  }

  return (
    <div className="app-shell" data-sidebar={sidebarState}>
      <Sidebar
        user={user}
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={closeMobile}
        onReplayTour={() => {
          closeMobile()
          walkthrough.open('app')
        }}
      />
      {overlayOpen ? <div className="app-shell-backdrop" onClick={closeMobile} aria-hidden="true" /> : null}
      <main className="app-shell-main" inert={overlayOpen || undefined}>
        <Outlet context={outletContext} />
      </main>
      <IntroSlides state={walkthrough.state} dispatch={walkthrough.dispatch} />
    </div>
  )
}

export default AppShell
