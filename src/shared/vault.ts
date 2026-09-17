/**
 * The shape of the Great Vault - row order, slot thresholds, and how a row is
 * assembled from whatever a source managed to report.
 *
 * Shared rather than main-only on purpose: the UI has to be able to draw a row
 * no source reported, and it can only do that if it knows what that row would
 * have looked like. A vault with a missing row is not a shorter vault; it is a
 * vault with three slots nobody has filled yet, and that is exactly what the
 * player needs to see.
 */

import type { VaultRow, VaultSlot } from './types'
import { VaultCategory } from './enums/vaultCategory'

/** Row order as the Great Vault draws it, top to bottom. */
export const VAULT_ORDER: readonly VaultCategory[] = Object.values(VaultCategory)

/**
 * Slot thresholds per row. The dungeon row counts any Heroic, Mythic,
 * Timewalking or keystone dungeon, and the world row any world activity - not
 * only delves.
 */
export const VAULT_THRESHOLDS: Record<VaultCategory, number[]> = {
  raid: [2, 4, 6],
  dungeon: [1, 4, 8],
  world: [2, 4, 8]
}

/** Builds a complete three-slot row, filling gaps with locked slots. */
export function buildVaultRow(
  category: VaultCategory,
  slots: Array<Omit<VaultSlot, 'difficultyId'> & { difficultyId?: number | null }>
): VaultRow {
  const filled = VAULT_THRESHOLDS[category].map(
    (threshold) =>
      slots.find((s) => s.threshold === threshold) ?? {
        threshold,
        progress: 0,
        level: 0,
        rewardItemLevel: null,
        unlocked: false
      }
  )
  return { category, slots: filled, unlockedCount: filled.filter((s) => s.unlocked).length }
}

export function emptyVaultRow(category: VaultCategory): VaultRow {
  return buildVaultRow(category, [])
}

/**
 * Row categories as older versions of the app wrote them. The dungeon row was
 * called "mythicPlus" back when it was modelled as a Mythic+ row, and snapshots
 * persisted then still say so. Left unmapped, such a row would not match any
 * category and would quietly come back empty - the vault would report a week of
 * keystone runs as untouched.
 */
const LEGACY_CATEGORIES: Record<string, VaultCategory> = { mythicPlus: VaultCategory.Dungeon }

/**
 * The vault as it is drawn: all three rows, in order, legacy names resolved,
 * and rows no source reported standing in as untouched rather than dropping
 * out.
 */
export function fullVault(rows: VaultRow[]): VaultRow[] {
  const byCategory = new Map<string, VaultRow>()
  for (const row of rows) {
    const category = LEGACY_CATEGORIES[row.category] ?? row.category
    byCategory.set(category, category === row.category ? row : { ...row, category })
  }
  return VAULT_ORDER.map((category) => byCategory.get(category) ?? emptyVaultRow(category))
}

/** The next slot a vault row is short of, and what it would take to fill it. */
export interface VaultGapStep {
  category: VaultCategory
  /** How much progress the slot still needs, counted the way the row counts. */
  missing: number
  /** Which slot of the row it unlocks, counted from 1. */
  slot: number
  /** How many slots the row has at all - three, in every row the game has. */
  slots: number
  /**
   * What the slot pays: the reward level the row already pays out, at the
   * level the character runs. Null where no slot of the row is unlocked yet
   * or no source knows the reward.
   */
  rewardItemLevel: number | null
  /** How far that reward is above the character's item level; null when unknown. */
  gain: number | null
}

/**
 * The next slot a row is short of, priced, or null when the row is full.
 *
 * The client only prices a slot once it is unlocked. The slots before it in
 * the same row are, and the next one pays what they pay, or more - so the
 * best of those is the floor the step is worth.
 */
export function priceVaultRow(row: VaultRow, itemLevel: number | null): VaultGapStep | null {
  const index = row.slots.findIndex((slot) => !slot.unlocked)
  if (index === -1) return null
  const slot = row.slots[index]!
  // A row past its threshold that is still not flagged unlocked needs one
  // more of whatever it counts, never zero.
  const missing = Math.max(slot.threshold - slot.progress, 1)
  const paidBefore = row.slots.reduce<number | null>(
    (best, other) => (other.unlocked && other.rewardItemLevel !== null ? Math.max(best ?? 0, other.rewardItemLevel) : best),
    null
  )
  const rewardItemLevel = slot.rewardItemLevel ?? paidBefore
  const gain = rewardItemLevel !== null && itemLevel !== null ? Math.round(rewardItemLevel - itemLevel) : null
  return { category: row.category, missing, slot: index + 1, slots: row.slots.length, rewardItemLevel, gain }
}
