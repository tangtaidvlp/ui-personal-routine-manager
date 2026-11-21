import { MinusIcon, PlusIcon } from '../../../components/icons/index.ts'
import { useBoardZoom } from '../../settings/hooks/useUserSettings.ts'

const formatClock = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60).toString().padStart(2, '0')
  const m = Math.floor(normalized % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

/**
 * The timeline toolbar and time slider (extracted from EditingBoard for F007 R11), so one
 * toolbar can drive two boards side by side.
 *
 * @param {{
 *   clock?: import('../hooks/useBoardClock.ts').BoardClock | null,
 *   gapClearMode: boolean,
 *   onToggleGapClear: () => void,
 *   onResetDay: () => void,
 *   actions?: import('react').ReactNode,
 * }} props
 * `clock` null/undefined = no live clock (setup board): no readout, Pause or slider.
 */
function BoardToolbar({ clock = null, gapClearMode, onToggleGapClear, onResetDay, actions = null }) {
  // One zoom level shared by every board and saved to the account (specs/F006 FR-010, FR-011).
  const { zoom: zoomLevel, zoomIn, zoomOut, canZoomIn, canZoomOut } = useBoardZoom()

  const handleSliderChange = (event) => {
    clock.setIsLive(false)
    clock.setCurrentTime(parseInt(event.target.value, 10))
  }

  return (
    <>
      <div className="ob-board-toolbar">
        {clock && (
          <div className="ob-board-time">
            <strong>{formatClock(clock.currentTime)}</strong>
            {clock.isLive ? <span className="ui-pill ui-pill-success">Live</span> : <span className="ui-pill">Paused</span>}
          </div>
        )}
        <div className="ob-board-toolbar-controls">
          <div className="ob-board-zoom">
            <button
              type="button"
              className="ui-icon-btn"
              onClick={zoomOut}
              disabled={!canZoomOut}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <MinusIcon size={16} />
            </button>
            <span className="ob-board-zoom-label">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              className="ui-icon-btn"
              onClick={zoomIn}
              disabled={!canZoomIn}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <PlusIcon size={16} />
            </button>
          </div>
          {clock && (
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => clock.setIsLive((current) => !current)}>
              {clock.isLive ? 'Pause clock' : 'Resume live'}
            </button>
          )}
          <button
            type="button"
            className={['ui-btn', 'ui-btn-ghost', gapClearMode ? 'is-active' : ''].filter(Boolean).join(' ')}
            onClick={onToggleGapClear}
            aria-pressed={gapClearMode}
            title="When enabled, dragging a task pulls all tasks below it with it"
          >
            {gapClearMode ? '✓ Gap clear' : 'Gap clear'}
          </button>
          <button type="button" className="ui-btn ui-btn-ghost ob-board-btn-secondary" onClick={onResetDay}>
            Reset day
          </button>
          {actions ? (
            <>
              <span className="ob-board-toolbar-divider" aria-hidden="true" />
              {actions}
            </>
          ) : null}
        </div>
      </div>

      {clock && (
        <div className="ob-board-slider-wrap">
          <input
            type="range"
            min="0"
            max="1439"
            step="1"
            value={clock.currentTime}
            onChange={handleSliderChange}
            className="ob-board-slider"
            aria-label="Timeline current time"
          />
        </div>
      )}
    </>
  )
}

export default BoardToolbar
