import type { ComponentType } from 'react'
import { BarChartIcon, CalendarIcon, RepeatIcon, TargetIcon, type IconProps } from '../icons/index.ts'

/** One sidebar item (specs/.done.F002-ui-refactoring data-model §1). Order is fixed (FR-002). */
export type NavEntry = {
  id: 'today' | 'default-routine' | 'personal-target' | 'analytics'
  label: string
  path: string
  icon: ComponentType<IconProps>
  badge?: string
}

export const NAV_ENTRIES: readonly NavEntry[] = [
  { id: 'today', label: 'Today', path: '/today', icon: CalendarIcon },
  { id: 'default-routine', label: 'Default routine', path: '/default-routine', icon: RepeatIcon },
  { id: 'personal-target', label: 'Personal Target', path: '/personal-target', icon: TargetIcon },
  { id: 'analytics', label: 'Analytics', path: '/analytics', icon: BarChartIcon, badge: 'Soon' },
]
