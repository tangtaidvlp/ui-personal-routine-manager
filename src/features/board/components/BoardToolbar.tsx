import type { ReactNode } from 'react'
import styles from './BoardToolbar.module.css'
import { MinusIcon, PlusIcon } from '../../../components/icons/index.ts'
import { useBoardZoom } from '../../settings/hooks/useUserSettings.ts'
import ToolbarMoreMenu from './ToolbarMoreMenu.tsx'
import type { BoardClock } from '../hooks/useBoardClock.ts'

const formatClock = (minutes: number) => {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(normalized / 60).toString().padStart(2, '0')
  const m = Math.floor(normalized % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

type BoardToolbarProps = {
  /** null/undefined = no live clock (setup board): no readout. */
  clock?: BoardClock | null
  gapClearMode: boolean
  onToggleGapClear: () => void
  /** Absent = no Reset day button (setup boards, F012 FR-009). */
  onResetDay?: () => void
  /** Greys Reset day out (past days). */
  resetDisabled?: boolean
  /** Always visible, at the right end. */
  actions?: ReactNode
  menuActions?: ReactNode
  /** Default true (F016): false leaves out zoom and Gap clear, which only act on the timeline (radial view). */
  boardTools?: boolean
}

/**
 * The timeline toolbar (extracted from EditingBoard for F007 R11), so one toolbar can drive two
 * boards side by side. The clock is always live: no pause or time slider (F010).
 *
 * Secondary tools (zoom, Gap clear, Reset day, `menuActions`) show inline when the toolbar is wide
 * and fold into a "More" menu when it is narrow (F010 US3, container query in App.css). They are
 * rendered in both places; CSS shows exactly one. `actions` always stay visible.
 */
function BoardToolbar({
  clock = null,
  gapClearMode,
  onToggleGapClear,
  onResetDay,
  resetDisabled = false,
  actions = null,
  menuActions = null,
  boardTools = true,
}: BoardToolbarProps) {
  // One zoom level shared by every board and saved to the account (specs/F006 FR-010, FR-011).
  const { zoom: zoomLevel, zoomIn, zoomOut, canZoomIn, canZoomOut } = useBoardZoom()

  const hasTools = Boolean(boardTools || onResetDay || menuActions)

  const secondaryTools = (inMenu: boolean) => (
    <>
      {boardTools && (
        <>
          <div className="ob-board-zoom" data-keep-open={inMenu ? '' : undefined}>
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
          <button
            type="button"
            className={['ui-btn', 'ui-btn-ghost', gapClearMode ? 'is-active' : ''].filter(Boolean).join(' ')}
            onClick={onToggleGapClear}
            aria-pressed={gapClearMode}
            title="When enabled, dragging a task pulls all tasks below it with it"
          >
            {gapClearMode ? '✓ Gap clear' : 'Gap clear'}
          </button>
        </>
      )}
      {onResetDay && (
        <button
          type="button"
          className="ui-btn ui-btn-ghost ob-board-btn-secondary"
          onClick={onResetDay}
          disabled={resetDisabled}
        >
          Reset day
        </button>
      )}
      {menuActions}
    </>
  )

  return (
    <div className="ob-board-toolbar">
      {clock && (
        <div className={styles.time}>
          <strong>{formatClock(clock.currentTime)}</strong>
          <span className="ui-pill ui-pill-success">Live</span>
        </div>
      )}
      <div className={styles.controls}>
        {hasTools && (
          <>
            <div className="ob-board-tools-inline">{secondaryTools(false)}</div>
            <ToolbarMoreMenu>{secondaryTools(true)}</ToolbarMoreMenu>
          </>
        )}
        {actions ? (
          <>
            <span className={styles.divider} aria-hidden="true" />
            {actions}
          </>
        ) : null}
      </div>
    </div>
  )
}

export default BoardToolbar
