/**
 * The user's local clock time as "HH:mm" (24-hour), sent with every Buddy call so Buddy can match
 * the user's time of day (specs/.done.F015-context-aware-tone, contracts/buddy-local-time.md).
 */
export function currentLocalTime(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}
