/**
 * Fixtures for the tests. A snapshot as the sources report a character
 * with nothing on it, and the fields a test names on top; a vault row from
 * its thresholds and one count, the way no source can hand it over.
 */

import type { CharacterSnapshot, VaultRow } from './types'
import type { VaultCategory } from './enums/vaultCategory'
import { Region } from './enums/region'

/** A level-capped mage on Blackmoore with nothing to show, plus `fields`. */
export function snapshot(name: string, fields: Partial<CharacterSnapshot> = {}): CharacterSnapshot {
  return {
    key: `realm-${name.toLowerCase()}`,
    name,
    realm: 'Blackmoore',
    realmSlug: 'blackmoore',
    region: Region.Eu,
    className: 'Magier',
    classToken: 'MAGE',
    spec: null,
    level: 90,
    itemLevel: null,
    faction: null,
    guild: null,
    money: null,
    mythicRating: null,
    playedTotal: null,
    playedLevel: null,
    keystone: null,
    mythicRuns: [],
    vault: [],
    lockouts: [],
    worldBosses: [],
    currencies: [],
    weeklies: [],
    activities: [],
    dungeonBests: [],
    raidProgress: [],
    gear: [],
    renown: [],
    xp: null,
    zone: null,
    lastActivity: null,
    auctions: null,
    mailCount: null,
    bagSpace: null,
    bags: null,
    bank: [],
    professions: [],
    cooldowns: [],
    updatedAt: 0,
    weeklyUpdatedAt: 0,
    vaultRewardWaiting: false,
    stale: false,
    accountName: 'WOW1',
    accounts: ['WOW1'],
    sources: [],
    provenance: {},
    ...fields
  }
}

/** A vault row with `progress` in the row's own unit, priced where `rewards` says. */
export function vaultRow(category: VaultCategory, thresholds: number[], progress: number, rewards: number[] = []): VaultRow {
  return {
    category,
    slots: thresholds.map((threshold, index) => ({
      threshold,
      progress: Math.min(progress, threshold),
      level: 0,
      rewardItemLevel: rewards[index] ?? null,
      unlocked: progress >= threshold
    })),
    unlockedCount: thresholds.filter((threshold) => progress >= threshold).length
  }
}
