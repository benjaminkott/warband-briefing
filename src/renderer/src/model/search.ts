/**
 * What the search in the top bar finds, worked out without a DOM: the
 * characters the query names, and the items it names across every bag,
 * every bank and the warband banks. A hit says where it leads - a
 * character's page, or the place the item sits - so the shell can open
 * it. The characters match on the roster's own matcher and the items on
 * the inventory's, so the list under the field agrees with the views the
 * same query narrows.
 */

import type { BagItem, CharacterSnapshot, WarbandBank } from '../../../shared/types'
import { HitKind } from '../enums/hitKind'
import { Stash } from '../enums/stash'
import { matchItems, sortItems } from './inventory'
import { matches } from './overview'

export interface CharacterHit {
  kind: HitKind.Character
  character: CharacterSnapshot
  /** An open task the query names, the reason a hit that is not the name is on the list; null where the name, realm or class was it. */
  task: string | null
}

export interface ItemHit {
  kind: HitKind.Item
  item: BagItem
  stash: Stash
  /** The character whose bags or bank hold the item; null for the warband bank. */
  character: CharacterSnapshot | null
  /** The WTF account whose warband bank holds the item; null for a character's own. */
  account: string | null
}

export type Hit = CharacterHit | ItemHit

/** The list stays short enough to read at a glance; the figure says what it left out. */
export const MAX_CHARACTER_HITS = 5
export const MAX_ITEM_HITS = 8

export interface Hits {
  characters: CharacterHit[]
  items: ItemHit[]
  /** The matches beyond the two caps. */
  more: number
}

const NO_HITS: Hits = { characters: [], items: [], more: 0 }

/** The words of the query, lower-cased, as the roster's matcher reads them. */
function termsOf(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * The open task the query names, if that is what matched. "prey" finds
 * everyone with a hunt still open; the list says so beside the name,
 * since the name alone would not explain the hit.
 */
export function matchedTask(character: CharacterSnapshot, query: string): string | null {
  const terms = termsOf(query)
  if (terms.length === 0) return null
  const open = [...character.weeklies, ...(character.activities ?? [])].filter((task) => !task.done)
  return open.find((task) => terms.some((term) => task.label.toLowerCase().includes(term)))?.label ?? null
}

/** The characters the query names, in the order given, each with the task that matched where one did. */
export function characterHits(characters: CharacterSnapshot[], query: string): CharacterHit[] {
  if (termsOf(query).length === 0) return []
  return characters
    .filter((character) => matches(character, query))
    .map((character) => ({ kind: HitKind.Character, character, task: matchedTask(character, query) }))
}

/**
 * The items the query names, character by character in the order given -
 * the bags before the bank - and the warband banks after them. A bank's
 * tabs are folded, so one item is one hit for each place it sits in, with
 * the stacks of the place summed.
 */
export function itemHits(characters: CharacterSnapshot[], banks: WarbandBank[], query: string): ItemHit[] {
  if (query.trim().length === 0) return []
  const hits: ItemHit[] = []
  const add = (items: BagItem[], stash: Stash, character: CharacterSnapshot | null, account: string | null): void => {
    for (const item of sortItems(matchItems(folded(items), query))) hits.push({ kind: HitKind.Item, item, stash, character, account })
  }
  for (const character of characters) {
    if (character.bags) add(character.bags.items, Stash.Bags, character, null)
    add(
      character.bank.flatMap((tab) => tab.items),
      Stash.Bank,
      character,
      null
    )
  }
  for (const bank of banks)
    add(
      bank.tabs.flatMap((tab) => tab.items),
      Stash.Warband,
      null,
      bank.account
    )
  return hits
}

/** The stacks of one item as one, the way the bag addon and the inventory list show them. */
function folded(items: BagItem[]): BagItem[] {
  const byId = new Map<number, BagItem>()
  for (const item of items) {
    const known = byId.get(item.itemId)
    if (known) known.count += item.count
    else byId.set(item.itemId, { ...item })
  }
  return [...byId.values()]
}

/** What the list under the field shows: the characters first, the items after them, each cut to its cap. */
export function findHits(characters: CharacterSnapshot[], banks: WarbandBank[], query: string): Hits {
  if (query.trim().length === 0) return NO_HITS
  const people = characterHits(characters, query)
  const items = itemHits(characters, banks, query)
  return {
    characters: people.slice(0, MAX_CHARACTER_HITS),
    items: items.slice(0, MAX_ITEM_HITS),
    more: Math.max(0, people.length - MAX_CHARACTER_HITS) + Math.max(0, items.length - MAX_ITEM_HITS)
  }
}

/** The hits as one list, in the order the field walks them with the arrow keys. */
export function flatHits(hits: Hits): Hit[] {
  return [...hits.characters, ...hits.items]
}
