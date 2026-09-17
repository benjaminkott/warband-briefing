/**
 * Weekly reset maths. The vault's own shape - row order and slot thresholds -
 * lives in `shared/types`, because both processes draw on it.
 *
 * Reward item levels are deliberately NOT listed anywhere: they change every
 * season and every patch, and no source addon records them. The vault rows show
 * the keystone level or raid difficulty instead.
 */

import { formatUntil } from '../shared/reset'
import { HOUR_MS, WEEK_MS } from '../shared/time'
import type { Region } from '../shared/enums/region'

interface ResetRule {
  timeZone: string
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  hour: number
}

const RESET_RULES: Record<Region, ResetRule> = {
  // 06:00 Paris, not 07:00: the client's own boundary - the reset stamp
  // SavedInstances stores and the raid lockout expiries next to it - falls on
  // Wednesday 04:00 UTC. An hour too late made the whole roster look like it
  // still had last week ahead of it for an hour after the reset.
  eu: { timeZone: 'Europe/Paris', weekday: 3, hour: 6 },
  us: { timeZone: 'America/Los_Angeles', weekday: 2, hour: 8 },
  kr: { timeZone: 'Asia/Seoul', weekday: 3, hour: 8 },
  tw: { timeZone: 'Asia/Taipei', weekday: 3, hour: 8 }
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
}

/** One formatter per zone: the walk below asks up to 192 times per call. */
const FORMATTERS = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = FORMATTERS.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', hour12: false })
    FORMATTERS.set(timeZone, format)
  }
  return format
}

function localParts(date: Date, timeZone: string): { weekday: number; hour: number } {
  const parts = formatter(timeZone).formatToParts(date)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun'
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  return { weekday: WEEKDAY_INDEX[weekday] ?? 0, hour: hour % 24 }
}

/** How far past its week a client stamp still stands for the boundary. */
const STAMP_MAX_AGE_MS = 2 * WEEK_MS

/**
 * The last reset implied by a next-reset stamp the client reported.
 *
 * The stamp ages with the file it was written to, so it is walked forward in
 * whole weeks until it lies ahead of `now`. Resets are exactly a week apart,
 * so that lands back on the boundary the realm actually runs on - including
 * whatever the realm does about daylight saving, which is the whole reason to
 * prefer it over a rule of our own.
 */
export function resetFromClient(nextResetAt: number, now = Date.now()): number {
  if (!(nextResetAt > 0)) return 0
  // The stamp is exact for the week it names; walked across a change of
  // daylight saving it is an hour off, and the realm's rule knows better.
  if (now - nextResetAt >= STAMP_MAX_AGE_MS) return 0
  if (now < nextResetAt) return nextResetAt - WEEK_MS
  return nextResetAt + Math.floor((now - nextResetAt) / WEEK_MS) * WEEK_MS
}

/**
 * Timestamp of the most recent weekly reset for a region.
 *
 * `reported` is the client's own next-reset stamp, when a source ran inside
 * the game and wrote one down; it is exact, so it wins. Without it the rule
 * below walks back hour by hour, so DST shifts are handled by the timezone
 * database rather than by an offset table that would need maintaining.
 */
export function lastWeeklyReset(region: Region, now = Date.now(), reported?: number | null): number {
  const fromClient = reported ? resetFromClient(reported, now) : 0
  if (fromClient > 0) return fromClient

  const rule = RESET_RULES[region]
  // Start at the top of the current hour.
  let t = Math.floor(now / HOUR_MS) * HOUR_MS
  for (let i = 0; i <= 24 * 8; i++) {
    const { weekday, hour } = localParts(new Date(t), rule.timeZone)
    if (weekday === rule.weekday && hour === rule.hour) return t
    t -= HOUR_MS
  }
  // Unreachable in practice; fall back to a week ago rather than throwing.
  return now - WEEK_MS
}

export function nextWeeklyReset(region: Region, now = Date.now(), reported?: number | null): number {
  return lastWeeklyReset(region, now, reported) + WEEK_MS
}

/** Human-readable "3d 4h" until the next reset. */
export function formatUntilReset(region: Region, now = Date.now(), reported?: number | null): string {
  return formatUntil(nextWeeklyReset(region, now, reported) - now)
}
