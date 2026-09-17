/**
 * Gold over time: how a reading becomes a history point, when a new point is
 * worth keeping and how old ones are thinned out.
 *
 * Both processes draw on this - the main process records a point per sync, the
 * renderer reads the same points back for the chart - so they cannot disagree
 * about what a point means.
 */

import type { GoldPoint, GoldSummary } from './types'
import { appendReading, compactByDay } from './series'
import { AnyAccount } from './enums/anyAccount'

export { FULL_RESOLUTION_DAYS } from './series'

/** Ceiling on the stored points, so a long-lived install cannot grow forever. */
export const MAX_POINTS = 4000

/** Turns one sync's gold summary into the point that gets stored. */
export function goldPoint(gold: GoldSummary, at: number): GoldPoint {
  const accounts: Record<string, number> = {}
  for (const entry of gold.byAccount) accounts[entry.account] = entry.total
  return {
    at,
    characters: gold.characters,
    warband: gold.warband,
    guilds: gold.guilds.reduce((sum, guild) => sum + guild.money, 0),
    total: gold.total,
    accounts
  }
}

/**
 * The value one scope plots: a single WTF account, or `all` of them.
 *
 * "All" is the accounts counted today, not the stored total: a point keeps
 * the total as it was read, so an account hidden since would still sit in the
 * old readings and every trend would start with a drop that never happened.
 * Without a list, the stored total is all there is.
 */
export function scopedTotal(point: GoldPoint, account: string, accounts?: string[]): number {
  if (account !== AnyAccount.All) return point.accounts[account] ?? 0
  if (!accounts) return point.total
  return accounts.reduce((sum, key) => sum + (point.accounts[key] ?? 0), 0)
}

/** Two readings are the same when every scope in them is the same. */
function sameTotals(a: GoldPoint, b: GoldPoint): boolean {
  if (a.total !== b.total) return false
  for (const key of new Set([...Object.keys(a.accounts), ...Object.keys(b.accounts)])) {
    if ((a.accounts[key] ?? 0) !== (b.accounts[key] ?? 0)) return false
  }
  return true
}

/** Adds a reading to the history, the way `series.ts` keeps a series. */
export function appendGoldPoint(history: GoldPoint[], point: GoldPoint): GoldPoint[] {
  // A read that found nothing is a source that is switched off or mid-write,
  // not an account that lost everything; it must not show up as a drop to zero.
  if (point.total <= 0) return history
  return appendReading(history, point, sameTotals)
}

/** Old readings thinned to one a day; see `series.ts`. */
export function compactGoldHistory(history: GoldPoint[], now: number): GoldPoint[] {
  return compactByDay(history, now, MAX_POINTS)
}

/** Append and compact in one step - what a finished sync calls. */
export function recordGold(history: GoldPoint[], gold: GoldSummary, at: number): GoldPoint[] {
  return compactGoldHistory(appendGoldPoint(history, goldPoint(gold, at)), at)
}
