/**
 * Carried: a thing in the bags that is itself a chore. A Trovehunter's
 * Bounty is a map to a hidden trove - as long as a character carries one,
 * a delve is owed; used, the map is gone, and so is the line. No reset,
 * no tick: the bags say it (C1, C8). Which items are such a chore is the
 * season's, so the catalog names them, like the supplies.
 */

import type { CharacterSnapshot } from './types'
import { seasonCatalog } from './seasonCatalog'
import { countIn } from './supplies'

/** One kind of carried chore: the items that count as it, and how many make the chore. */
export interface CarriedGroup {
  /** Stable id, the key of the task line. */
  id: string
  /** English name, where no bag has the item to name it in the client's language. */
  name: string
  /** Every item id that counts. */
  itemIds: number[]
  /** How many are owed before the line stands: one map, a hundred shards. Default one. */
  atLeast?: number
  /** How long the chore takes; the season's world activity where the group names none. */
  minutes?: number
}

/** What a character carries of one group, and whether that is a chore. */
export interface CarriedStock {
  group: CarriedGroup
  inBags: number
  inBank: number
  /** The item's name as the bag lists it - the client's language - or the catalog's. */
  name: string
  /** Bags and bank together reach the group's count. */
  owed: boolean
}

/** The season's groups; a fetched catalog from before them has none. */
export function seasonCarried(): CarriedGroup[] {
  return (seasonCatalog().carried ?? []).filter((group) => Array.isArray(group.itemIds) && group.itemIds.length > 0)
}

/** The name the bag gives the first item of the group, or the catalog's. */
function nameOf(character: Pick<CharacterSnapshot, 'bags' | 'bank'>, group: CarriedGroup): string {
  const ids = new Set(group.itemIds)
  const containers = [character.bags, ...character.bank]
  for (const container of containers) {
    const item = container?.items.find((each) => ids.has(each.itemId) && each.name)
    if (item) return item.name
  }
  return group.name
}

/**
 * Every group against a character's bags and bank. Null where no source
 * lists the bags: unknown is not none. The bank counts too - the map in
 * the bank is a trip to town, not a map that is not there.
 */
export function carriedStock(
  character: Pick<CharacterSnapshot, 'bags' | 'bank'>,
  groups: CarriedGroup[] = seasonCarried()
): CarriedStock[] | null {
  if (!character.bags) return null
  return groups.map((group) => {
    const inBags = countIn(character.bags, group.itemIds)
    const inBank = character.bank.reduce((sum, tab) => sum + countIn(tab, group.itemIds), 0)
    const atLeast = Math.max(1, group.atLeast ?? 1)
    return { group, inBags, inBank, name: nameOf(character, group), owed: inBags + inBank >= atLeast }
  })
}

/** The groups a character owes: the lines. Empty without bags. */
export function owedCarried(character: Pick<CharacterSnapshot, 'bags' | 'bank'>, groups: CarriedGroup[] = seasonCarried()): CarriedStock[] {
  return (carriedStock(character, groups) ?? []).filter((stock) => stock.owed)
}
