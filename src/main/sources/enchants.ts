/**
 * Which slots take an enchant, learned from the roster.
 *
 * The set moves with the expansion - Midnight enchants the head and the
 * shoulders, which The War Within did not, and seems to have dropped the
 * wrists and the cloak, which it did. A list in this file would be right for
 * one season and quietly wrong the next, exactly like a table of vault
 * rewards would be. So the roster is the list: a slot some character at the
 * cap has enchanted is a slot that takes one, and an alt with that slot bare
 * is the thing worth pointing at. Only a roster with no enchant anywhere
 * falls back to the slots every expansion so far has had.
 */

import type { GearItem } from '../../shared/types'

/** Chest, legs, feet, rings, main hand: enchantable in every expansion to date. */
const BASELINE_SLOTS: readonly number[] = [5, 7, 8, 11, 12, 16]

interface Geared {
  level: number
  gear: GearItem[]
}

/** Slots any character at the cap wears an enchant on. */
export function learnEnchantSlots(characters: Geared[], maxLevel: number): Set<number> {
  const slots = new Set<number>()
  for (const character of characters) {
    // Below the cap the gear is whatever levelling handed out, often with an
    // enchant from an expansion ago still on it; that says nothing about now.
    if (character.level < maxLevel) continue
    for (const item of character.gear) {
      if (item.enchantId !== null && item.enchantId > 0) slots.add(item.slot)
    }
  }
  return slots
}

/** Marks every worn item with whether its slot is one the roster enchants. */
export function applyEnchantSlots<T extends Geared>(characters: T[], learned: Set<number>): T[] {
  const slots = learned.size > 0 ? learned : new Set(BASELINE_SLOTS)
  return characters.map((character) =>
    character.gear.length === 0
      ? character
      : {
          ...character,
          gear: character.gear.map((item) => ({ ...item, enchantable: slots.has(item.slot) }))
        }
  )
}
