import type { CardSide } from '../types/walkthrough.ts'

export type Rect = { top: number; left: number; width: number; height: number }
export type Size = { width: number; height: number }
export type PlacedSide = CardSide | 'center'

export type CardPlacement = {
  top: number
  left: number
  side: PlacedSide
  /** Distance of the arrow tip along the card edge facing the target (px). 0 when centered. */
  arrowOffset: number
}

type PlaceCardInput = {
  target: Rect | null
  card: Size
  viewport: Size
  side: CardSide
  gap?: number
  /** 'start' puts a left/right card near the target's top instead of centering it (mockups Tour 2 and 4). */
  align?: 'center' | 'start'
}

const VIEWPORT_MARGIN = 16
/** Keeps the arrow off the card's rounded corners. */
const ARROW_INSET = 20
/** How far below a tall target's top a 'start'-aligned card sits. */
const START_OFFSET = 48
const START_ARROW = 28

const OPPOSITE: Record<CardSide, CardSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
const OTHER_AXIS: Record<CardSide, [CardSide, CardSide]> = {
  top: ['right', 'left'],
  bottom: ['right', 'left'],
  left: ['bottom', 'top'],
  right: ['bottom', 'top'],
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

function fits(side: CardSide, target: Rect, card: Size, viewport: Size, gap: number): boolean {
  switch (side) {
    case 'bottom':
      return target.top + target.height + gap + card.height <= viewport.height - VIEWPORT_MARGIN
    case 'top':
      return target.top - gap - card.height >= VIEWPORT_MARGIN
    case 'right':
      return target.left + target.width + gap + card.width <= viewport.width - VIEWPORT_MARGIN
    case 'left':
      return target.left - gap - card.width >= VIEWPORT_MARGIN
  }
}

function centered(card: Size, viewport: Size): CardPlacement {
  return {
    top: (viewport.height - card.height) / 2,
    left: (viewport.width - card.width) / 2,
    side: 'center',
    arrowOffset: 0,
  }
}

/**
 * Positions a tour card next to its target (contracts/walkthrough-ui.md):
 * the preferred side, then the opposite side, then the other axis, then centered.
 * The card is always kept inside the viewport with a 16px margin.
 */
export function placeCard({ target, card, viewport, side, gap = 12, align = 'center' }: PlaceCardInput): CardPlacement {
  if (!target) return centered(card, viewport)

  const candidates: CardSide[] = [side, OPPOSITE[side], ...OTHER_AXIS[side]]
  const chosen = candidates.find((candidate) => fits(candidate, target, card, viewport, gap))
  if (!chosen) return centered(card, viewport)

  const centerX = target.left + target.width / 2
  const centerY = target.top + target.height / 2
  const maxLeft = viewport.width - VIEWPORT_MARGIN - card.width
  const maxTop = viewport.height - VIEWPORT_MARGIN - card.height

  if (chosen === 'top' || chosen === 'bottom') {
    const top = chosen === 'bottom' ? target.top + target.height + gap : target.top - gap - card.height
    const left = clamp(centerX - card.width / 2, VIEWPORT_MARGIN, maxLeft)
    return { top, left, side: chosen, arrowOffset: clamp(centerX - left, ARROW_INSET, card.width - ARROW_INSET) }
  }

  const left = chosen === 'right' ? target.left + target.width + gap : target.left - gap - card.width
  if (align === 'start') {
    const top = clamp(target.top + START_OFFSET, VIEWPORT_MARGIN, maxTop)
    return { top, left, side: chosen, arrowOffset: START_ARROW }
  }
  const top = clamp(centerY - card.height / 2, VIEWPORT_MARGIN, maxTop)
  return { top, left, side: chosen, arrowOffset: clamp(centerY - top, ARROW_INSET, card.height - ARROW_INSET) }
}
