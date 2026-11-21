import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { readSidebarCollapsed, safeLocalStorage, writeSidebarCollapsed } from './sidebarPreference.ts'

/** Same breakpoint App.css uses for the mobile board/chat swap. */
export const MOBILE_QUERY = '(max-width: 760px)'

function matchesMobile(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches
}

export type SidebarState = {
  isMobile: boolean
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapsed: () => void
  openMobile: () => void
  closeMobile: () => void
}

/** Sidebar state machine (specs/.done.F002-ui-refactoring data-model §3). */
export function useSidebar(): SidebarState {
  const [isMobile, setIsMobile] = useState(matchesMobile)
  const [isCollapsed, setIsCollapsed] = useState(() => readSidebarCollapsed(safeLocalStorage()))
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(MOBILE_QUERY)
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
      if (event.matches) {
        // wide → narrow: never leave an overlay covering the content
        setIsMobileOpen(false)
      } else {
        // narrow → wide: re-apply the stored wide-screen choice
        setIsCollapsed(readSidebarCollapsed(safeLocalStorage()))
      }
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Choosing a page closes the mobile overlay.
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current
      writeSidebarCollapsed(safeLocalStorage(), next)
      return next
    })
  }, [])

  const openMobile = useCallback(() => setIsMobileOpen(true), [])
  const closeMobile = useCallback(() => setIsMobileOpen(false), [])

  return { isMobile, isCollapsed, isMobileOpen, toggleCollapsed, openMobile, closeMobile }
}
