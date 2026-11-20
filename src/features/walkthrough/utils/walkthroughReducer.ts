import {
  SLIDE_COUNT,
  TOUR_STEP_COUNT,
  type SlideIndex,
  type TourIndex,
  type WalkthroughEvent,
  type WalkthroughState,
} from '../types/walkthrough.ts'

const HIDDEN: WalkthroughState = { phase: 'hidden' }
const LAST_SLIDE = (SLIDE_COUNT - 1) as SlideIndex
const LAST_STEP = (TOUR_STEP_COUNT - 1) as TourIndex

/**
 * Every navigation rule for the intro slides and guided tour.
 * Pure: no side effects, no storage, no API calls (FR-014).
 * Transition table: specs/002-onboarding-instruction/data-model.md §3.
 */
export function walkthroughReducer(state: WalkthroughState, event: WalkthroughEvent): WalkthroughState {
  if (event.type === 'OPEN') {
    return { phase: 'slides', index: 0, context: event.context }
  }

  switch (state.phase) {
    case 'hidden':
      return state

    case 'slides':
      switch (event.type) {
        case 'NEXT':
          return state.index < LAST_SLIDE ? { ...state, index: (state.index + 1) as SlideIndex } : state
        case 'BACK':
          return state.index > 0 ? { ...state, index: (state.index - 1) as SlideIndex } : state
        case 'JUMP':
          return { ...state, index: event.index }
        case 'SKIP':
          return HIDDEN
        case 'START_TOUR':
          if (state.index !== LAST_SLIDE) return state
          return state.context === 'onboarding' ? { phase: 'tour', index: 0 } : HIDDEN
        default:
          return state
      }

    case 'tour':
      switch (event.type) {
        case 'NEXT':
          return state.index < LAST_STEP ? { ...state, index: (state.index + 1) as TourIndex } : state
        case 'BACK':
          return state.index > 0 ? { ...state, index: (state.index - 1) as TourIndex } : state
        case 'END':
          return HIDDEN
        default:
          return state
      }
  }
}
