/**
 * Tests for the top bar's search: which characters and items a query
 * finds, where each hit leads, and how the list is cut.
 */

import { expect, it } from 'vitest'
import { MAX_CHARACTER_HITS, MAX_ITEM_HITS, characterHits, findHits, flatHits, itemHits, matchedTask } from './search'
import { snapshot } from '../../../shared/testing'
import type { BagItem, CharacterSnapshot, Container } from '../../../shared/types'

const item = (name: string, count: number, quality: number, itemId = name.length): BagItem => ({ itemId, name, count, quality })
const container = (name: string | null, items: BagItem[]): Container => ({ name, slots: 32, free: 32 - items.length, items })

const flask = item('Flask of Alchemical Chaos', 4, 3)
const potion = item('Tempered Potion', 60, 2)
const junk = item('Broken Fang', 3, 0)

/** A mage of the WOW1 account, named; the fields the matcher reads on top. */
const character = (name: string, options: Partial<CharacterSnapshot> = {}) =>
  snapshot(name, { key: `blackmoore-${name.toLowerCase()}`, className: 'Mage', ...options })

const kael = character('Kael', {
  spec: 'Fire',
  weeklies: [
    { id: 1, label: 'Prey: The Hunt', done: false },
    { id: 2, label: 'Done Quest', done: true }
  ],
  bags: container(null, [flask, junk]),
  bank: [container('Tab 1', [potion, flask]), container('Tab 2', [flask])]
})
const mira = character('Mira', { className: 'Druid', bags: container(null, [potion]) })
const roster = [kael, mira]
const banks = [{ account: 'WOW1', tabs: [container('Mats', [flask, item('Tempered Flask', 2, 2, 77)])], updatedAt: 0 }]

/* ---- characters ---- */

it('the name finds the character', () => {
  expect(characterHits(roster, 'mira').map((h) => h.character.name)).toEqual(['Mira'])
})
it('the class finds it too', () => {
  expect(characterHits(roster, 'druid').map((h) => h.character.name)).toEqual(['Mira'])
})
it('a name hit carries no task', () => {
  expect(characterHits(roster, 'kael')[0].task).toEqual(null)
})
it('an open task is the reason for a hit', () => {
  expect(characterHits(roster, 'prey')[0].task).toEqual('Prey: The Hunt')
})
it('a done task is no hit', () => {
  expect(characterHits(roster, 'done quest')).toEqual([])
})
it('a blank query finds nobody', () => {
  expect(characterHits(roster, '  ')).toEqual([])
})
it('a task that did not match is no reason', () => {
  expect(matchedTask(kael, 'kael')).toEqual(null)
})

/* ---- items ---- */

const flasks = itemHits(roster, banks, 'flask')
it('an item is one hit for each place it sits in, character by character, the bags first, the warband last', () => {
  expect(flasks.map((h) => [h.character?.name ?? h.account, h.stash])).toEqual([
    ['Kael', 'bags'],
    ['Kael', 'bank'],
    ['WOW1', 'warband'],
    ['WOW1', 'warband']
  ])
})
it('the stacks of a place are summed', () => {
  expect(flasks[1].item.count).toEqual(8)
})
it('the summed stack is a copy', () => {
  expect(kael.bank[0].items[1].count).toEqual(4)
})
it('rarer first within a place', () => {
  expect(flasks.slice(2).map((h) => h.item.name)).toEqual(['Flask of Alchemical Chaos', 'Tempered Flask'])
})
it('the query is a fragment of the name, whatever the case', () => {
  expect(itemHits(roster, banks, 'POTION').map((h) => h.character!.name)).toEqual(['Kael', 'Mira'])
})
it('a blank query finds no item', () => {
  expect(itemHits(roster, banks, '')).toEqual([])
})

/* ---- the list ---- */

const hits = findHits(roster, banks, 'flask')
it('the characters come first, then the items', () => {
  expect(flatHits(hits).map((h) => h.kind)).toEqual(['item', 'item', 'item', 'item'])
})
it('nothing left out below the caps', () => {
  expect(hits.more).toEqual(0)
})
it('a blank query is an empty list', () => {
  expect(findHits(roster, banks, ' ')).toEqual({ characters: [], items: [], more: 0 })
})

const many = Array.from({ length: MAX_CHARACTER_HITS + 3 }, (_, i) =>
  character(`Flaskbearer${i}`, {
    bags: container(
      null,
      Array.from({ length: MAX_ITEM_HITS }, (_, j) => item(`Flask ${i}-${j}`, 1, 1, i * 100 + j))
    )
  })
)
const capped = findHits(many, [], 'flask')
it('the characters are capped', () => {
  expect(capped.characters.length).toEqual(MAX_CHARACTER_HITS)
})
it('the items are capped', () => {
  expect(capped.items.length).toEqual(MAX_ITEM_HITS)
})
it('the figure counts what both caps left out', () => {
  expect(capped.more).toEqual(3 + (many.length * MAX_ITEM_HITS - MAX_ITEM_HITS))
})
