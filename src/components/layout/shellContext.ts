import type { RefObject } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AuthUser } from '../../context/AuthContext.ts'

export const SIDEBAR_ID = 'app-sidebar'

/** What AppShell hands to each page through the router outlet (contracts/ui-shell.md). */
export type ShellOutletContext = {
  user: AuthUser
  onLogout: () => void
  /** Opens the sidebar overlay; used by the page header's burger on narrow screens. */
  openSidebar: () => void
  isMobile: boolean
  /** Whether the narrow-screen sidebar overlay is open (for the burger's aria-expanded). */
  isMobileOpen: boolean
  /** Burger button; focus returns here when the overlay closes. */
  menuButtonRef: RefObject<HTMLButtonElement | null>
}

export function useShellContext(): ShellOutletContext {
  return useOutletContext<ShellOutletContext>()
}
