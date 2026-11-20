import type { ReactNode } from 'react'
import { MenuIcon } from '../icons/index.ts'
import { SIDEBAR_ID, useShellContext } from './shellContext.ts'

type PageHeaderProps = {
  /** Page title area (left). */
  children?: ReactNode
  /** Page actions (right), shown before "Sign out". */
  actions?: ReactNode
}

/**
 * Header row shared by the shell pages: burger (narrow screens) + title on the left,
 * actions + "Sign out" on the right (contracts/ui-shell.md "Page header", FR-010).
 */
function PageHeader({ children, actions }: PageHeaderProps) {
  const { isMobile, isMobileOpen, openSidebar, onLogout, menuButtonRef } = useShellContext()

  return (
    <header className="page-header">
      <div className="page-header-start">
        {isMobile ? (
          <button
            ref={menuButtonRef}
            type="button"
            className="ui-icon-btn page-header-menu"
            onClick={openSidebar}
            aria-label="Open menu"
            aria-controls={SIDEBAR_ID}
            aria-expanded={isMobileOpen}
          >
            <MenuIcon />
          </button>
        ) : null}
        <div className="page-header-title">{children}</div>
      </div>
      <div className="page-header-actions">
        {actions}
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export default PageHeader
