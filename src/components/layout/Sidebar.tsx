import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import type { AuthUser } from '../../context/AuthContext.ts'
import { routineTypeForDate, routineTypeLabel } from '../../features/onboarding/utils/routineTypeForDate.ts'
import { PanelLeftIcon, SparkIcon, XIcon } from '../icons/index.ts'
import { NAV_ENTRIES } from './navEntries.ts'
import { SIDEBAR_ID } from './shellContext.ts'

type SidebarProps = {
  user: AuthUser
  isCollapsed: boolean
  isMobile: boolean
  isMobileOpen: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
  onReplayTour: () => void
}

/** App sidebar (contracts/ui-shell.md "Sidebar", design resources/Sidebar-Design.png). */
function Sidebar({ user, isCollapsed, isMobile, isMobileOpen, onToggleCollapsed, onCloseMobile, onReplayTour }: SidebarProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  // Opening the overlay moves focus into it.
  useEffect(() => {
    if (isMobile && isMobileOpen) firstLinkRef.current?.focus()
  }, [isMobile, isMobileOpen])

  if (isCollapsed && !isMobile) {
    return (
      <aside id={SIDEBAR_ID} className="app-sidebar is-rail">
        <button
          type="button"
          className="ui-icon-btn is-plain"
          onClick={onToggleCollapsed}
          aria-label="Show sidebar"
          aria-expanded={false}
          aria-controls={SIDEBAR_ID}
        >
          <PanelLeftIcon />
        </button>
      </aside>
    )
  }

  const displayName = user?.name || user?.email || 'You'
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'
  const todayLabel = routineTypeLabel(routineTypeForDate(new Date()))
  const hiddenOverlay = isMobile && !isMobileOpen

  return (
    <aside
      id={SIDEBAR_ID}
      className="app-sidebar"
      aria-hidden={hiddenOverlay || undefined}
      inert={hiddenOverlay || undefined}
    >
      <div className="app-sidebar-top">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">M</span>
          <span className="app-brand-name">Milos</span>
        </div>
        {isMobile ? (
          <button type="button" className="ui-icon-btn is-plain" onClick={onCloseMobile} aria-label="Close menu">
            <XIcon />
          </button>
        ) : (
          <button
            type="button"
            className="ui-icon-btn is-plain"
            onClick={onToggleCollapsed}
            aria-label="Hide sidebar"
            aria-expanded={true}
            aria-controls={SIDEBAR_ID}
          >
            <PanelLeftIcon />
          </button>
        )}
      </div>

      <p className="app-sidebar-section">Plan</p>
      <nav aria-label="Main" className="app-nav">
        {NAV_ENTRIES.map(({ id, label, path, icon: NavIcon, badge }, index) => (
          <NavLink
            key={id}
            to={path}
            ref={index === 0 ? firstLinkRef : undefined}
            className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}
            onClick={isMobile ? onCloseMobile : undefined}
          >
            <NavIcon />
            <span className="app-nav-label">{label}</span>
            {badge ? <span className="ui-pill">{badge}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar-bottom">
        <button type="button" className="app-nav-link app-replay" onClick={onReplayTour}>
          <SparkIcon size={16} />
          <span className="app-nav-label">Replay tour</span>
        </button>
        <div className="app-user">
          <span className="app-user-avatar" aria-hidden="true">{initial}</span>
          <span className="app-user-text">
            <span className="app-user-name" title={displayName}>{displayName}</span>
            <span className="app-user-sub">{todayLabel}</span>
          </span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
