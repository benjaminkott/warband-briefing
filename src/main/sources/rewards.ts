/**
 * Filling in the vault's reward item levels for characters no source could
 * report them for.
 *
 * What a vault slot pays out is a property of the season, not of the
 * character: every character who fills the dungeon row with a +14 key is
 * offered the same item level, and so is every raid slot at Heroic. Only the
 * companion addon can read those numbers - they live in the client, not in any
 * addon's saved data - but one character running it is enough to know them for
 * the whole roster.
 *
 * So the table is learned from whatever the read already contains rather than
 * maintained here by hand. That matters: reward levels change with every
 * season and most patches, and a list of numbers in this file would be wrong
 * the week after it was written, without anyone noticing.
 */

import type { VaultRow } from '../../shared/types'
import { WEEK_MS } from '../../shared/time'

/** The span between two weekly resets. */

interface Reward {
  itemLevel: number
  /** The reward's own name, when the source reported one. */
  item: string | null
}

/**
 * What filled the slot, which is what the reward hangs off: the raid row's
 * difficulty id, the keystone level, the world row's activity tier.
 */
function rewardKey(category: string, slot: VaultRow['slots'][number]): string | null {
  const level = slot.difficultyId ?? slot.level
  return level > 0 ? `${category}:${level}` : null
}

interface Learnable {
  vault: VaultRow[]
  weeklyUpdatedAt: number
}

/**
 * Reward per `category:level`, read off the characters that have one.
 *
 * Only this week's and last week's numbers are learned. An older snapshot
 * describes a season or a patch that may well have paid out something else,
 * and a stale item level is worse than none - it reads exactly like a current
 * one.
 */
export function learnRewards(characters: Learnable[], resetAt: number): Map<string, Reward> {
  const known = new Map<string, Reward>()

  for (const character of characters) {
    if (character.weeklyUpdatedAt < resetAt - WEEK_MS) continue
    for (const row of character.vault) {
      for (const slot of row.slots) {
        if (!slot.rewardItemLevel || slot.rewardItemLevel <= 0) continue
        const key = rewardKey(row.category, slot)
        if (!key) continue
        const existing = known.get(key)
        // A name is the rarer half, so a record that has one completes an
        // entry learned from a record that did not.
        if (!existing) {
          known.set(key, { itemLevel: slot.rewardItemLevel, item: slot.rewardItem ?? null })
        } else if (!existing.item && slot.rewardItem) {
          existing.item = slot.rewardItem
        }
      }
    }
  }

  return known
}

/**
 * Fills every slot that has no reward of its own from the learned table.
 * Characters keep what a source actually reported for them; nothing is
 * overwritten, and a slot whose level nobody has filled this season stays
 * blank rather than borrowing a number from a different one.
 */
export function applyRewards<T extends Learnable>(characters: T[], known: Map<string, Reward>): T[] {
  if (known.size === 0) return characters

  return characters.map((character) => {
    let filled = 0
    const vault = character.vault.map((row) => {
      let rowFilled = 0
      const slots = row.slots.map((slot) => {
        if (slot.rewardItemLevel && slot.rewardItemLevel > 0) return slot
        const key = rewardKey(row.category, slot)
        const reward = key ? known.get(key) : undefined
        if (!reward) return slot
        rowFilled += 1
        return { ...slot, rewardItemLevel: reward.itemLevel, rewardItem: reward.item }
      })
      filled += rowFilled
      return rowFilled > 0 ? { ...row, slots } : row
    })
    return filled > 0 ? { ...character, vault } : character
  })
}
