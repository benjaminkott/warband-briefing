/**
 * What the inventory list shows, worked out without a DOM: the items of a
 * container in the order a player scans them, cut down to a search, and
 * the sums the panel's caption names. The character page and the gold
 * view draw the same list off this.
 */

import type { BagItem, Container } from '../../../shared/types'
import { EQUIPMENT_CATEGORIES, ITEM_CATEGORY_ORDER, ItemCategory } from '../../../shared/enums/itemCategory'

/**
 * Rarer first, then the bigger stack, then the name. A purple stands out
 * at the top and the grey junk sinks, which is the order a player sorts
 * their bags into by hand.
 */
export function sortItems(items: BagItem[]): BagItem[] {
  return [...items].sort((a, b) => (b.quality ?? -1) - (a.quality ?? -1) || b.count - a.count || a.name.localeCompare(b.name))
}

/** The items whose name holds the query, whatever the case; every item for an empty query. */
export function matchItems(items: BagItem[], query: string): BagItem[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return items
  return items.filter((item) => item.name.toLocaleLowerCase().includes(needle))
}

export interface InventoryGroup {
  container: Container
  /** The container's items that match, in order. */
  items: BagItem[]
}

/**
 * One group per container, its items sorted and cut to the query. Without
 * a query every container stays, an empty one too - its free slots are
 * the answer to "is there room". With one, only a container that has a
 * match: a search shows where the thing is, not where it is not.
 */
export function inventoryGroups(containers: Container[], query: string): InventoryGroup[] {
  const searching = query.trim().length > 0
  return containers
    .map((container) => ({ container, items: sortItems(matchItems(container.items, query)) }))
    .filter((group) => !searching || group.items.length > 0)
}

/**
 * What the list draws: while a search is on, every container with a
 * match - "where are my flasks" is answered across the bank - and
 * otherwise the one tab the player opened, alone, like the bank in the
 * game. A tab out of range (the containers changed under the choice)
 * falls back to the first.
 */
export function shownGroups(containers: Container[], query: string, selected: number): InventoryGroup[] {
  if (query.trim().length > 0) return inventoryGroups(containers, query)
  const container = containers[selected] ?? containers[0]
  return container ? [{ container, items: sortItems(container.items) }] : []
}

export interface InventoryTotals {
  /** Distinct items. */
  kinds: number
  /** Every stack summed. */
  count: number
  free: number
  slots: number
}

export function inventoryTotals(containers: Container[]): InventoryTotals {
  return containers.reduce<InventoryTotals>(
    (sum, container) => ({
      kinds: sum.kinds + container.items.length,
      count: sum.count + container.items.reduce((n, item) => n + item.count, 0),
      free: sum.free + container.free,
      slots: sum.slots + container.slots
    }),
    { kinds: 0, count: 0, free: 0, slots: 0 }
  )
}

/** The items of one group, the way a bag addon draws them: a heading and a run of tiles. */
export interface CategoryGroup {
  category: ItemCategory
  items: BagItem[]
}

/**
 * Gear by its level, the rest rarer first, then the bigger stack, then
 * the name: the order a player scans a run of tiles in.
 */
function sortTiles(items: BagItem[]): BagItem[] {
  return [...items].sort(
    (a, b) =>
      (b.itemLevel ?? 0) - (a.itemLevel ?? 0) || (b.quality ?? -1) - (a.quality ?? -1) || b.count - a.count || a.name.localeCompare(b.name)
  )
}

/**
 * The items sorted into their groups, in the order the groups stand in;
 * a group nothing is in is left out. An item the lexicon does not know
 * goes with the ones the app has no word for: a tile without a group is
 * still a tile.
 */
export function categoryGroups(items: BagItem[]): CategoryGroup[] {
  const byCategory = new Map<ItemCategory, BagItem[]>()
  for (const item of items) {
    const category = item.category ?? ItemCategory.Other
    const list = byCategory.get(category) ?? []
    list.push(item)
    byCategory.set(category, list)
  }
  return ITEM_CATEGORY_ORDER.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    items: sortTiles(byCategory.get(category)!)
  }))
}

/** The fewest tiles a group lays across: room for a word of heading over one tile. */
export const MIN_GROUP_SPAN = 2

/** The most tiles a group lays across: a wider row is a line too long to scan. */
export const MAX_GROUP_SPAN = 12

/** The fewest columns left in a band for a big group to start there and wrap, instead of in the next band. */
export const MIN_GROUP_REST = 6

/** The columns the packing counts with before the field has said its own: a first frame that overflows would jump. */
const COLUMNS_UNKNOWN = 13

/**
 * The tiles each group lays across on a field of `columns` cells, the
 * way a bag addon fills its window with bands of cards: a card takes its
 * tiles across - a dozen at most, a wider row is too long to scan - and
 * one column more, the free one beside it; a card that does not fit the
 * rest of the band takes that rest and wraps within it, so the band is
 * full, unless the rest is too narrow for a group to read as one - then
 * it starts the next band. The cards of a band share their top, so their
 * tiles stand on one line; the next band begins under the tallest. The
 * grid places the cards in order and breaks a band where a card does not
 * fit, so the spans here follow the same rule and the two agree.
 */
export function packBands(counts: readonly number[], columns: number): number[] {
  const width = columns > 0 ? Math.max(MIN_GROUP_SPAN + 1, columns) : COLUMNS_UNKNOWN
  const spans: number[] = []
  let left = width
  for (const count of counts) {
    const want = Math.max(MIN_GROUP_SPAN, Math.min(count, MAX_GROUP_SPAN, width - 1))
    let span: number
    if (want + 1 <= left) span = want
    else if (left - 1 >= Math.min(want, MIN_GROUP_REST)) span = left - 1
    else {
      span = want
      left = width
    }
    spans.push(span)
    left -= span + 1
    if (left <= 0) left = width
  }
  return spans
}

/**
 * The figure on a tile: the item level of a piece of gear, the count of a
 * stack, nothing on a single item - the corner of the tile says what a
 * player wants to read off it without the tooltip.
 */
export function tileFigure(item: BagItem): number | null {
  if (item.category && EQUIPMENT_CATEGORIES.includes(item.category) && item.itemLevel) return item.itemLevel
  return item.count > 1 ? item.count : null
}

/**
 * Several containers as one: the tabs of a bank as one bag, the way a bag
 * addon shows a bank with the tabs folded away. A stack of one item in two
 * tabs is one stack here; the space is the sum. What an item is (quality,
 * tier, tooltip) comes from the first tab that holds it.
 */
export function mergeContainers(containers: Container[], name: string | null): Container {
  const byId = new Map<number, BagItem>()
  let slots = 0
  let free = 0
  for (const container of containers) {
    slots += container.slots
    free += container.free
    for (const item of container.items) {
      const known = byId.get(item.itemId)
      if (known) known.count += item.count
      else byId.set(item.itemId, { ...item })
    }
  }
  return { name, slots, free, items: [...byId.values()] }
}
