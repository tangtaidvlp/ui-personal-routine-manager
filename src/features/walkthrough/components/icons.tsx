import type { ComponentType } from 'react'
import { BarChartIcon, CalendarIcon, RepeatIcon, SparklesIcon, type IconProps } from '../../../components/icons/index.ts'
import type { SlideIconName } from '../types/walkthrough.ts'

/** Slide icon tiles, from the shared Milos icon set (exported from Figma). */
export const SLIDE_ICONS: Record<SlideIconName, ComponentType<IconProps>> = {
  calendar: CalendarIcon,
  repeat: RepeatIcon,
  chart: BarChartIcon,
  sparkles: SparklesIcon,
}
