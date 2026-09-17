/**
 * The time left until a moment, as the top bar says it: "3d 4h", "4h 12m",
 * "12m". Shared, because the main process reports it and the renderer
 * keeps it moving on its own clock rather than asking again every minute.
 */
import { DAY_MS, splitDuration } from './time'

export function formatUntil(ms: number): string {
  const { days, hours, minutes } = splitDuration(ms)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/** From this hour on, a reset later in the day still leaves the day's evening. */
const EVENING_HOUR = 20

const startOfDay = (at: number): number => new Date(at).setHours(0, 0, 0, 0)

/**
 * The evenings left before the reset: the local calendar days from today
 * up to the reset, each one an evening the player can still use. "Reset in
 * 38 h" on a Monday at 21:00 is two evenings, tonight and tomorrow - the
 * figure the player counts in. Tonight counts until midnight; a reset
 * late in a day leaves that day's evening as well.
 */
export function eveningsUntil(now: number, resetAt: number): number {
  if (resetAt <= now) return 0
  // Rounded, so a clock change in between does not turn two days into one.
  const days = Math.round((startOfDay(resetAt) - startOfDay(now)) / DAY_MS)
  const late = new Date(resetAt).getHours() >= EVENING_HOUR
  return Math.max(days + (late ? 1 : 0), 0)
}
