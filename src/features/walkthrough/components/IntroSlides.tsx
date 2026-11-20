import { useEffect, useId, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { SLIDES } from '../content/walkthroughContent.ts'
import { SLIDE_ICONS } from './icons.tsx'
import { useDialogFocus } from '../hooks/useDialogFocus.ts'
import { SLIDE_COUNT, type SlideIndex, type WalkthroughEvent, type WalkthroughState } from '../types/walkthrough.ts'

type IntroSlidesProps = {
  state: WalkthroughState
  dispatch: (event: WalkthroughEvent) => void
}

const SWIPE_MIN_PX = 50

/**
 * The 4 intro slides (spec US1, FR-003–FR-005; walkthrough-script.md Part 1).
 * Renders only while state.phase === 'slides'.
 */
function IntroSlides({ state, dispatch }: IntroSlidesProps) {
  const isOpen = state.phase === 'slides'
  const cardRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const titleId = useId()

  useDialogFocus(cardRef, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'SKIP' })
      else if (event.key === 'ArrowRight') dispatch({ type: 'NEXT' })
      else if (event.key === 'ArrowLeft') dispatch({ type: 'BACK' })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, dispatch])

  if (!isOpen) return null

  const { index, context } = state
  const slide = SLIDES[index]
  const Icon = SLIDE_ICONS[slide.icon]
  const isFirst = index === 0
  const isLast = index === SLIDE_COUNT - 1
  const inApp = context === 'app'

  const onPointerDown = (event: ReactPointerEvent) => {
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) {
      dispatch({ type: dx < 0 ? 'NEXT' : 'BACK' })
    }
  }

  return (
    <div className="wt-backdrop">
      <div
        ref={cardRef}
        className="wt-slide-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        <div className="wt-slide-head">
          <div className="wt-icon-tile" aria-hidden="true">
            <Icon size={22} />
          </div>
          <button type="button" className="wt-btn-text" onClick={() => dispatch({ type: 'SKIP' })}>
            Skip
          </button>
        </div>

        <p className="wt-eyebrow">{slide.label}</p>
        <h2 id={titleId} className="wt-title">
          {slide.title}
        </h2>
        <p className="wt-body">{slide.body}</p>

        {slide.callout && (
          <div className="wt-callout">
            <p className="wt-callout-heading">{slide.callout.heading}</p>
            <p className="wt-callout-text">{slide.callout.text}</p>
          </div>
        )}

        <div className="wt-slide-footer">
          <div className="wt-footer-start">
            {!isFirst && (
              <button type="button" className="wt-btn-text" onClick={() => dispatch({ type: 'BACK' })}>
                Back
              </button>
            )}
          </div>

          <div className="wt-dots" role="group" aria-label="Slides">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`wt-dot${i === index ? ' wt-dot--active' : ''}`}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => dispatch({ type: 'JUMP', index: i as SlideIndex })}
              />
            ))}
          </div>

          <div className="wt-footer-end">
            {!isLast && (
              <button type="button" className="wt-btn-primary" onClick={() => dispatch({ type: 'NEXT' })}>
                Next
              </button>
            )}
            {isLast && !inApp && (
              <button type="button" className="wt-btn-text" onClick={() => dispatch({ type: 'SKIP' })}>
                I&rsquo;ll explore myself
              </button>
            )}
            {isLast && (
              <button type="button" className="wt-btn-primary" onClick={() => dispatch({ type: 'START_TOUR' })}>
                {inApp ? 'Close' : 'Show me around'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntroSlides
