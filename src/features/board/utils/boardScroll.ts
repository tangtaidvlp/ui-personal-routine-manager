const MINUTES_PER_DAY = 1440

/** The setup screen's board opens with 06:00 at the top (spec 003 FR-004, matches the mockups). */
export const SETUP_SCROLL_ANCHOR_MINUTES = 6 * 60

/** Room above the 06:00 line so its hour label (centred on the line) isn't cut off. */
export const SETUP_SCROLL_OFFSET_PX = 16

/** Scroll position that puts `minutes` at the top of the board, minus `offsetPx`. Never below 0. */
export function scrollTopForMinutes(minutes: number, boardHeightPx: number, offsetPx = 0): number {
  return Math.max(0, (minutes / MINUTES_PER_DAY) * boardHeightPx - offsetPx)
}

/** The time of day (in minutes) at a given scroll position. */
export function minutesForScrollTop(scrollTop: number, boardHeightPx: number): number {
  return boardHeightPx > 0 ? (scrollTop / boardHeightPx) * MINUTES_PER_DAY : 0
}
