import { useState } from 'react'
import EditingBoard from '../../board/components/EditingBoard.tsx'
import RadialBoard from '../../radial-view/components/RadialBoard.tsx'
import BoardToolbar from '../../board/components/BoardToolbar.tsx'
import { useBoardClock } from '../../board/hooks/useBoardClock.ts'
import { useSyncedScroll } from '../hooks/useSyncedScroll.ts'

/**
 * F007 FR-012 (wide screens): the Plan and Reality boards side by side under one toolbar.
 * Both are editable. One clock drives both now-lines, zoom is the shared account setting,
 * and scrolling one board scrolls the other, so the same times line up (research R11/R12).
 * `view` 'radial' (F016) swaps both boards for the 24-hour circle; zoom and Gap clear leave the toolbar.
 * Gap clear and Reset day act on the plan only (spec Assumptions; F012 FR-007).
 *
 * @param {{
 *   planRoutine: any,
 *   realityRoutine: any,
 *   planHandlers: {
 *     onRequestCreateTask: (draft: any) => void,
 *     onRequestEditTask: (task: any) => void,
 *     onPersistTaskChange: (tasks: any[]) => unknown,
 *     onToggleComplete?: (task: any) => Promise<unknown>,
 *     onRequestDeleteTask: (task: any) => unknown,
 *   },
 *   realityHandlers: {
 *     onRequestCreateTask: (draft: any) => void,
 *     onRequestEditTask: (task: any) => void,
 *     onPersistTaskChange: (tasks: any[]) => unknown,
 *     onRequestDeleteTask: (task: any) => unknown,
 *   },
 *   onAddPlan: () => void,
 *   onResetDay?: () => void,
 *   resetDisabled?: boolean,
 *   onAddReality: () => void,
 *   planActions?: import('react').ReactNode,
 *   toolbarActions?: import('react').ReactNode,
 *   view?: 'vertical' | 'radial',
 * }} props
 */
function CompareBoards({
  planRoutine,
  realityRoutine,
  planHandlers,
  realityHandlers,
  onAddPlan,
  onAddReality,
  onResetDay,
  resetDisabled = false,
  planActions = null,
  toolbarActions = null,
  view = 'vertical',
}) {
  const Board = view === 'radial' ? RadialBoard : EditingBoard
  const clock = useBoardClock()
  const [gapClearMode, setGapClearMode] = useState(false)
  const registerScroll = useSyncedScroll()

  return (
    <div className="rf-compare">
      <div className="rf-compare-toolbar">
        <BoardToolbar
          clock={clock}
          gapClearMode={gapClearMode}
          onToggleGapClear={() => setGapClearMode((current) => !current)}
          onResetDay={onResetDay}
          resetDisabled={resetDisabled}
          actions={toolbarActions}
          boardTools={view !== 'radial'}
        />
      </div>

      <div className="rf-compare-grid">
        <section className="rf-compare-col" aria-label="Plan" data-board="plan">
          <header className="rf-compare-head">
            <h2 className="rf-compare-title">Plan</h2>
            <div className="rf-compare-actions">
              {planActions}
              <button type="button" className="ui-btn ui-btn-ghost" onClick={onAddPlan}>
                Add to plan
              </button>
            </div>
          </header>
          <Board
            label="Plan"
            routine={planRoutine}
            showToolbar={false}
            clock={clock}
            gapClearMode={gapClearMode}
            scrollContainerRef={registerScroll}
            {...planHandlers}
          />
        </section>

        <section className="rf-compare-col rf-compare-col-reality" aria-label="Reality" data-board="reality">
          <header className="rf-compare-head">
            <h2 className="rf-compare-title">Reality</h2>
            <div className="rf-compare-actions">
              <button type="button" className="ui-btn ui-btn-primary" onClick={onAddReality}>
                Add to reality
              </button>
            </div>
          </header>
          <Board
            label="Reality"
            routine={realityRoutine}
            showToolbar={false}
            clock={clock}
            gapClearMode={false}
            showCompletion={false}
            scrollContainerRef={registerScroll}
            {...realityHandlers}
          />
        </section>
      </div>
    </div>
  )
}

export default CompareBoards
