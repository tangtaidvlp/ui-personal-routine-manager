import Icon, { type IconProps } from './Icon'

/* Milos icon set, exported from the "Milos – Personal Routine Manager" Figma file.
   All icons use a 24×24 grid and currentColor. */

/** Routine Buddy avatar / AI spark. */
export function SparkIcon(props: IconProps) {
  return (
    <Icon variant="fill" {...props}>
      <path d="M12 3l1.9 4.8L19 10l-5.1 2.2L12 17l-1.9-4.8L5 10l5.1-2.2L12 3z" />
    </Icon>
  )
}

/** Spark with a small companion star (intro slide 4: "Let Routine Buddy do the work"). */
export function SparklesIcon(props: IconProps) {
  return (
    <Icon variant="fill" {...props}>
      <path d="M12 3l1.9 4.8L19 10l-5.1 2.2L12 17l-1.9-4.8L5 10l5.1-2.2L12 3z" />
      <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </Icon>
  )
}

/** Send message (chat composer, mobile chat button). */
export function SendIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </Icon>
  )
}

/** Previous day / back. */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Icon>
  )
}

/** Next day / forward. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 18l6-6-6-6" />
    </Icon>
  )
}

/** Add task (FAB), zoom in. */
export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

/** Zoom out. */
export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

/** Task done checkmark. The design uses strokeWidth={3} at 12px inside the task checkbox. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Icon>
  )
}

/** Intro slide 1: "What is Milos?". */
export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  )
}

/** Intro slide 2: "How a day works" (each day repeats the routine). */
export function RepeatIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Icon>
  )
}

/** Intro slide 3: "See how you really spend your time". */
export function BarChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V11M10 20V5M16 20v-7M21 20H3" />
    </Icon>
  )
}

/** Open the sidebar on narrow screens (burger). */
export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  )
}

/** Hide / show the sidebar on wide screens. */
export function PanelLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </Icon>
  )
}

/** Close (mobile sidebar). */
export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Icon>
  )
}
