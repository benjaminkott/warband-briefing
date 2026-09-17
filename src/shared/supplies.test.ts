/**
 * Tests for the supplies: who wants what, what the bags and the bank
 * hold, and the player's own figure over the catalog's.
 *
 */

import { expect, it } from 'vitest'
import {
  BAG_FREE_MIN,
  countIn,
  fullBags,
  seasonSupplies,
  shortSupplies,
  supplyIconId,
  supplyItemIds,
  supplyNames,
  supplyNeed,
  supplyStock,
  withMinimum
} from './supplies'
import type { BagItem, Container } from './types'

const flask = {
  id: 'flask',
  name: 'Flasks',
  items: [
    { id: 1, name: 'Flask of Rank One' },
    { id: 2, name: 'Flask of Rank One' }
  ],
  need: 2
}
const rune = { id: 'rune', name: 'Runes', items: [{ id: 9, name: 'Rune' }], need: 1 }
const bags = (items: BagItem[]): Container => ({ name: null, slots: 10, free: 5, items })
const item = (itemId: number, count: number, name = ''): BagItem => ({ itemId, name, count, quality: null })

it("the bundled catalog carries the season's supplies, every item named", () => {
  const groups = seasonSupplies()
  expect(groups.length >= 3).toBeTruthy()
  expect(groups.every((group) => group.items.length > 0)).toBeTruthy()
  expect(groups.every((group) => group.items.every((each) => each.id > 0 && each.name.length > 0))).toBeTruthy()
  expect(groups.every((group) => Number.isInteger(group.need) && group.need > 0)).toBeTruthy()
  expect(groups.map((group) => group.id)).toEqual(['flask', 'potion', 'food', 'healthPotion', 'manaPotion', 'rune'])
  expect(supplyItemIds(rune)).toEqual([9])
})

it("the names fold the ranks of one item, and a bag names it in the client's language", () => {
  expect(supplyNames(flask)).toEqual([{ name: 'Flask of Rank One', ids: [1, 2] }])
  const roster = [{ bags: bags([item(2, 1, 'Fläschchen')]), bank: [] }]
  expect(supplyNames(flask, roster)).toEqual([
    { name: 'Flask of Rank One', ids: [1] },
    { name: 'Fläschchen', ids: [2] }
  ])
  expect(supplyNames(flask, [{ bags: null, bank: [bags([item(1, 1, 'Fläschchen'), item(2, 1, 'Fläschchen')])] }])).toEqual([
    { name: 'Fläschchen', ids: [1, 2] }
  ])
})

it("the icon is a carried item's, else the first of the catalog", () => {
  expect(supplyIconId(flask)).toBe(1)
  expect(supplyIconId(flask, [{ bags: bags([item(2, 1, 'Fläschchen')]), bank: [] }])).toBe(2)
  expect(supplyIconId({ ...flask, items: [] })).toBe(null)
})

it('every character wants the catalog figure', () => {
  expect(supplyNeed(flask)).toBe(2)
})

it('the own figure wins over the catalog', () => {
  expect(supplyNeed(flask, { flask: 5 })).toBe(5)
  expect(supplyNeed(flask, { flask: 0 })).toBe(0)
  expect(supplyNeed(flask, { flask: -1 })).toBe(2)
  expect(supplyNeed(flask, { rune: 3 })).toBe(2)
})

it('stacks of every id of the group are summed', () => {
  expect(countIn(bags([item(1, 2), item(2, 3), item(3, 9)]), [1, 2])).toBe(5)
  expect(countIn(null, [1])).toBe(0)
})

it('the stock says what the bags and the bank hold against the want', () => {
  const character = { bags: bags([item(1, 1)]), bank: [bags([item(2, 20)])] }
  const [stock] = supplyStock(character, null, [flask])!
  expect({ inBags: stock.inBags, inBank: stock.inBank, needed: stock.needed, short: stock.short }).toEqual({
    inBags: 1,
    inBank: 20,
    needed: 2,
    short: true
  })
})

it('without bags the stock is unknown, not empty', () => {
  expect(supplyStock({ bags: null, bank: [] }, null, [flask])).toBe(null)
  expect(shortSupplies({ bags: null, bank: [] }, null, [flask])).toEqual([])
})

it('only what runs short is an errand', () => {
  const character = { bags: bags([item(1, 2)]), bank: [] }
  expect(shortSupplies(character, null, [flask, rune]).map((stock) => stock.group.id)).toEqual(['rune'])
})

it('a minimum is set as a whole number, and taken back with null', () => {
  expect(withMinimum({}, 'flask', 3.7)).toEqual({ flask: 3 })
  expect(withMinimum({ flask: 3 }, 'flask', null)).toEqual({})
  expect(withMinimum({ flask: 3 }, 'flask', -2)).toEqual({})
  expect(withMinimum(undefined, 'rune', 0)).toEqual({ rune: 0 })
})

it('bags are full below the minimum of free slots, and unknown without a count', () => {
  expect(fullBags({ bagSpace: { free: BAG_FREE_MIN - 1, total: 132 } })).toEqual({ free: BAG_FREE_MIN - 1, total: 132 })
  expect(fullBags({ bagSpace: { free: BAG_FREE_MIN, total: 132 } })).toBe(null)
  expect(fullBags({ bagSpace: null })).toBe(null)
  expect(fullBags({ bagSpace: { free: 0, total: 0 } })).toBe(null)
})
