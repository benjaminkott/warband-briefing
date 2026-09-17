/**
 * A series of readings over time: one point per sync, kept only where it
 * says something new, thinned to one a day once it is old. The gold history
 * and the character history are two of these, with their own idea of what
 * "the same reading" is and how many points to keep - the rule for keeping
 * and thinning is one.
 */

import { DAY_MS } from './time'

/** What every point of a series has: the moment it was read. */
export interface Timed {
  at: number
}

/** Every reading is kept for this long; older ones are thinned to one per day. */
export const FULL_RESOLUTION_DAYS = 14

/**
 * Adds one reading to a series.
 *
 * A sync runs every few minutes and most of them find the same numbers, so
 * an unchanged stretch is stored as its two ends only: the point where the
 * figure last changed, and the latest reading that still says the same.
 * That keeps the line honest - it starts where the change happened -
 * without one point per sync forever. A clock that went backwards would put
 * the series out of order, so an older reading is dropped.
 */
export function appendReading<T extends Timed>(series: T[], point: T, same: (a: T, b: T) => boolean): T[] {
  const last = series[series.length - 1]
  if (!last) return [point]
  if (point.at <= last.at) return series
  if (!same(last, point)) return [...series, point]

  const previous = series[series.length - 2]
  if (previous && same(previous, last)) return [...series.slice(0, -1), point]
  return [...series, point]
}

/** Local calendar day of a timestamp - the day the player experienced. */
function dayKey(at: number): string {
  const date = new Date(at)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/**
 * Thins readings older than `FULL_RESOLUTION_DAYS` down to the last one of
 * each day: months back, "what did that day end on" is the only question
 * left. `max` caps the series, so a long-lived install cannot grow forever.
 */
export function compactByDay<T extends Timed>(series: T[], now: number, max: number): T[] {
  const cutoff = now - FULL_RESOLUTION_DAYS * DAY_MS
  const perDay = new Map<string, T>()
  const recent: T[] = []
  for (const point of series) {
    if (point.at >= cutoff) recent.push(point)
    else perDay.set(dayKey(point.at), point)
  }
  const kept = [...perDay.values(), ...recent]
  return kept.length > max ? kept.slice(kept.length - max) : kept
}
