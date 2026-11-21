import type { ComparisonItem, ReflectionView } from '../types/reflection.ts'
import { formatDifference, formatMinutes } from '../utils/formatMinutes.ts'
import { STATUS_CLASS, STATUS_LABEL } from './statusLabels.ts'

function timeRange(ref: { startTime: string; durationMinutes: number }): string {
  return `${ref.startTime} · ${formatMinutes(ref.durationMinutes)}`
}

function ItemRow({ item }: { item: ComparisonItem }) {
  const name = item.actual?.name ?? item.planned?.name ?? ''
  const renamed = item.planned && item.actual && item.planned.name !== item.actual.name
  return (
    <li className="rf-item">
      <span className={`rf-chip ${STATUS_CLASS[item.status]}`}>{STATUS_LABEL[item.status]}</span>
      <span className="rf-item-name">
        {name}
        {renamed ? <span className="rf-item-sub"> (planned as {item.planned!.name})</span> : null}
      </span>
      <span className="rf-item-times">
        {item.planned ? <span>Plan {timeRange(item.planned)}</span> : null}
        {item.actual && item.status !== 'AS_PLANNED' ? <span>Real {timeRange(item.actual)}</span> : null}
      </span>
    </li>
  )
}

/**
 * F007 FR-012b / FR-014: plan vs reality on one line (totals, difference, the four groups),
 * with the task-by-task breakdown collapsed underneath.
 */
function ReflectionSummaryStrip({ view }: { view: ReflectionView }) {
  const { comparison } = view
  const { counts } = comparison

  return (
    <section className="rf-strip" aria-label="Plan vs reality">
      <div className="rf-strip-line">
        <p className="rf-strip-totals">
          <span className="rf-total-label">Planned</span>
          <strong>{formatMinutes(comparison.plannedMinutes)}</strong>
          <span className="rf-strip-arrow" aria-hidden="true">→</span>
          <span className="rf-total-label">Reality</span>
          <strong>{formatMinutes(comparison.actualMinutes)}</strong>
          <span className="rf-total-sub">({formatDifference(comparison.actualMinutes, comparison.plannedMinutes)})</span>
        </p>
        <ul className="rf-counts" aria-label="Task summary">
          <li><span className="rf-chip rf-chip-as-planned">{counts.asPlanned} as planned</span></li>
          <li><span className="rf-chip rf-chip-changed">{counts.changed} changed</span></li>
          <li><span className="rf-chip rf-chip-skipped">{counts.skipped} skipped</span></li>
          <li><span className="rf-chip rf-chip-unplanned">{counts.unplanned} unplanned</span></li>
        </ul>
        {comparison.items.length > 0 ? (
          <details className="rf-details">
            <summary>Task by task</summary>
            <ul className="rf-items">
              {comparison.items.map((item, index) => (
                <ItemRow key={item.actual?.id ?? item.planned?.id ?? index} item={item} />
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </section>
  )
}

export default ReflectionSummaryStrip
