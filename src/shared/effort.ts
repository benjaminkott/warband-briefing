/**
 * Time as the measure: how long a step of the week takes.
 *
 * The plan prices a step in actions and item level (`plan.ts`); the player
 * with an evening of sixty minutes asks a third question - does it fit? A
 * key is forty minutes, a world boss ten, a weekly quest fifteen. The
 * figures are estimates: a key at +2 and one at +12 do not take the same
 * time, and a group takes its own. They are the season's, so they live in
 * the catalog like the quest ids; the ones here stand in where a catalog
 * has none.
 */

import { seasonCatalog } from './seasonCatalog'
import { VaultCategory } from './enums/vaultCategory'

/** Minutes for each kind of step, one figure per unit the step is counted in. */
export interface Minutes {
  /** Opening the vault and taking the reward. */
  claim: number
  /** One raid boss. */
  raidBoss: number
  /** One dungeon, keystone or not. */
  dungeon: number
  /** One world activity: a delve, a world boss. */
  worldActivity: number
  /** One weekly quest. */
  weekly: number
  /** One tracked activity. */
  activity: number
  /** One world boss. */
  worldBoss: number
  /** Spending a full concentration bar: one craft. */
  concentration: number
  /** One bare slot: the auction house and the enchant. */
  gear: number
  /** One kind of supply that runs short: the auction house or the bank. */
  supply: number
}

export const DEFAULT_MINUTES: Minutes = {
  claim: 2,
  raidBoss: 15,
  dungeon: 40,
  worldActivity: 10,
  weekly: 15,
  activity: 15,
  worldBoss: 10,
  concentration: 3,
  gear: 5,
  supply: 5
}

/** The evening a fresh install plans for: an hour and a half. */
export const DEFAULT_EVENING_MINUTES = 90

/** The evenings a player can pick, in minutes. */
export const EVENING_CHOICES: readonly number[] = [30, 45, 60, 90, 120, 180]

/** The season's figures over the defaults: a fetched catalog may know none of them. */
export function seasonMinutes(): Minutes {
  const own = seasonCatalog().minutes ?? {}
  const minutes = { ...DEFAULT_MINUTES }
  for (const key of Object.keys(DEFAULT_MINUTES) as Array<keyof Minutes>) {
    const value = own[key]
    if (typeof value === 'number' && value >= 0) minutes[key] = value
  }
  return minutes
}

/** What one unit of a vault row takes: a boss kill, a dungeon, a world activity. */
export function vaultUnitMinutes(category: VaultCategory, minutes: Minutes = seasonMinutes()): number {
  switch (category) {
    case VaultCategory.Raid:
      return minutes.raidBoss
    case VaultCategory.Dungeon:
      return minutes.dungeon
    case VaultCategory.World:
      return minutes.worldActivity
  }
}

/** What filling the next slot of a row takes: the units still missing, each at its price. */
export function vaultStepMinutes(category: VaultCategory, missing: number, minutes: Minutes = seasonMinutes()): number {
  return missing * vaultUnitMinutes(category, minutes)
}

/** The stored evening, or the default where the config has none or nonsense. */
export function eveningMinutesOf(config: { eveningMinutes?: unknown } | null | undefined): number {
  const value = config?.eveningMinutes
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : DEFAULT_EVENING_MINUTES
}
