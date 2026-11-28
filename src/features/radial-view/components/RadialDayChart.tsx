import { useMemo, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { usePalette } from '../../palette/hooks/usePalette.ts'
import { resolveTaskColor } from '../../palette/utils/taskColor.ts'
import {
  MINUTES_PER_DAY,
  angleAt,
  annulusPath,
  angleDelta,
  arcPath,
  assignLanes,
  findNowAndNext,
  laneBand,
  minutesToAngle,
  parseStartMinutes,
  pointAt,
} from '../utils/radialGeometry.ts'
import { formatDuration } from '../utils/radialFormat.ts'
import { labelEdgeX, layoutLabels, type LabelSide } from '../utils/radialLabels.ts'
import { mayCrossMidnight } from '../../board/utils/overnight.ts'
import { MoonIcon, SunIcon } from './DayNightIcons.tsx'
import styles from './RadialDayChart.module.css'

/** What the chart reads from a routine, daily or reflection task. */
export type RadialTask = {
  id?: string
  name: string
  description?: string
  startTime: string
  durationMinutes: number
  color?: string | null
  completed?: boolean
}

type RadialDayChartProps<T extends RadialTask> = {
  tasks: T[]
  /** Accessible name of the chart, e.g. "Plan". Shown in the clock centre when there is no live clock. */
  label: string
  /** Absent = view-only: labels are plain text and arcs are not clickable. */
  onTaskClick?: (task: T) => void
  /** Drag an arc round the clock to move the task (5-minute steps). Absent = arcs only click. */
  onMoveTask?: (task: T, startMinutes: number) => Promise<unknown> | void
  showCompletion?: boolean
  /** Live clock in minutes since midnight: centre time and task, now hand and the current task's label filled in its colour. Absent = setup board. */
  currentTime?: number
  /** Size of the board area the chart is centred in (measured by the parent). Height 0 = unknown. */
  width: number
  height: number
}

// Layout in CSS pixels (research R2; design resources/radial-24h-*-elegant.png). Text never shrinks; the clock does.
const PAD = 16
const OUTER_BAND = 32 // outside the track: hour ticks and numbers
const SLOT_HEIGHT = 40
const LABEL_GAP = 4
const LABEL_RING = 1.2 // labels sit on a ring of 1.2 x the clock radius (at least clear of the hour numbers)
const MIN_RADIUS = 48
const MAX_RADIUS = 240
// Below this clock radius, labels around the ring would squeeze the clock: list the tasks under it instead.
const MIN_RING_RADIUS = 100
const ALL_NUMBERS_FROM_RADIUS = 80
const CENTRE_DETAILS_FROM = 64 // centre disc radius needed for the "until" line under the current task
const DISC_RATIO = 0.62 // centre disc radius / clock radius (T004 sketch: 123 of 200)
const MIN_BAND_FOR_ICONS = 22 // day/night band width needed for the sun and moon
const MIN_BAND_FOR_LABELS = 36 // ... and for "NIGHT" / "DAY" under them
const MINOR_TICKS_FROM_RADIUS = 90
const ARC_CORNER = 3 // corner radius of a task piece (px)
const ARC_GAP = 1.5 // empty space at each end of a task piece, so touching tasks stay apart (px)
const MIN_SWEEP = 0.01 // a task too short for its corners is a small block of 2 x ARC_CORNER

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))
const SNAP_MINUTES = 5
const CLICK_DISTANCE_PX = 4
const snapToDay = (minutes: number) =>
  (((Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY

type DragState = {
  id: string
  pointerId: number
  startX: number
  startY: number
  lastAngle: number
  turned: number // degrees turned since the grab, summed so a drag can pass midnight
  original: number
  live: number
}

const formatTime = (minutes: number) => {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const h = Math.floor(normalized / 60).toString().padStart(2, '0')
  const m = (normalized % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

function RadialDayChart<T extends RadialTask>({
  tasks,
  label,
  onTaskClick,
  onMoveTask,
  showCompletion = false,
  currentTime,
  width,
  height: boardHeight,
}: RadialDayChartProps<T>) {
  const { palette } = usePalette()
  const [drag, setDrag] = useState<DragState | null>(null)
  // A dropped task keeps its new place until the saved tasks come back (tasks prop changes).
  const [dropped, setDropped] = useState<{ id: string; start: number; tasks: T[] } | null>(null)
  const override = drag ? { id: drag.id, start: drag.live } : dropped && dropped.tasks === tasks ? dropped : null

  const items = useMemo(
    () =>
      tasks
        .flatMap((task) => {
          const parsed = parseStartMinutes(task.startTime)
          if (!task.id || parsed === null) return []
          const start = override?.id === task.id ? override.start : parsed
          return [{ task, id: task.id, start, duration: clamp(task.durationMinutes, 1, MINUTES_PER_DAY) }]
        })
        .sort((a, b) => a.start - b.start),
    [tasks, override?.id, override?.start],
  )

  const layout = useMemo(() => {
    if (width <= 0) return null

    // Labels on a ring: the ring radius that fits, then the clock radius under it.
    const column = clamp(0.22 * width, 170, 200)
    const ringFit = Math.min(
      (width - 2 * column - 2 * PAD) / 2,
      boardHeight > 0 ? (boardHeight - 2 * PAD - SLOT_HEIGHT) / 2 : Infinity,
    )
    const ringRadiusFor = (r: number) => Math.max(LABEL_RING * r, r + OUTER_BAND)
    const ringClock = Math.min(ringFit / LABEL_RING, ringFit - OUTER_BAND, MAX_RADIUS)
    const stacked = ringClock < MIN_RING_RADIUS

    const radius = stacked ? clamp((width - 2 * PAD) / 2 - OUTER_BAND, MIN_RADIUS, MAX_RADIUS) : ringClock
    const ringRadius = ringRadiusFor(radius)
    let cx: number
    let cy: number
    let boxWidth: number
    let boxHeight: number
    let placed: { id: string; side: LabelSide; y: number }[] = []
    if (stacked) {
      boxWidth = boxHeight = 2 * (radius + OUTER_BAND)
      cx = cy = boxWidth / 2
    } else {
      boxWidth = width - 2 * PAD
      cx = boxWidth / 2
      cy = ringRadius + SLOT_HEIGHT / 2
      const top = 0
      const bottom = 2 * cy
      placed = layoutLabels(
        items.map((item) => ({ id: item.id, angle: minutesToAngle(item.start + item.duration / 2) })),
        { cy, ringRadius, slotHeight: SLOT_HEIGHT, gap: LABEL_GAP, top, bottom },
      )
      // Labels that had to spill past the ring range grow the box evenly, so the clock stays its centre.
      const minY = Math.min(top, ...placed.map((p) => p.y))
      const maxY = Math.max(bottom, ...placed.map((p) => p.y + SLOT_HEIGHT))
      const extra = Math.max(top - minY, maxY - bottom)
      cy += extra
      placed = placed.map((p) => ({ ...p, y: p.y + extra }))
      boxHeight = 2 * cy
    }

    const track = clamp(0.11 * radius, 10, 24)
    const discRadius = DISC_RATIO * radius
    const bandWidth = radius - track - discRadius
    const showIcons = bandWidth >= MIN_BAND_FOR_ICONS
    const showLabels = bandWidth >= MIN_BAND_FOR_LABELS
    // Icon and label sit near the outer edge of their half (night: top, day: bottom), as in the sketch;
    // without the label the icon is centred in the band.
    const iconSize = clamp(bandWidth * 0.35, 14, 24)
    const nightIcon = pointAt(cx, cy, radius - track - bandWidth * (showLabels ? 0.35 : 0.5), 0)
    const nightText = pointAt(cx, cy, radius - track - bandWidth * 0.72, 0)
    const dayIcon = pointAt(cx, cy, radius - track - bandWidth * (showLabels ? 0.63 : 0.5), 180)
    const dayText = pointAt(cx, cy, radius - track - bandWidth * 0.26, 180)
    const { lanes, laneCount } = assignLanes(items)
    const arcs = items.map((item, index) => {
      const band = laneBand(lanes.get(item.id) ?? 0, laneCount, radius - track, radius)
      const r = (band.inner + band.outer) / 2
      const thickness = Math.max(2, band.outer - band.inner - 2)
      const sweep = (item.duration / MINUTES_PER_DAY) * 360
      const startAngle = minutesToAngle(item.start)
      const midAngle = minutesToAngle(item.start + item.duration / 2)
      // A ring segment inset by the corner radius, stroked 2 x corner with round joins (CSS): the outline keeps
      // the task's time and lane, with corners rounded by `corner`.
      const corner = Math.min(ARC_CORNER, thickness / 2)
      const strokeWidth = 2 * corner
      const inset = ((ARC_GAP + corner) / r) * (180 / Math.PI)
      const inner = r - thickness / 2 + corner
      const outer = r + thickness / 2 - corner
      const path =
        sweep >= 360
          ? annulusPath(cx, cy, inner, outer, 0, 360)
          : sweep - 2 * inset > 0
            ? annulusPath(cx, cy, inner, outer, startAngle + inset, sweep - 2 * inset)
            : annulusPath(cx, cy, inner, outer, midAngle - MIN_SWEEP / 2, MIN_SWEEP)

      let labelBox: { side: LabelSide; left: number; top: number } | null = null
      let leader: string | null = null
      if (!stacked) {
        const { side, y } = placed[index]
        const x = labelEdgeX({ cx, cy, ringRadius, side, y, slotHeight: SLOT_HEIGHT })
        labelBox = { side, left: side === 'right' ? x : x - column, top: y }
        const from = pointAt(cx, cy, band.outer, midAngle)
        const elbow = pointAt(cx, cy, radius + OUTER_BAND, midAngle)
        leader = [from, elbow, { x, y: y + SLOT_HEIGHT / 2 }].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      }
      return {
        ...item,
        strokeWidth,
        labelBox,
        leader,
        path,
      }
    })

    const marks = Array.from({ length: 24 }, (_, hour) => {
      const angle = hour * 15
      const major = hour % 6 === 0
      const half = major ? '' : hour > 6 && hour < 18 ? styles.day : styles.night
      return {
        hour,
        major,
        half,
        pill: hour === 6 || hour === 18,
        tickFrom: pointAt(cx, cy, radius + 4, angle),
        tickTo: pointAt(cx, cy, radius + (major ? 12 : 9), angle),
        text: pointAt(cx, cy, radius + 21, angle),
        showNumber: major || radius >= ALL_NUMBERS_FROM_RADIUS,
        minor: radius >= MINOR_TICKS_FROM_RADIUS
          ? [1, 2, 3].map((quarter) => ({
              from: pointAt(cx, cy, radius + 4, angle + quarter * 3.75),
              to: pointAt(cx, cy, radius + 6.5, angle + quarter * 3.75),
            }))
          : [],
      }
    })

    return { stacked, column, radius, cx, cy, boxWidth, boxHeight, track, discRadius, showIcons, showLabels, iconSize, nightIcon, nightText, dayIcon, dayText, arcs, marks }
  }, [items, width, boardHeight])

  if (!layout) return <figure className="rv-chart" aria-label={label} data-board-view="radial" />

  const live = currentTime !== undefined
  const { current, minutesLeft, next } = live ? findNowAndNext(items, currentTime) : { current: null, minutesLeft: 0, next: null }
  const { cx, cy, radius, track, discRadius } = layout
  const nowAngle = live ? minutesToAngle(currentTime) : 0
  const handFrom = pointAt(cx, cy, discRadius, nowAngle)
  const handTo = pointAt(cx, cy, radius + 4, nowAngle)
  const knob = pointAt(cx, cy, radius - track / 2, nowAngle)
  const details = discRadius >= CENTRE_DETAILS_FROM

  // Stable DOM order: moving the dragged element in the DOM would release its pointer capture.
  const svgArcs = [...layout.arcs].sort((a, b) => a.id.localeCompare(b.id))
  const pointerAngle = (event: PointerEvent<SVGElement>) => {
    const rect = (event.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect()
    return rect ? angleAt(rect.left + cx, rect.top + cy, event.clientX, event.clientY) : 0
  }
  const dragHandlers = (task: T, id: string, start: number) =>
    onMoveTask
      ? {
          onPointerDown: (event: PointerEvent<SVGElement>) => {
            if (event.button !== 0) return
            event.currentTarget.setPointerCapture(event.pointerId)
            const angle = pointerAngle(event)
            setDrag({ id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastAngle: angle, turned: 0, original: start, live: start })
          },
          onPointerMove: (event: PointerEvent<SVGElement>) => {
            if (!drag || drag.pointerId !== event.pointerId) return
            const angle = pointerAngle(event)
            const turned = drag.turned + angleDelta(drag.lastAngle, angle)
            const live = snapToDay(drag.original + (turned / 360) * MINUTES_PER_DAY)
            // With overnight tasks off, a task that ends by 24:00 stays within the day (featureFlags).
            const latest = mayCrossMidnight(drag.original, task.durationMinutes) ? live : MINUTES_PER_DAY - task.durationMinutes
            setDrag({ ...drag, lastAngle: angle, turned, live: Math.min(live, latest) })
          },
          onPointerUp: (event: PointerEvent<SVGElement>) => {
            if (!drag || drag.pointerId !== event.pointerId) return
            setDrag(null)
            if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < CLICK_DISTANCE_PX) {
              onTaskClick?.(task)
            } else if (drag.live !== drag.original) {
              const { live } = drag
              setDropped({ id, start: live, tasks })
              // A failed save drops the unsaved position (the board reports the error).
              Promise.resolve(onMoveTask(task, live)).catch(() =>
                setDropped((d) => (d?.id === id && d.start === live ? null : d)),
              )
            }
          },
          onPointerCancel: () => setDrag(null),
          // Pointerup comes first and clears the drag, so only a capture lost mid-drag gets here.
          onLostPointerCapture: (event: PointerEvent<SVGElement>) => {
            if (drag && drag.pointerId === event.pointerId) setDrag(null)
          },
        }
      : { onClick: onTaskClick ? () => onTaskClick(task) : undefined }

  const taskLabel = (item: (typeof layout.arcs)[number], extraClass: string, style: CSSProperties): ReactNode => {
    const done = showCompletion && Boolean(item.task.completed)
    const isNow = current?.id === item.id
    const status = isNow ? 'Now' : done ? 'Done' : null
    const end = formatTime(item.start + item.duration)
    const duration = formatDuration(item.duration)
    const speech = `${item.task.name}, ${formatTime(item.start)} to ${end}, ${duration}${status ? `, ${status.toLowerCase()}` : ''}`
    const content = (
      <>
        <span className="rv-row-text">
          <span className="rv-name-line">
            <span className="rv-name">{item.task.name}</span>
            {/* The current task shows by its colour fill, so only Done gets a badge (screen readers still hear "now"). */}
            {status === 'Done' ? <span className="rv-badge">Done</span> : null}
          </span>
          <span className="rv-time">{`${formatTime(item.start)} – ${end} · ${duration}`}</span>
        </span>
      </>
    )
    return (
      <li
        key={item.id}
        className={['rv-item', extraClass, isNow ? 'is-now' : '', done ? 'is-done' : ''].filter(Boolean).join(' ')}
        style={{ ...(resolveTaskColor(item.task.color, palette) as CSSProperties), ...style }}
      >
        {onTaskClick ? (
          <button type="button" className="rv-row" aria-label={speech} title={item.task.name} onClick={() => onTaskClick(item.task)}>
            {content}
          </button>
        ) : (
          <span className="rv-row" title={item.task.name}>
            {content}
          </span>
        )}
      </li>
    )
  }

  return (
    <figure className={`rv-chart ${layout.stacked ? 'is-stacked' : 'is-ring'}`} aria-label={label} data-board-view="radial">
      <div className="rv-clock" style={{ width: layout.boxWidth, height: layout.boxHeight }}>
        <svg className="rv-svg" width={layout.boxWidth} height={layout.boxHeight} aria-hidden="true">
          <path className={styles.bandNight} d={annulusPath(cx, cy, discRadius, radius - track, 270, 180)} />
          <path className={styles.bandDay} d={annulusPath(cx, cy, discRadius, radius - track, 90, 180)} />
          <path className={styles.trackNight} d={arcPath(cx, cy, radius - track / 2, 270, 180)} strokeWidth={track} />
          <path className={styles.trackDay} d={arcPath(cx, cy, radius - track / 2, 90, 180)} strokeWidth={track} />
          {layout.showIcons ? (
            <>
              <MoonIcon className={styles.moon} x={layout.nightIcon.x} y={layout.nightIcon.y} size={layout.iconSize} />
              <SunIcon className={styles.sun} x={layout.dayIcon.x} y={layout.dayIcon.y} size={layout.iconSize} />
            </>
          ) : null}
          {layout.showLabels ? (
            <>
              <text className={styles.nightLabel} x={layout.nightText.x} y={layout.nightText.y} textAnchor="middle" dominantBaseline="central">
                NIGHT
              </text>
              <text className={styles.dayLabel} x={layout.dayText.x} y={layout.dayText.y} textAnchor="middle" dominantBaseline="central">
                DAY
              </text>
            </>
          ) : null}
          {layout.arcs.map((arc) =>
            arc.leader ? (
              <polyline
                key={arc.id}
                className="rv-leader"
                points={arc.leader}
                style={resolveTaskColor(arc.task.color, palette) as CSSProperties}
              />
            ) : null,
          )}
          {svgArcs.map((arc) => {
            const done = showCompletion && arc.task.completed
            const props = {
              className: [
                'rv-arc',
                done ? 'is-done' : '',
                onTaskClick ? 'is-clickable' : '',
                onMoveTask ? 'is-draggable' : '',
                drag?.id === arc.id ? 'is-dragging' : '',
              ]
                .filter(Boolean)
                .join(' '),
              style: resolveTaskColor(arc.task.color, palette) as CSSProperties,
              ...dragHandlers(arc.task, arc.id, arc.start),
            }
            return <path key={arc.id} {...props} d={arc.path} strokeWidth={arc.strokeWidth} />
          })}
          {layout.marks.map((mark) => (
            <g key={mark.hour}>
              {mark.minor.map((tick, index) => (
                <line key={index} className={`rv-tick ${styles.minor} ${mark.half}`} x1={tick.from.x} y1={tick.from.y} x2={tick.to.x} y2={tick.to.y} />
              ))}
              {mark.pill && mark.showNumber ? (
                <rect className={styles.pill} x={mark.text.x - 12} y={mark.text.y - 10} width={24} height={20} rx={10} />
              ) : null}
              <line
                className={`rv-tick${mark.major ? ' is-major' : ''} ${mark.half}`}
                x1={mark.tickFrom.x}
                y1={mark.tickFrom.y}
                x2={mark.tickTo.x}
                y2={mark.tickTo.y}
              />
              {mark.showNumber ? (
                <text
                  className={`rv-hour${mark.major ? ' is-major' : ''} ${mark.half}`}
                  x={mark.text.x}
                  y={mark.text.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {mark.hour.toString().padStart(2, '0')}
                </text>
              ) : null}
            </g>
          ))}
          {live ? (
            <>
              <line className="rv-hand" x1={handFrom.x} y1={handFrom.y} x2={handTo.x} y2={handTo.y} />
              <circle className="rv-knob" cx={knob.x} cy={knob.y} r={clamp(track * 0.35, 4, 7)} />
            </>
          ) : null}
        </svg>

        <div
          className="rv-centre"
          style={{
            left: cx,
            top: cy,
            width: 2 * discRadius,
            height: 2 * discRadius,
          }}
        >
          {live ? (
            <>
              <span className="rv-centre-time" style={{ fontSize: clamp(discRadius * 0.42, 18, 56) }}>
                {formatTime(currentTime)}
              </span>
              <span
                className="rv-centre-task"
                style={current ? (resolveTaskColor(current.task.color, palette) as CSSProperties) : undefined}
              >
                {current ? <span className="rv-dot" aria-hidden="true" /> : null}
                <span className="rv-centre-task-name">{current ? current.task.name : 'Free time'}</span>
              </span>
              {details ? (
                <>
                  <span className="rv-centre-note">
                    {current
                      ? `until ${formatTime(current.start + current.duration)} · ${formatDuration(minutesLeft)} left`
                      : next
                        ? `next: ${next.task.name} at ${formatTime(next.start)}`
                        : null}
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <span className="rv-centre-day">{label}</span>
          )}
        </div>

        {!layout.stacked && layout.arcs.length > 0 ? (
          <ul className="rv-labels">
            {layout.arcs.map((arc) =>
              arc.labelBox
                ? taskLabel(arc, `rv-${arc.labelBox.side}`, {
                    left: arc.labelBox.left,
                    top: arc.labelBox.top,
                    width: layout.column,
                    height: SLOT_HEIGHT,
                  })
                : null,
            )}
          </ul>
        ) : null}
      </div>

      {layout.stacked && layout.arcs.length > 0 ? (
        <ul className="rv-list">{layout.arcs.map((arc) => taskLabel(arc, 'rv-stack', {}))}</ul>
      ) : null}
    </figure>
  )
}

export default RadialDayChart
