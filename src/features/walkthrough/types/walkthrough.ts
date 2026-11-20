/**
 * Types for the onboarding walkthrough (intro slides + guided tour).
 * Spec: specs/002-onboarding-instruction/data-model.md §3–§4.
 */

/** Where the walkthrough was opened: the setup screen (slides + tour) or the main app (slides only). */
export type WalkthroughContext = 'onboarding' | 'app'

export type SlideIndex = 0 | 1 | 2 | 3
export type TourIndex = 0 | 1 | 2 | 3 | 4

export const SLIDE_COUNT = 4
export const TOUR_STEP_COUNT = 5

export type WalkthroughState =
  | { phase: 'hidden' }
  | { phase: 'slides'; index: SlideIndex; context: WalkthroughContext }
  | { phase: 'tour'; index: TourIndex }

export type WalkthroughEvent =
  | { type: 'OPEN'; context: WalkthroughContext }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'JUMP'; index: SlideIndex }
  | { type: 'SKIP' }
  | { type: 'START_TOUR' }
  | { type: 'END' }

export type SlideIconName = 'calendar' | 'repeat' | 'chart' | 'sparkles'

export type SlideContent = {
  id: 'what' | 'day' | 'habits' | 'buddy'
  icon: SlideIconName
  /** Uppercase eyebrow above the title, e.g. "WHAT IS MILOS?". */
  label: string
  title: string
  body: string
  /** Slide 4's "First step" box. */
  callout?: { heading: string; text: string }
}

/** Value of the `data-tour` attribute on the element a tour step highlights. */
export type TourTarget = 'schedule-switch' | 'routine-board' | 'add-task' | 'routine-buddy' | 'finish'

export type CardSide = 'top' | 'bottom' | 'left' | 'right'

export type TourStepContent = {
  target: TourTarget
  text: string
  /** Preferred side for the card on desktop; flips when it doesn't fit. */
  side: CardSide
  /** 'start' places a left/right card near the target's top (tall panels). */
  align?: 'center' | 'start'
  /** On phones, the setup screen view to show for this step. */
  mobileView?: 'board' | 'chat'
}
