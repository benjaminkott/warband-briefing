/**
 * Supplies: whether a character carries enough of the season's consumables
 * for what it plays - flasks, potions, food and runes for the group.
 *
 * The bags come from the companion (`bags` on the snapshot); which items
 * are the season's flasks is the catalog's, like
 * the quest ids and the currencies; how many are enough is the one
 * opinion the app allows itself, with one figure a group in the catalog
 * and the player's own figure over it (`supplyMinimums`). A stock is a
 * stock: every character wants the same, and one that plays no group
 * content takes the errand off its list (`skips.ts`). What is short
 * becomes an errand on the list, measured, not ticked (C1, C12).
 */

import type { AppConfig, BagSpace, CharacterSnapshot, Container } from './types'
import { seasonCatalog } from './seasonCatalog'

/** One item that counts as a supply. */
export interface SupplyItem {
  id: number
  /** English name, as Wowhead lists it. The name a bag gives the item beats it, so a German client shows German names. */
  name: string
}

/** One kind of consumable: the items that count as it, and how many of them a character wants. */
export interface SupplyGroup {
  /** Stable id, the key of the player's own minimum. */
  id: string
  /** English name, as the settings show it where the game has no word for the group. */
  name: string
  /** Every item that counts, ranks and fleeting variants included. */
  items: SupplyItem[]
  /** How many a character wants. */
  need: number
}

/** A name of the group's items with every id that carries it: the ranks of one flask are one line, not three. */
export interface SupplyName {
  name: string
  ids: number[]
}

/** What a character holds of one group against what it wants. */
export interface SupplyStock {
  group: SupplyGroup
  /** In the bags: what is at hand for tonight. */
  inBags: number
  /** In the bank: at hand after a trip to town, so the errand names it. */
  inBank: number
  /** The catalog's figure, or the player's own over it. */
  needed: number
  /** Fewer in the bags than wanted. */
  short: boolean
}

/** The season's groups; a fetched catalog from before them has none. */
export function seasonSupplies(): SupplyGroup[] {
  return (seasonCatalog().supplies ?? []).filter((group) => Array.isArray(group.items) && typeof group.need === 'number')
}

/** The ids of the group's items: what `countIn` looks for. */
export function supplyItemIds(group: SupplyGroup): number[] {
  return group.items.map((item) => item.id)
}

/** The name a bag of the roster gives each item it holds: the client's language, and the ids the lexicon knows an icon for. */
function carriedNames(characters: readonly Pick<CharacterSnapshot, 'bags' | 'bank'>[]): Map<number, string> {
  const seen = new Map<number, string>()
  for (const character of characters) {
    for (const container of [character.bags, ...character.bank]) {
      for (const item of container?.items ?? []) if (item.name && !seen.has(item.itemId)) seen.set(item.itemId, item.name)
    }
  }
  return seen
}

/**
 * What the group's items are called, for the reader: the bag's name where
 * any character of the roster carries the item - the client's language -
 * else the catalog's English one. The ranks of one item share a name and
 * fold into one line; the order stays the catalog's.
 */
export function supplyNames(group: SupplyGroup, characters: readonly Pick<CharacterSnapshot, 'bags' | 'bank'>[] = []): SupplyName[] {
  const seen = carriedNames(characters)
  const names: SupplyName[] = []
  for (const item of group.items) {
    const name = seen.get(item.id) ?? item.name
    const line = names.find((each) => each.name === name)
    if (line) line.ids.push(item.id)
    else names.push({ name, ids: [item.id] })
  }
  return names
}

/**
 * The item that stands for the group in a picture: the first one a bag of
 * the roster holds, else the catalog's first. The lexicon knows an icon
 * only for an item a character has had in view, so the catalog's first
 * would often be a blank where a carried rank has a picture.
 */
export function supplyIconId(group: SupplyGroup, characters: readonly Pick<CharacterSnapshot, 'bags' | 'bank'>[] = []): number | null {
  const seen = carriedNames(characters)
  return group.items.find((item) => seen.has(item.id))?.id ?? group.items[0]?.id ?? null
}

/** The player's own minimum for a group, where one is stored and sensible. */
function ownMinimum(minimums: AppConfig['supplyMinimums'] | null | undefined, id: string): number | null {
  const value = minimums?.[id]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** How many of a group a character wants: the player's own figure where there is one, else the catalog's. */
export function supplyNeed(group: SupplyGroup, minimums: AppConfig['supplyMinimums'] | null | undefined = null): number {
  return ownMinimum(minimums, group.id) ?? group.need
}

/** How many items of the group a container holds, every stack summed. */
export function countIn(container: Container | null | undefined, itemIds: readonly number[]): number {
  if (!container) return 0
  const ids = new Set(itemIds)
  return container.items.reduce((sum, item) => sum + (ids.has(item.itemId) ? item.count : 0), 0)
}

/**
 * Every group against a character's bags: what it holds, what it wants.
 * Null where no source lists the bags - unknown is not none, and a line
 * "0 flasks" off a source that never looked would be a lie.
 */
export function supplyStock(
  character: Pick<CharacterSnapshot, 'bags' | 'bank'>,
  minimums: AppConfig['supplyMinimums'] | null | undefined = null,
  groups: SupplyGroup[] = seasonSupplies()
): SupplyStock[] | null {
  if (!character.bags) return null
  return groups.map((group) => {
    const ids = supplyItemIds(group)
    const inBags = countIn(character.bags, ids)
    const inBank = character.bank.reduce((sum, tab) => sum + countIn(tab, ids), 0)
    const needed = supplyNeed(group, minimums)
    return { group, inBags, inBank, needed, short: inBags < needed }
  })
}

/** The groups a character is short of: the errands. Empty without bags. */
export function shortSupplies(
  character: Pick<CharacterSnapshot, 'bags' | 'bank'>,
  minimums: AppConfig['supplyMinimums'] | null | undefined = null,
  groups: SupplyGroup[] = seasonSupplies()
): SupplyStock[] {
  return (supplyStock(character, minimums, groups) ?? []).filter((stock) => stock.short)
}

/** The minimums with one set, or taken back to the catalog's figure with null. */
export function withMinimum(
  minimums: AppConfig['supplyMinimums'] | null | undefined,
  id: string,
  value: number | null
): AppConfig['supplyMinimums'] {
  const next = { ...(minimums ?? {}) }
  if (value === null || !Number.isFinite(value) || value < 0) delete next[id]
  else next[id] = Math.floor(value)
  return next
}

/**
 * Fewer free slots than this, and the next run's loot has nowhere to go:
 * a dungeon drops three or four items, a raid evening more. Emptying the
 * bags is a trip to the vendor or the bank before the group stands - so
 * it is an errand, measured off the same bag list as the supplies.
 */
export const BAG_FREE_MIN = 8

/** The bags that are nearly full, or null: enough room, or no source counted the slots. */
export function fullBags(character: Pick<CharacterSnapshot, 'bagSpace'>): BagSpace | null {
  const space = character.bagSpace
  if (!space || space.total <= 0) return null
  return space.free < BAG_FREE_MIN ? space : null
}
