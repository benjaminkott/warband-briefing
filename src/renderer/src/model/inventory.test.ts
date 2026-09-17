/**
 * Tests for the inventory list's maths: the order of the items, what a
 * search keeps, and the sums the caption names.
 */

import { expect, it } from 'vitest'
import {
  categoryGroups,
  packBands,
  inventoryGroups,
  mergeContainers,
  inventoryTotals,
  matchItems,
  shownGroups,
  sortItems,
  tileFigure
} from './inventory'
import { ItemCategory } from '../../../shared/enums/itemCategory'
import type { BagItem } from '../../../shared/types'
const item = (name: string, count: number, quality: number | null, itemId = name.length): BagItem => ({ itemId, name, count, quality })

const flask = item('Flask of Alchemical Chaos', 4, 3)
const potion = item('Tempered Potion', 60, 2)
const junk = item('Broken Fang', 3, 0)
const epic = item('Crown of Radiance', 1, 4)
const unknown = item('', 1, null, 999)

const bags = { name: null, slots: 132, free: 12, items: [junk, potion, flask, epic, unknown] }
const tab = { name: 'Reagents', slots: 98, free: 40, items: [item('Flask of Alchemical Chaos', 10, 3, 3), item('Null Stone', 200, 1)] }
const empty = { name: 'Tab 3', slots: 98, free: 98, items: [] }

/* ---- order ---- */

it('rarer first, then the bigger stack', () => {
  expect(sortItems(bags.items).map((entry) => entry.name)).toEqual([
    'Crown of Radiance',
    'Flask of Alchemical Chaos',
    'Tempered Potion',
    'Broken Fang',
    ''
  ])
})
it('sort leaves the input alone', () => {
  expect(bags.items[0].name).toEqual('Broken Fang')
})

/* ---- search ---- */

it('empty query keeps everything', () => {
  expect(matchItems(bags.items, '  ').length).toEqual(5)
})
it('search is case-free', () => {
  expect(matchItems(bags.items, 'FLASK').map((entry) => entry.name)).toEqual(['Flask of Alchemical Chaos'])
})
it('search matches inside the name', () => {
  expect(matchItems(bags.items, 'potion').length).toEqual(1)
})
it('no match is an empty list', () => {
  expect(matchItems(bags.items, 'sword')).toEqual([])
})

/* ---- groups ---- */

const all = inventoryGroups([bags, tab, empty], '')
it('without a query every container stays, the empty one too', () => {
  expect(all.length).toEqual(3)
})
it('a group holds its container', () => {
  expect(all[1].container.name).toEqual('Reagents')
})
it('a group sorts its items', () => {
  expect(all[1].items.map((entry) => entry.name)).toEqual(['Flask of Alchemical Chaos', 'Null Stone'])
})

const found = inventoryGroups([bags, tab, empty], 'flask')
it('a search keeps only the containers with a match', () => {
  expect(found.map((group) => group.container.name)).toEqual([null, 'Reagents'])
})
it('a search cuts each group to its matches', () => {
  expect(found.map((group) => group.items.length)).toEqual([1, 1])
})
it('a search with no hit is no group', () => {
  expect(inventoryGroups([bags, tab, empty], 'sword')).toEqual([])
})

/* ---- the open tab ---- */

const open = shownGroups([bags, tab, empty], '', 1)
it('without a query the open tab alone', () => {
  expect(open.map((group) => group.container.name)).toEqual(['Reagents'])
})
it('the open tab sorts its items', () => {
  expect(open[0].items.map((entry) => entry.name)).toEqual(['Flask of Alchemical Chaos', 'Null Stone'])
})
it('an empty tab is a group without lines', () => {
  expect(shownGroups([bags, tab, empty], '', 2)[0].items).toEqual([])
})
it('a tab out of range falls back to the first', () => {
  expect(shownGroups([bags, tab, empty], '', 7)[0].container.name).toEqual(null)
})
it('no containers, no group', () => {
  expect(shownGroups([], '', 0)).toEqual([])
})
it('a search goes over every tab', () => {
  expect(shownGroups([bags, tab, empty], 'flask', 2).map((group) => group.container.name)).toEqual([null, 'Reagents'])
})

/* ---- groups of a bag addon ---- */

const crown = { ...epic, category: ItemCategory.Armor, itemLevel: 678 }
const blade = { itemId: 7, name: 'Blade', count: 1, quality: 3, category: ItemCategory.Weapon, itemLevel: 690 }
const hearth = { itemId: 6948, name: 'Hearthstone', count: 1, quality: 1, category: ItemCategory.Misc }
const tempered = { ...potion, category: ItemCategory.Consumable }
const chaos = { ...flask, category: ItemCategory.Consumable }
const ore = { itemId: 8, name: 'Ore', count: 40, quality: 1, category: ItemCategory.Tradeskill }

it('items sort into their groups, in the order the groups stand in; an unknown one goes with the ones without a word', () => {
  expect(
    categoryGroups([junk, ore, crown, tempered, hearth, chaos, blade, unknown]).map((group) => [
      group.category,
      group.items.map((item) => item.name)
    ])
  ).toEqual([
    ['weapon', ['Blade']],
    ['armor', ['Crown of Radiance']],
    ['consumable', ['Flask of Alchemical Chaos', 'Tempered Potion']],
    ['tradeskill', ['Ore']],
    ['misc', ['Hearthstone']],
    ['other', ['Broken Fang', '']]
  ])
})
it('gear sorts by its level, the rest rarer first', () => {
  expect(
    categoryGroups([
      { ...crown, itemLevel: 600 },
      { ...crown, itemId: 9, name: 'Better', itemLevel: 700 }
    ])[0].items.map((item) => item.name)
  ).toEqual(['Better', 'Crown of Radiance'])
})
it('no items, no groups', () => {
  expect(categoryGroups([])).toEqual([])
})
it('the figure is the level of gear, the count of a stack, nothing on one item', () => {
  expect([tileFigure(crown), tileFigure(tempered), tileFigure(hearth), tileFigure({ ...crown, itemLevel: null })]).toEqual([
    678,
    60,
    null,
    null
  ])
})

/* ---- the bands of cards ---- */

// A field of 24 cells across: a card takes its tiles and one free column.
it('small cards share a band a free column apart; the big one takes the rest of it, a dozen at most, and wraps', () => {
  expect(packBands([1, 3, 2, 44], 24)).toEqual([2, 3, 2, 12])
})
it('a rest too narrow for a card to start in goes to the next band', () => {
  expect(packBands([20, 44, 2], 18)).toEqual([12, 12, 2])
})
it('a card that fits the rest of a band takes it and wraps within', () => {
  expect(packBands([12, 30], 24)).toEqual([12, 10])
})
it('a group of one lays two tiles across, for its heading', () => {
  expect(packBands([1, 1], 24)).toEqual([2, 2])
})
it('no columns known yet: a dozen stand in for the band', () => {
  expect(packBands([44], 0)).toEqual([12])
})
it('a card lays a dozen tiles across at most, however wide the field', () => {
  expect(packBands([44], 60)).toEqual([12])
})
it('no groups, no spans', () => {
  expect(packBands([], 24)).toEqual([])
})

/* ---- one bag out of the tabs ---- */

const moreFlasks = { name: 'Tab 4', slots: 98, free: 97, items: [{ ...flask, count: 10, quality: null }] }
const merged = mergeContainers([bags, tab, empty, moreFlasks], 'Bank')
it('merged tabs are one bag: the space summed, one stack per item id', () => {
  expect([merged.name, merged.slots, merged.free, merged.items.length]).toEqual(['Bank', 426, 247, 7])
})
it('a stack in two tabs is one stack, its counts summed, the first tab says what it is', () => {
  expect(merged.items.find((item) => item.itemId === flask.itemId)).toEqual({ ...flask, count: 14 })
})
it('the inputs stay as they were', () => {
  expect([bags.items.length, flask.count]).toEqual([5, 4])
})
it('no tabs, an empty bag', () => {
  expect(mergeContainers([], null)).toEqual({ name: null, slots: 0, free: 0, items: [] })
})

/* ---- totals ---- */

it('totals sum kinds, stacks and space', () => {
  expect(inventoryTotals([bags, tab, empty])).toEqual({ kinds: 7, count: 279, free: 150, slots: 328 })
})
it('no containers, no totals', () => {
  expect(inventoryTotals([])).toEqual({ kinds: 0, count: 0, free: 0, slots: 0 })
})
