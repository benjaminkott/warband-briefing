/**
 * What an item is, out of the client's class code. The client numbers
 * its classes (`Enum.ItemClass`) and the companion writes the class and
 * the subclass as one code by the item id; this module turns the code
 * into the class the app names. The groups are the game's own, so a bag
 * here is sorted the way the client sorts it.
 */

import { ItemCategory, ITEM_CLASS_IDS } from './enums/itemCategory'
import { LexiconKind } from './enums/lexiconKind'
import type { Lexicon } from './lexicon'
import type { Container } from './types'

/** The client's class and subclass as one number, the way the register keeps it: a subclass is under a hundred. */
export function itemClassCode(classId: number, subclassId: number): number {
  return classId * 100 + subclassId
}

/** The class out of a code, the subclass dropped. */
export function classIdOf(code: number): number {
  return Math.floor(code / 100)
}

/** The group of an item by its class code; null where the code is not known, Other for a class the app has no word for. */
export function categoryOf(code: number | null | undefined): ItemCategory | null {
  if (typeof code !== 'number' || code < 0) return null
  return ITEM_CLASS_IDS[classIdOf(code)] ?? ItemCategory.Other
}

/** The containers with each item's group filled in from the lexicon; an item the lexicon does not know keeps none. */
export function withCategories(containers: Container[], lexicon: Lexicon): Container[] {
  const codes = lexicon[LexiconKind.ItemClass] ?? {}
  return containers.map((container) => ({
    ...container,
    items: container.items.map((item) => ({ ...item, category: categoryOf(codes[String(item.itemId)]) }))
  }))
}
