import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { TOUR_STEPS } from '../content/walkthroughContent.ts'
import { useDialogFocus } from '../hooks/useDialogFocus.ts'
import { placeCard, type CardPlacement, type Rect } from '../utils/placeCard.ts'
import { TOUR_STEP_COUNT, type WalkthroughEvent, type WalkthroughState } from '../types/walkthrough.ts'

type MobileView = 'board' | 'chat'

type GuidedTourProps = {
  state: WalkthroughState
  dispatch: (event: WalkthroughEvent) => void
  /** Current setup-screen view on phones, so it can be restored when the tour ends. */
  mobileView?: MobileView
  onMobileViewChange?: (view: MobileView) => void
}

const PHONE_QUERY = '(max-width: 760px)'
const SPOTLIGHT_PADDING = 6
const SHEET_MARGIN = 16

const isPhone = () => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches

function measure(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null // hidden (e.g. display:none on phones)
  return {
    top: r.top - SPOTLIGHT_PADDING,
    left: r.left - SPOTLIGHT_PADDING,
    width: r.width + SPOTLIGHT_PADDING * 2,
    height: r.height + SPOTLIGHT_PADDING * 2,
  }
}

/**
 * The 5-step guided tour over the setup screen (spec US2, FR-006/FR-007;
 * walkthrough-script.md Part 2; contracts/walkthrough-ui.md).
 * Renders only while state.phase === 'tour'.
 */
function GuidedTour({ state, dispatch, mobileView, onMobileViewChange }: GuidedTourProps) {
  const isOpen = state.phase === 'tour'
  const index = isOpen ? state.index : 0
  const step = TOUR_STEPS[index]

  const cardRef = useRef<HTMLDivElement>(null)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [placement, setPlacement] = useState<CardPlacement | null>(null)
  const [phone, setPhone] = useState(isPhone)

  useDialogFocus(cardRef, isOpen)

  // Remember the phone view from before the tour and restore it afterwards (research R10).
  const viewBeforeTour = useRef<MobileView | undefined>(undefined)
  useEffect(() => {
    if (!isOpen) return
    viewBeforeTour.current = mobileView
    return () => {
      if (viewBeforeTour.current) onMobileViewChange?.(viewBeforeTour.current)
    }
    // Only on open/close, not on every view change the tour itself makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Switch the phone view the step needs (step 4 shows the chat, others the board).
  useEffect(() => {
    if (isOpen && phone && step.mobileView) onMobileViewChange?.(step.mobileView)
  }, [isOpen, phone, step, onMobileViewChange])

  const reposition = useCallback(() => {
    if (!isOpen) return
    const rect = measure(step.target)
    setTargetRect(rect)
    const card = cardRef.current
    if (!card) return
    setPlacement(
      placeCard({
        target: rect,
        card: { width: card.offsetWidth, height: card.offsetHeight },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        side: step.side,
        align: step.align,
      }),
    )
  }, [isOpen, step])

  // Measure after render (and again next frame, once a phone view switch has laid out).
  useLayoutEffect(() => {
    if (!isOpen) return
    reposition()
    const frame = requestAnimationFrame(reposition)
    return () => cancelAnimationFrame(frame)
  }, [isOpen, reposition, phone])

  useEffect(() => {
    if (!isOpen) return
    const media = window.matchMedia(PHONE_QUERY)
    const onMedia = () => setPhone(media.matches)
    onMedia() // the viewport may have changed since this component mounted
    media.addEventListener('change', onMedia)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)

    const el = document.querySelector(`[data-tour="${step.target}"]`)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => reposition()) : null
    if (el) observer?.observe(el)
    if (cardRef.current) observer?.observe(cardRef.current)

    return () => {
      media.removeEventListener('change', onMedia)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      observer?.disconnect()
    }
  }, [isOpen, step, reposition])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'END' })
      else if (event.key === 'ArrowRight') dispatch({ type: 'NEXT' })
      else if (event.key === 'ArrowLeft') dispatch({ type: 'BACK' })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, dispatch])

  if (!isOpen) return null

  const isFirst = index === 0
  const isLast = index === TOUR_STEP_COUNT - 1

  // Phones: a full-width sheet at the bottom, or the top when the target sits in the lower half.
  let cardStyle: CSSProperties
  let side = placement?.side ?? 'center'
  if (phone) {
    const targetCenter = targetRect ? targetRect.top + targetRect.height / 2 : 0
    const atTop = targetRect !== null && targetCenter > window.innerHeight / 2
    cardStyle = atTop ? { top: SHEET_MARGIN } : { bottom: SHEET_MARGIN }
    side = 'center'
  } else if (placement) {
    cardStyle = { top: placement.top, left: placement.left }
  } else {
    cardStyle = { top: 0, left: 0, visibility: 'hidden' } // first paint, before measuring
  }

  const arrowVertical = side === 'left' || side === 'right'
  const arrowStyle: CSSProperties = arrowVertical ? { top: placement?.arrowOffset } : { left: placement?.arrowOffset }

  return (
    <div className="wt-tour-root">
      {/* Swallows clicks on the dimmed page so the tour can't be closed or bypassed by accident. */}
      <div className="wt-tour-blocker" aria-hidden="true" />

      {targetRect ? (
        <div
          className="wt-spotlight"
          aria-hidden="true"
          style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}
        />
      ) : (
        <div className="wt-spotlight wt-spotlight--none" aria-hidden="true" />
      )}

      <div
        ref={cardRef}
        className={`wt-tour-card${phone ? ' wt-tour-sheet' : ''}`}
        data-side={side}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${index + 1} of ${TOUR_STEP_COUNT}`}
        tabIndex={-1}
      >
        {side !== 'center' && <span className="wt-tour-arrow" style={arrowStyle} aria-hidden="true" />}

        <div className="wt-tour-progress">
          <span className="wt-tour-count">
            {index + 1} of {TOUR_STEP_COUNT}
          </span>
          <span className="wt-tour-segs" aria-hidden="true">
            {TOUR_STEPS.map((s, i) => (
              <span key={s.target} className={`wt-tour-seg${i <= index ? ' wt-tour-seg--done' : ''}`} />
            ))}
          </span>
        </div>

        <p className="wt-tour-text" aria-live="polite">
          {step.text}
        </p>

        <div className="wt-tour-footer">
          {!isLast && (
            <button type="button" className="wt-btn-text wt-tour-end" onClick={() => dispatch({ type: 'END' })}>
              End tour
            </button>
          )}
          <div className="wt-tour-actions">
            {!isFirst && (
              <button type="button" className="wt-btn-outline" onClick={() => dispatch({ type: 'BACK' })}>
                Back
              </button>
            )}
            {isLast ? (
              <button type="button" className="wt-btn-primary" onClick={() => dispatch({ type: 'END' })}>
                Got it
              </button>
            ) : (
              <button type="button" className="wt-btn-primary" onClick={() => dispatch({ type: 'NEXT' })}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuidedTour
