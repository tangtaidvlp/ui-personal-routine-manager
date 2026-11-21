import { useEffect, useId } from 'react'
import type { ComparisonItem } from '../types/reflection.ts'
import { formatMinutes } from '../utils/formatMinutes.ts'
import { STATUS_CLASS, STATUS_LABEL } from './statusLabels.ts'

type Props = {
  /** The comparison row of the tapped reality task; null = closed. */
  item: ComparisonItem | null
  onEdit: () => void
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rf-popup-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** F007 FR-012a: on narrow screens, tapping a reality task shows how it compares to the plan. */
function ReflectionTaskPopup({ item, onEdit, onClose }: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!item) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item || !item.actual) {
    return null
  }
  const { planned, actual, status } = item
  const renamed = planned && planned.name !== actual.name

  return (
    <div className="ob-modal-backdrop" onClick={onClose}>
      <div
        className="ob-modal rf-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ob-modal-header">
          <h2 id={titleId}>{actual.name}</h2>
          <span className={`rf-chip ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
        </div>
        <div className="ob-modal-body">
          {renamed ? <p className="rf-popup-sub">Planned as {planned.name}</p> : null}
          <dl className="rf-popup-grid">
            {planned ? <Row label="Plan" value={`${planned.startTime} · ${formatMinutes(planned.durationMinutes)}`} /> : null}
            <Row label="Reality" value={`${actual.startTime} · ${formatMinutes(actual.durationMinutes)}`} />
          </dl>
          {status === 'UNPLANNED' ? <p className="rf-popup-sub">Not in your plan — nice that you made room for it.</p> : null}
          <div className="ob-modal-actions">
            <button type="button" className="ob-modal-btn ob-modal-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="ob-modal-btn ob-modal-btn-primary" onClick={onEdit}>
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReflectionTaskPopup
