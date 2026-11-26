export type LaneBlock = { key: string; start: number; end: number }
export type Lane = { lane: number; lanes: number }

/**
 * Side-by-side lanes for overlapping blocks (T002 R6). A cluster is a run of transitively
 * overlapping blocks; each block takes the first lane that is free, and `lanes` is how many the
 * cluster needs. Touching ends don't overlap.
 */
export function layoutLanes(blocks: LaneBlock[]): Map<string, Lane> {
  const result = new Map<string, Lane>()
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end)

  let cluster: { key: string; lane: number }[] = []
  let laneEnds: number[] = []
  const flush = () => {
    for (const item of cluster) result.set(item.key, { lane: item.lane, lanes: laneEnds.length })
    cluster = []
    laneEnds = []
  }

  for (const block of sorted) {
    if (cluster.length > 0 && block.start >= Math.max(...laneEnds)) flush()
    let lane = laneEnds.findIndex((end) => end <= block.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = block.end
    cluster.push({ key: block.key, lane })
  }
  flush()
  return result
}
