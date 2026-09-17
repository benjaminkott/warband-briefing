/**
 * Tests for the gold history: which readings are kept, which are dropped and
 * how old ones are thinned out.
 */

import { expect, it } from 'vitest'
import { appendGoldPoint, compactGoldHistory, goldPoint, recordGold, scopedTotal, MAX_POINTS } from './goldHistory'
import type { GoldPoint, GoldSummary } from './types'

const DAY = 86_400_000
// Local noon: the thinning groups by local calendar day, so the readings around
// it have to sit on the day a player would call theirs.
const NOW = new Date(2026, 2, 15, 12, 0, 0).getTime()

/** A gold summary as the collector builds it, in copper. */
const summary = (total: number, accounts: Record<string, number> = { Main: total }): GoldSummary => ({
  characters: total,
  warband: 0,
  guilds: [],
  total,
  byAccount: Object.entries(accounts).map(([account, value]) => ({
    account,
    characters: value,
    warband: 0,
    guilds: [],
    total: value
  }))
})

/* ---- what a reading turns into ---- */

const point = goldPoint(summary(500_000, { Main: 300_000, Alt: 200_000 }), NOW)
it('point keeps the total', () => {
  expect(point.total).toEqual(500_000)
})
it('point keeps every account', () => {
  expect(point.accounts).toEqual({ Main: 300_000, Alt: 200_000 })
})
it('scope all', () => {
  expect(scopedTotal(point, 'all')).toEqual(500_000)
})
it('scope one account', () => {
  expect(scopedTotal(point, 'Alt')).toEqual(200_000)
})
it('scope unknown account', () => {
  expect(scopedTotal(point, 'Nope')).toEqual(0)
})

/* ---- which readings are kept ---- */

const first = goldPoint(summary(100), NOW)
it('first reading is kept', () => {
  expect(appendGoldPoint([], first).length).toEqual(1)
})

it('a read that found nothing is not a drop to zero', () => {
  expect(appendGoldPoint([first], goldPoint(summary(0, {}), NOW + 60_000))).toEqual([first])
})

const changed = appendGoldPoint([first], goldPoint(summary(200), NOW + 60_000))
it('a changed amount is appended', () => {
  expect(changed.length).toEqual(2)
})

// An unchanged stretch keeps two points of its own: the change that started it
// and the latest reading that still says the same.
let flat = changed
for (let i = 2; i <= 20; i++) flat = appendGoldPoint(flat, goldPoint(summary(200), NOW + i * 60_000))
it('an unchanged stretch does not pile up', () => {
  expect(flat.length).toEqual(3)
})
it('the flat stretch keeps where it changed', () => {
  expect(flat[1].at).toEqual(NOW + 60_000)
})
it('the flat stretch moves its end', () => {
  expect(flat[2].at).toEqual(NOW + 20 * 60_000)
})

it('a clock that went backwards changes nothing', () => {
  expect(appendGoldPoint(flat, goldPoint(summary(999), NOW - DAY))).toEqual(flat)
})

// The same total split differently over two accounts is still a change.
const split = appendGoldPoint([goldPoint(summary(200, { Main: 200 }), NOW)], goldPoint(summary(200, { Main: 100, Alt: 100 }), NOW + 60_000))
it('a shifted account balance is a change', () => {
  expect(split.length).toEqual(2)
})

/* ---- thinning out ---- */

// Three readings a day for 40 days, day 14 left out so no reading sits on the
// cutoff itself: 26 days are past it, 13 are inside it.
const old = []
for (let day = 40; day >= 1; day--) {
  if (day === 14) continue
  for (const offset of [-4, 0, 6]) old.push(goldPoint(summary(day * 1000), NOW - day * DAY + offset * 3_600_000))
}
const compacted = compactGoldHistory(old, NOW)
const recent = compacted.filter((p) => p.at >= NOW - 14 * DAY)
const thinned = compacted.filter((p) => p.at < NOW - 14 * DAY)
it('recent readings keep their resolution', () => {
  expect(recent.length).toEqual(13 * 3)
})
it('older readings are thinned to one a day', () => {
  expect(thinned.length).toEqual(26)
})
it('the kept reading is the last of its day', () => {
  expect(new Date(thinned[0].at).getHours()).toEqual(18)
})
it('the series stays in order', () => {
  expect([...compacted].sort((a, b) => a.at - b.at)).toEqual(compacted)
})

const many: GoldPoint[] = []
for (let i = 0; i < MAX_POINTS + 500; i++) many.push(goldPoint(summary(i + 1), NOW - (i + 1) * 1000))
many.reverse()
it('the history is capped', () => {
  expect(compactGoldHistory(many, NOW).length).toEqual(MAX_POINTS)
})

/* ---- the two of them together ---- */

const recorded = recordGold([], summary(1000), NOW)
it('recording starts a history', () => {
  expect(recorded.length).toEqual(1)
})
it('recording an unchanged amount keeps two points', () => {
  expect(recordGold(recordGold(recorded, summary(1000), NOW + 1000), summary(1000), NOW + 2000).length).toEqual(2)
})
