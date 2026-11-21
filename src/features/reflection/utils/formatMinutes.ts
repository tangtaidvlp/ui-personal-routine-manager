/** "45m", "1h", "1h 30m". Negative input is formatted by its absolute value. */
export function formatMinutes(minutes: number): string {
  const total = Math.abs(Math.round(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Difference between actual and planned, phrased gently: "+30m", "−1h", "same as planned". */
export function formatDifference(actual: number, planned: number): string {
  const diff = actual - planned
  if (diff === 0) return 'same as planned'
  return `${diff > 0 ? '+' : '−'}${formatMinutes(diff)}`
}
