import { describe, expect, it } from 'vitest'
import { walkthroughReducer } from './walkthroughReducer.ts'
import type { WalkthroughState } from '../types/walkthrough.ts'

const hidden: WalkthroughState = { phase: 'hidden' }
const slide = (index: 0 | 1 | 2 | 3, context: 'onboarding' | 'app' = 'onboarding'): WalkthroughState => ({
  phase: 'slides',
  index,
  context,
})
const tour = (index: 0 | 1 | 2 | 3 | 4): WalkthroughState => ({ phase: 'tour', index })

describe('walkthroughReducer', () => {
  describe('OPEN', () => {
    it('opens the first slide from hidden', () => {
      expect(walkthroughReducer(hidden, { type: 'OPEN', context: 'onboarding' })).toEqual(slide(0))
    })

    it('restarts at the first slide from any phase, with the new context', () => {
      expect(walkthroughReducer(slide(2), { type: 'OPEN', context: 'app' })).toEqual(slide(0, 'app'))
      expect(walkthroughReducer(tour(3), { type: 'OPEN', context: 'onboarding' })).toEqual(slide(0))
    })
  })

  describe('slides', () => {
    it('NEXT advances through slides 1–3', () => {
      expect(walkthroughReducer(slide(0), { type: 'NEXT' })).toEqual(slide(1))
      expect(walkthroughReducer(slide(1), { type: 'NEXT' })).toEqual(slide(2))
      expect(walkthroughReducer(slide(2), { type: 'NEXT' })).toEqual(slide(3))
    })

    it('NEXT on the last slide does nothing (it uses explicit buttons)', () => {
      expect(walkthroughReducer(slide(3), { type: 'NEXT' })).toEqual(slide(3))
    })

    it('BACK goes to the previous slide and stops at the first', () => {
      expect(walkthroughReducer(slide(2), { type: 'BACK' })).toEqual(slide(1))
      expect(walkthroughReducer(slide(0), { type: 'BACK' })).toEqual(slide(0))
    })

    it('keeps the context while navigating', () => {
      expect(walkthroughReducer(slide(1, 'app'), { type: 'NEXT' })).toEqual(slide(2, 'app'))
    })

    it('JUMP goes straight to a slide', () => {
      expect(walkthroughReducer(slide(0), { type: 'JUMP', index: 2 })).toEqual(slide(2))
    })

    it('SKIP closes everything and never starts the tour (FR-008)', () => {
      expect(walkthroughReducer(slide(1), { type: 'SKIP' })).toEqual(hidden)
      expect(walkthroughReducer(slide(3), { type: 'SKIP' })).toEqual(hidden)
    })

    it('START_TOUR on the last onboarding slide starts the tour (FR-006)', () => {
      expect(walkthroughReducer(slide(3), { type: 'START_TOUR' })).toEqual(tour(0))
    })

    it('START_TOUR on the last app slide just closes (FR-013)', () => {
      expect(walkthroughReducer(slide(3, 'app'), { type: 'START_TOUR' })).toEqual(hidden)
    })

    it('START_TOUR before the last slide does nothing', () => {
      expect(walkthroughReducer(slide(1), { type: 'START_TOUR' })).toEqual(slide(1))
    })
  })

  describe('tour', () => {
    it('NEXT advances through steps 1–5 and stops at the last', () => {
      expect(walkthroughReducer(tour(0), { type: 'NEXT' })).toEqual(tour(1))
      expect(walkthroughReducer(tour(3), { type: 'NEXT' })).toEqual(tour(4))
      expect(walkthroughReducer(tour(4), { type: 'NEXT' })).toEqual(tour(4))
    })

    it('BACK goes to the previous step and stops at the first', () => {
      expect(walkthroughReducer(tour(2), { type: 'BACK' })).toEqual(tour(1))
      expect(walkthroughReducer(tour(0), { type: 'BACK' })).toEqual(tour(0))
    })

    it('END closes the tour from any step (FR-007)', () => {
      expect(walkthroughReducer(tour(0), { type: 'END' })).toEqual(hidden)
      expect(walkthroughReducer(tour(4), { type: 'END' })).toEqual(hidden)
    })

    it('ignores slide-only events', () => {
      expect(walkthroughReducer(tour(2), { type: 'JUMP', index: 0 })).toEqual(tour(2))
      expect(walkthroughReducer(tour(2), { type: 'START_TOUR' })).toEqual(tour(2))
    })
  })

  describe('hidden', () => {
    it('ignores everything except OPEN', () => {
      for (const type of ['NEXT', 'BACK', 'SKIP', 'START_TOUR', 'END'] as const) {
        expect(walkthroughReducer(hidden, { type })).toEqual(hidden)
      }
      expect(walkthroughReducer(hidden, { type: 'JUMP', index: 2 })).toEqual(hidden)
    })
  })
})
