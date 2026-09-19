/**
 * Item level, rating and gold over time, per character.
 *
 * The same idea as the gold history: a reading per sync, kept only where it
 * says something new, thinned to one a day once it is old. The card draws the
 * last month of it as a line under the figure, so a number reads as "up 12
 * since the season started" rather than as a number.
 */

import type { CharacterHistory, CharacterPoint } from './types'
import { appendReading, compactByDay } from './series'
import { DAY_MS } from './time'

export { FULL_RESOLUTION_DAYS } from './series'

/**
 * Ceiling per character, so a long-lived install cannot grow forever. Gold
 * moves with every vendor visit, so a played character fills its two weeks
 * of full resolution far faster than item level alone did.
 */
export const MAX_POINTS = 1500

interface Measured {
  key: string
  itemLevel: number | null
  mythicRating: number | null
  money: number | null
}

function sameFigures(a: CharacterPoint, b: CharacterPoint): boolean {
  return a.itemLevel === b.itemLevel && a.rating === b.rating && (a.money ?? null) === (b.money ?? null)
}

/** Adds one reading to one character's series, the way `series.ts` keeps a series. */
export function appendPoint(series: CharacterPoint[], point: CharacterPoint): CharacterPoint[] {
  // A read that found no figure at all is a source that was mid-write, not a
  // character that lost its gear and its gold.
  if (point.itemLevel === null && point.rating === null && (point.money ?? null) === null) return series
  return appendReading(series, point, sameFigures)
}

/** Old readings thinned to one a day; see `series.ts`. */
export function compactSeries(series: CharacterPoint[], now: number): CharacterPoint[] {
  return compactByDay(series, now, MAX_POINTS)
}

/**
 * Records one sync's figures for every character in it.
 *
 * Characters the read no longer knows keep their series: a character hidden
 * behind a switched-off account comes back with its history intact.
 */
export function recordCharacters(history: CharacterHistory, characters: Measured[], at: number): CharacterHistory {
  const next: CharacterHistory = { ...history }
  for (const character of characters) {
    const point: CharacterPoint = {
      at,
      itemLevel: character.itemLevel === null ? null : Math.round(character.itemLevel * 100) / 100,
      rating: character.mythicRating === null ? null : Math.round(character.mythicRating),
      money: character.money
    }
    const series = compactSeries(appendPoint(next[character.key] ?? [], point), at)
    // A character no source has a figure for gets no series at all, rather
    // than an empty one sitting in the file for every bank alt.
    if (series.length > 0) next[character.key] = series
  }
  return next
}

/** A series as the sparkline draws it: the values, and the range they span. */
export interface TrendSeries {
  samples: Array<{ at: number; value: number }>
  from: number
  to: number
  min: number
  max: number
  /** Last value minus the first in the window. */
  change: number
}

/**
 * One figure of one character over the last `days`, ready to draw. Null when
 * there is nothing to draw a line through - a single reading is a dot.
 */
export function trend(
  series: CharacterPoint[] | undefined,
  pick: (point: CharacterPoint) => number | null,
  days: number,
  now: number
): TrendSeries | null {
  if (!series) return null
  const from = now - days * DAY_MS
  const samples: TrendSeries['samples'] = []
  // The reading in force when the window opens is what the line starts from;
  // without it a month with one change would start at that change.
  let carry: { at: number; value: number } | null = null
  for (const point of series) {
    const value = pick(point)
    if (value === null) continue
    if (point.at < from) carry = { at: from, value }
    else samples.push({ at: point.at, value })
  }
  if (carry) samples.unshift(carry)
  if (samples.length < 2) return null
  const values = samples.map((sample) => sample.value)
  return {
    samples,
    from: samples[0]!.at,
    to: now,
    min: Math.min(...values),
    max: Math.max(...values),
    change: values[values.length - 1]! - values[0]!
  }
}
