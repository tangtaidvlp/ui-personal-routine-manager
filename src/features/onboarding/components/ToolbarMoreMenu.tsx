import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'

/**
 * "More" disclosure for board tools that don't fit the toolbar (F010 US3). CSS shows it only when
 * the toolbar is narrow (container query in App.css). Closes on Escape (focus returns to "More"),
 * a pointer down outside, or picking a tool; tools inside `[data-keep-open]` (zoom) keep it open.
 * The panel opens to the right of "More" when it fits inside the toolbar, otherwise it lines up
 * with the right edge of "More": the board clips anything past its edges.
 */
function ToolbarMoreMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [alignEnd, setAlignEnd] = useState(false)
  const panelId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Pick the side before paint, from where "More" sits in the toolbar (not from the panel's own
  // position, so the choice doesn't flip back and forth).
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    const panel = panelRef.current
    const toolbar = wrapper?.closest('.ob-board-toolbar')
    if (!open || !wrapper || !panel || !toolbar) {
      return
    }
    const fitsRight = wrapper.getBoundingClientRect().left + panel.offsetWidth <= toolbar.getBoundingClientRect().right
    setAlignEnd(!fitsRight)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open && event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button') && !target.closest('[data-keep-open]')) {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="ob-board-more" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className="ui-btn ui-btn-ghost"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        More
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          className={alignEnd ? 'ob-board-more-panel is-end' : 'ob-board-more-panel'}
          onClick={handlePanelClick}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default ToolbarMoreMenu
