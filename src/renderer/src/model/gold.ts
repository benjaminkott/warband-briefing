/**
 * The gold view's own maths: the series the chart draws and the numbers the
 * headline reads off it.
 *
 * The stored history is copper and account-wide; everything here is already
 * scoped to the selected WTF account and converted to gold, so no component
 * has to divide by 10.000 again.
 */

import type { GoldPoint, GoldSummary } from '../../../shared/types'
import { AnyAccount } from '../../../shared/enums/anyAccount'
import { scopedTotal } from '../../../shared/goldHistory'
import type { Translator } from '../../../shared/i18n'
import { GoldRange } from '../enums/goldRange'
import { DAY_MS } from '../../../shared/time'

/** Copper -> gold, which is the only unit worth showing at account scale. */
export function toGold(copper: number): number {
  return Math.floor(copper / 10_000)
}

/**
 * Short figure for axis ticks and deltas - "1,23 Mio." instead of "1.234.567".
 * Below ten thousand the full number is shorter than its abbreviation.
 */
export function formatGoldShort(tr: Translator, gold: number): string {
  const abs = Math.abs(gold)
  if (abs < 10_000) return tr.formatNumber(gold)
  return tr.formatNumber(gold, {
    notation: 'compact',
    maximumFractionDigits: abs < 1_000_000 ? 0 : 2
  })
}

/** 0 means "everything there is". */
const RANGE_DAYS: Record<GoldRange, number> = { [GoldRange.Week]: 7, [GoldRange.Month]: 30, [GoldRange.Quarter]: 90, [GoldRange.All]: 0 }

export interface GoldSample {
  at: number
  /** In gold, already scoped to the selected account. */
  value: number
}

export interface GoldSeries {
  samples: GoldSample[]
  /** Window the chart draws, which is the range - not the first reading in it. */
  from: number
  to: number
  first: number
  last: number
  change: number
  min: number
  max: number
  /** Readings the range actually contains, synthetic end points excluded. */
  readings: number
}

/**
 * The series for one account and one range. `accounts` are the WTF accounts
 * counted today, so `AnyAccount.All` matches the total the tiles show beside it.
 *
 * Two points are added that were never read: the amount the range started at
 * (gold keeps its value until something changes it, so the last reading before
 * the range is what the range begins with) and the same amount at "now", so the
 * line runs to the right edge instead of stopping at the last change.
 */
export function goldSeries(
  history: GoldPoint[],
  account: string,
  range: GoldRange,
  accounts?: string[],
  now = Date.now()
): GoldSeries | null {
  if (history.length === 0) return null

  const all: GoldSample[] = history.map((point) => ({
    at: point.at,
    value: toGold(scopedTotal(point, account, accounts))
  }))

  const days = RANGE_DAYS[range]
  const cutoff = days > 0 ? now - days * DAY_MS : all[0]!.at
  const inRange = all.filter((sample) => sample.at >= cutoff)
  const before = [...all].reverse().find((sample) => sample.at < cutoff)

  const samples: GoldSample[] = []
  if (before) samples.push({ at: cutoff, value: before.value })
  samples.push(...inRange)
  if (samples.length === 0) return null

  const readings = inRange.length
  const last = samples[samples.length - 1]!
  if (last.at < now) samples.push({ at: now, value: last.value })

  const values = samples.map((sample) => sample.value)
  const first = values[0]!
  const current = values[values.length - 1]!
  return {
    samples,
    from: samples[0]!.at,
    to: samples[samples.length - 1]!.at,
    first,
    last: current,
    change: current - first,
    min: Math.min(...values),
    max: Math.max(...values),
    readings
  }
}

/** The WTF accounts the current summary counts - the hidden ones are not in it. */
export function countedAccounts(gold: GoldSummary | null): string[] | undefined {
  return gold ? gold.byAccount.map((entry) => entry.account) : undefined
}

/** How the series moved, the way a stat tile draws it: the change over the days it spans. */
export function goldTrend(series: GoldSeries | null): { change: number; days: number } | undefined {
  return series ? { change: series.change, days: Math.round(spanDays(series)) } : undefined
}

/** The month's series over every counted account: what the summary tiles draw. */
export function goldMonth(history: GoldPoint[], gold: GoldSummary | null): GoldSeries | null {
  return goldSeries(history, AnyAccount.All, GoldRange.Month, countedAccounts(gold))
}

/** How many days the range spans - the "all" range is as long as the history. */
export function spanDays(series: GoldSeries): number {
  return (series.to - series.from) / DAY_MS
}

/** Average change per day over the range, for the "per day" figure. */
export function perDay(series: GoldSeries): number {
  const days = spanDays(series)
  return days > 0 ? series.change / days : 0
}

/**
 * Rounded tick values covering `min..max`.
 *
 * The gold line sits on a large base amount, so the axis follows the data
 * rather than starting at zero - a scale from zero would flatten every week
 * into the same straight line. The ticks are labelled, so the reader can see it.
 */
export function niceTicks(min: number, max: number, count = 4): { lo: number; hi: number; ticks: number[] } {
  // A stretch without a single change still needs a band to be drawn in.
  if (max <= min) {
    const pad = Math.max(1, Math.abs(max) * 0.02)
    min -= pad
    max += pad
  }
  const rough = (max - min) / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  // Every figure drawn on these axes is labelled as a whole number, so a step
  // below one would put the same label on two grid lines (and hand React two
  // children with the same key). A flat rating of 0 is the case that gets here.
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = lo; value <= hi + step / 2; value += step) ticks.push(Math.round(value))
  return { lo, hi, ticks }
}
