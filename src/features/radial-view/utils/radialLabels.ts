/** Pure label placement around the radial 24h clock (specs/F016 research R3). Angles: 0 = midnight at the top, clockwise. */

export type LabelSide = 'left' | 'right'
export type LabelPlacement = { id: string; side: LabelSide; y: number }

type LabelOptions = {
  cy: number
  /** Radius of the ring the labels sit on. */
  ringRadius: number
  slotHeight: number
  gap: number
  /** Vertical range the labels should stay in (top of the first slot, bottom of the last). */
  top: number
  bottom: number
}

/** A label only switches to the other side when its angle is this close to midnight or noon (short leader). */
export const MAX_MOVE_DEGREES = 30

/**
 * Right half (0–180°) labels go right, the rest left, each at the height of its angle on the ring.
 * A side with more labels than fit hands its labels nearest the top/bottom to the other side.
 * Overlapping labels form clusters centred on their ideal heights; a column is kept inside [top, bottom]
 * when it fits, else centred on that range (the caller grows the chart evenly).
 */
export function layoutLabels(items: { id: string; angle: number }[], opts: LabelOptions): LabelPlacement[] {
  const { cy, ringRadius, slotHeight, gap, top, bottom } = opts
  const step = slotHeight + gap
  const capacity = Math.max(1, Math.floor((bottom - top + gap) / step))

  const labels = items.map((item) => ({
    id: item.id,
    angle: item.angle,
    side: (item.angle < 180 ? 'right' : 'left') as LabelSide,
    ideal: cy - ringRadius * Math.cos((item.angle * Math.PI) / 180) - slotHeight / 2,
    y: 0,
  }))

  const distanceToSplit = (angle: number) => Math.min(angle, Math.abs(180 - angle), 360 - angle)
  for (const [from, to] of [['right', 'left'], ['left', 'right']] as const) {
    const crowded = labels.filter((l) => l.side === from)
    let room = capacity - labels.filter((l) => l.side === to).length
    let excess = crowded.length - capacity
    const movable = crowded
      .filter((l) => distanceToSplit(l.angle) <= MAX_MOVE_DEGREES)
      .sort((a, b) => distanceToSplit(a.angle) - distanceToSplit(b.angle))
    for (const label of movable) {
      if (excess <= 0 || room <= 0) break
      label.side = to
      excess--
      room--
    }
  }

  for (const side of ['left', 'right'] as const) {
    const column = labels.filter((l) => l.side === side).sort((a, b) => a.ideal - b.ideal)
    if (column.length === 0) continue

    // Cluster merging: each cluster sits where its members' ideal heights average out.
    const clusters: { start: number; members: typeof column }[] = []
    for (const label of column) {
      clusters.push({ start: label.ideal, members: [label] })
      while (clusters.length > 1) {
        const last = clusters[clusters.length - 1]
        const prev = clusters[clusters.length - 2]
        if (prev.start + prev.members.length * step <= last.start) break
        const members = [...prev.members, ...last.members]
        const start = members.reduce((sum, m, i) => sum + m.ideal - i * step, 0) / members.length
        clusters.splice(clusters.length - 2, 2, { start, members })
      }
    }
    let index = 0
    const ys: number[] = []
    for (const cluster of clusters) {
      cluster.members.forEach((_, i) => ys.push(cluster.start + i * step))
    }

    const total = column.length * step - gap
    if (total <= bottom - top) {
      // Push down from the top, then back up from the bottom, never overlapping.
      for (let i = 0; i < ys.length; i++) ys[i] = Math.max(ys[i], i > 0 ? ys[i - 1] + step : top)
      for (let i = ys.length - 1; i >= 0; i--) ys[i] = Math.min(ys[i], i < ys.length - 1 ? ys[i + 1] - step : bottom - slotHeight)
    } else {
      const first = (top + bottom) / 2 - total / 2
      ys.forEach((_, i) => (ys[i] = first + i * step))
    }
    for (const label of column) label.y = ys[index++]
  }

  return labels.map(({ id, side, y }) => ({ id, side, y }))
}

/**
 * x of a label box's inner edge so the box sits just outside the ring: the edge follows the ring at the
 * height of the box's nearest point to the centre (the box never enters the ring).
 */
export function labelEdgeX(opts: { cx: number; cy: number; ringRadius: number; side: LabelSide; y: number; slotHeight: number }): number {
  const { cx, cy, ringRadius, side, y, slotHeight } = opts
  const d = y <= cy && cy <= y + slotHeight ? 0 : Math.min(Math.abs(y - cy), Math.abs(y + slotHeight - cy))
  const dx = Math.sqrt(Math.max(0, ringRadius * ringRadius - d * d))
  return side === 'right' ? cx + dx : cx - dx
}
