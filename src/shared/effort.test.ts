/**
 * Tests for time as the measure: what a step takes by the season's
 * figures, what counts as quick, and how many evenings are left before
 * the reset.
 *
 */

import { expect, it } from 'vitest'
import { DEFAULT_EVENING_MINUTES, DEFAULT_MINUTES, eveningMinutesOf, seasonMinutes, vaultStepMinutes } from './effort'
import { eveningsUntil } from './reset'
import { VaultCategory } from './enums/vaultCategory'
import type { Minutes } from './effort'

/* ---- what a step takes ---- */

it("the bundled catalog carries the season's figures", () => {
  const minutes = seasonMinutes()
  expect(minutes.dungeon).toBe(40)
  expect(minutes.claim).toBe(2)
  for (const key of Object.keys(DEFAULT_MINUTES) as (keyof Minutes)[]) expect(typeof minutes[key]).toBe('number')
})

it("a vault step is its missing units at the row's price", () => {
  expect(vaultStepMinutes(VaultCategory.Dungeon, 1)).toBe(40)
  expect(vaultStepMinutes(VaultCategory.Raid, 2)).toBe(30)
  expect(vaultStepMinutes(VaultCategory.World, 4)).toBe(40)
  expect(vaultStepMinutes(VaultCategory.Dungeon, 2, { ...DEFAULT_MINUTES, dungeon: 25 })).toBe(50)
})

it('the evening is the stored one, or the default', () => {
  expect(eveningMinutesOf({ eveningMinutes: 60 })).toBe(60)
  expect(eveningMinutesOf({ eveningMinutes: 0 })).toBe(DEFAULT_EVENING_MINUTES)
  expect(eveningMinutesOf({})).toBe(DEFAULT_EVENING_MINUTES)
  expect(eveningMinutesOf(null)).toBe(DEFAULT_EVENING_MINUTES)
})

/* ---- the evenings before the reset ---- */

const at = (day: number, hour: number, minute = 0) => new Date(2026, 8, day, hour, minute).getTime()
// The reset: Wednesday 16 September 2026, early in the morning.
const reset = at(16, 5)

it('a Monday evening leaves tonight and tomorrow', () => {
  expect(eveningsUntil(at(14, 21), reset)).toBe(2)
})

it('late on Tuesday there is still tonight', () => {
  expect(eveningsUntil(at(15, 23, 30), reset)).toBe(1)
})

it('on the morning of the reset there is no evening left', () => {
  expect(eveningsUntil(at(16, 3), reset)).toBe(0)
  expect(eveningsUntil(at(16, 6), reset)).toBe(0)
})

it("a reset late in the day leaves that day's evening", () => {
  expect(eveningsUntil(at(15, 21), at(16, 22))).toBe(2)
})

it('a whole week is seven evenings', () => {
  expect(eveningsUntil(at(9, 6), reset)).toBe(7)
})
