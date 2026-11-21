import { useState } from 'react'
import EditingBoard from '../../onboarding/components/EditingBoard.jsx'
import BoardToolbar from '../../onboarding/components/BoardToolbar.jsx'
import { useBoardClock } from '../../onboarding/hooks/useBoardClock.ts'
import { useSyncedScroll } from '../hooks/useSyncedScroll.ts'

/**
 * F007 FR-012 (wide screens): the Plan and Reality boards side by side under one toolbar.
 * Both are editable. One clock drives both now-lines, zoom is the shared account setting,
 * and scrolling one board scrolls the other, so the same times line up (research R11/R12).
 * Gap clear and Reset day act on the plan only (spec Assumptions).
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
 *   onAddReality: () => void,
 *   planActions?: import('react').ReactNode,
 *   toolbarActions?: import('react').ReactNode,
 * }} props
 */
function CompareBoards({
  planRoutine,
  realityRoutine,
  planHandlers,
  realityHandlers,
  onAddPlan,
  onAddReality,
  planActions = null,
  toolbarActions = null,
}) {
  const clock = useBoardClock()
  const [gapClearMode, setGapClearMode] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const registerScroll = useSyncedScroll()

  return (
    <div className="rf-compare">
      <div className="rf-compare-toolbar">
        <BoardToolbar
          clock={clock}
          gapClearMode={gapClearMode}
          onToggleGapClear={() => setGapClearMode((current) => !current)}
          onResetDay={() => setResetSignal((current) => current + 1)}
          actions={toolbarActions}
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
          <EditingBoard
            routine={planRoutine}
            showToolbar={false}
            clock={clock}
            gapClearMode={gapClearMode}
            resetSignal={resetSignal}
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
          <EditingBoard
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
