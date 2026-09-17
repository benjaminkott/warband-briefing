/**
 * The units of time the app counts in, and one way to split a span into
 * them. A day is 24 hours here: the spans are hours played and days back,
 * not calendar days, so daylight saving does not enter.
 */

export const MINUTE_MS = 60_000
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS
/** The span between two weekly resets. */
export const WEEK_MS = 7 * DAY_MS

/** A span in whole days, the hours left over, and the minutes left over. */
export interface Duration {
  days: number
  hours: number
  minutes: number
}

/** Splits a span in milliseconds; a negative span is nothing at all. */
export function splitDuration(ms: number): Duration {
  const left = Math.max(ms, 0)
  return {
    days: Math.floor(left / DAY_MS),
    hours: Math.floor((left % DAY_MS) / HOUR_MS),
    minutes: Math.floor((left % HOUR_MS) / MINUTE_MS)
  }
}
