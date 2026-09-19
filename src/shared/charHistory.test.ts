/**
 * Tests for the per-character history: which readings are kept, and how a
 * trend is cut out of them.
 */

import { expect, it } from 'vitest'
import { appendPoint, compactSeries, recordCharacters, trend, MAX_POINTS } from './charHistory'
import type { CharacterPoint } from './types'
const DAY = 86_400_000
const NOW = new Date(2026, 2, 15, 12, 0, 0).getTime()

const point = (at: number, itemLevel: number | null, rating: number | null, money: number | null = null): CharacterPoint => ({
  at,
  itemLevel,
  rating,
  money
})

/* ---- appending ---- */

it('first reading starts the series', () => {
  expect(appendPoint([], point(1, 600, 1000)).length).toEqual(1)
})
it('a reading with no figure at all is not a point', () => {
  expect(appendPoint([point(1, 600, 1000)], point(2, null, null)).length).toEqual(1)
})
it('a reading of gold alone is a point', () => {
  expect(appendPoint([point(1, 600, 1000)], point(2, null, null, 50_000)).length).toEqual(2)
})
it('a changed figure adds a point', () => {
  expect(appendPoint([point(1, 600, 1000)], point(2, 605, 1000)).length).toEqual(2)
})
it('changed gold adds a point', () => {
  expect(appendPoint([point(1, 600, 1000, 10_000)], point(2, 600, 1000, 20_000)).length).toEqual(2)
})
it('a reading from before gold was recorded matches one without gold', () => {
  const old = { at: 1, itemLevel: 600, rating: 1000 }
  expect(appendPoint(appendPoint([old], point(2, 600, 1000)), point(3, 600, 1000)).map((p) => p.at)).toEqual([1, 3])
})
const held = appendPoint(appendPoint([point(1, 600, 1000)], point(2, 600, 1000)), point(3, 600, 1000))
it('an unchanged stretch keeps only its two ends', () => {
  expect(held.map((p) => p.at)).toEqual([1, 3])
})
it('a clock that went backwards is ignored', () => {
  expect(appendPoint([point(5, 600, 1000)], point(4, 601, 1000)).length).toEqual(1)
})

/* ---- recording a sync ---- */

const roster = [
  { key: 'a', itemLevel: 612.34, mythicRating: 2415.6, money: 1_234_567 },
  { key: 'b', itemLevel: null, mythicRating: null, money: null }
]
const recorded = recordCharacters({}, roster, NOW)
it('every character with a figure gets a series', () => {
  expect(Object.keys(recorded)).toEqual(['a'])
})
it('item level kept to two decimals, rating to a whole number, gold as read', () => {
  expect(recorded.a[0]).toEqual(point(NOW, 612.34, 2416, 1_234_567))
})
const same = { key: 'a', itemLevel: 612.34, mythicRating: 2416, money: 1_234_567 }
const again = recordCharacters(recordCharacters(recorded, [same], NOW + 60_000), [same], NOW + 120_000)
it('the same figures later move the end point', () => {
  expect(again.a.map((p) => p.at)).toEqual([NOW, NOW + 120_000])
})
it('a character the read no longer knows keeps its series', () => {
  expect(Object.keys(recordCharacters(recorded, [], NOW + DAY))).toEqual(['a'])
})

/* ---- compaction ---- */

const dense = []
for (let day = 40; day >= 0; day--) {
  for (let hour = 0; hour < 4; hour++) dense.push(point(NOW - day * DAY + hour * 3_600_000, 600 + day, 0))
}
const compact = compactSeries(dense, NOW)
it('old days thinned to one reading each', () => {
  expect(compact.filter((p) => p.at < NOW - 14 * DAY).length).toEqual(26)
})
it('recent readings kept as they are', () => {
  expect(compact.filter((p) => p.at >= NOW - 14 * DAY).length).toEqual(15 * 4)
})
const flood = Array.from({ length: MAX_POINTS + 50 }, (_, i) => point(NOW - 10 * DAY + i * 1000, i, 0))
it('the series is capped', () => {
  expect(compactSeries(flood, NOW).length).toEqual(MAX_POINTS)
})

/* ---- the trend ---- */

const series = [point(NOW - 60 * DAY, 580, 900), point(NOW - 20 * DAY, 600, 1200), point(NOW - 5 * DAY, 612, 1500)]
const ilvl = trend(series, (p) => p.itemLevel, 30, NOW)!
it('the window opens on the reading in force at the time', () => {
  expect(ilvl.samples[0]).toEqual({ at: NOW - 30 * DAY, value: 580 })
})
it('the change is last minus first in the window', () => {
  expect(ilvl.change).toEqual(32)
})
it('the range spans the window', () => {
  expect([ilvl.min, ilvl.max]).toEqual([580, 612])
})
it('a figure never reported draws nothing', () => {
  expect(trend([point(NOW, null, 1000)], (p) => p.itemLevel, 30, NOW)).toEqual(null)
})
it('one reading is a dot, not a line', () => {
  expect(trend([point(NOW - DAY, 600, 0)], (p) => p.itemLevel, 30, NOW)).toEqual(null)
})
it('no series, no trend', () => {
  expect(trend(undefined, (p) => p.itemLevel, 30, NOW)).toEqual(null)
})
