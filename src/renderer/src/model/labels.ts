/**
 * Which word and which mark a domain token gets, in one place.
 *
 * The card, the table, the character page and the settings all name the same
 * things - a vault row, a goal kind, an area a source supplies - and they
 * have to name them alike, or the reader has to learn that "Dungeon" on the
 * card and "Keys" on the page are the same row.
 */

import type { TranslationKey, Translator } from '../../../shared/i18n'
import type { SupplyGroup } from '../../../shared/supplies'
import type { IconName } from '../components/Icon'
import type { GoalKind } from '../../../shared/enums/goalKind'
import type { VaultCategory } from '../../../shared/enums/vaultCategory'

export const GOAL_LABEL_KEYS: Record<GoalKind, TranslationKey> = {
  vaultSlots: 'goal.vaultSlots',
  vaultRaid: 'goal.vaultRaid',
  vaultDungeon: 'goal.vaultDungeon',
  vaultWorld: 'goal.vaultWorld',
  mythicRuns: 'goal.mythicRuns',
  raidBosses: 'goal.raidBosses'
}

export const VAULT_LABEL_KEYS: Record<VaultCategory, TranslationKey> = {
  raid: 'vault.raid',
  dungeon: 'vault.dungeon',
  world: 'vault.world'
}

/** What a slot asks for, counted the way the vault counts it - a plural key. */
export const VAULT_REQ_KEYS: Record<VaultCategory, string> = {
  raid: 'vault.req.raid',
  dungeon: 'vault.req.dungeon',
  world: 'vault.req.world'
}

/** The row icons, matching what each row actually asks the player to do. */
export const VAULT_ROW_ICONS: Record<VaultCategory, IconName> = {
  raid: 'raid',
  dungeon: 'dungeon',
  world: 'globe'
}

/**
 * The areas a source can supply, in the order the character page lays them
 * out. The settings list the same areas per source, with the same marks.
 */
export const AREAS: ReadonlyArray<{ area: string; key: TranslationKey; icon: IconName }> = [
  { area: 'identity', key: 'area.identity', icon: 'users' },
  { area: 'vault', key: 'area.vault', icon: 'vault' },
  { area: 'runs', key: 'area.runs', icon: 'keystone' },
  { area: 'dungeonBests', key: 'area.dungeonBests', icon: 'dungeon' },
  { area: 'raidProgress', key: 'area.raidProgress', icon: 'raid' },
  { area: 'lockouts', key: 'area.lockouts', icon: 'raid' },
  { area: 'worldBosses', key: 'area.worldBosses', icon: 'star' },
  { area: 'weeklies', key: 'area.weeklies', icon: 'scroll' },
  { area: 'activities', key: 'area.activities', icon: 'flag' },
  { area: 'currencies', key: 'area.currencies', icon: 'coins' },
  { area: 'gear', key: 'area.gear', icon: 'shield' },
  { area: 'renown', key: 'area.renown', icon: 'medal' },
  { area: 'bags', key: 'area.bags', icon: 'bag' }
]

const AREA_BY_ID = new Map(AREAS.map((entry) => [entry.area, entry]))

/** An area a newer source names that this build does not know falls back to the identity mark. */
export function areaOf(area: string): { key: TranslationKey; icon: IconName } {
  return AREA_BY_ID.get(area) ?? AREAS[0]!
}

/** The word for a supply group the app knows; a group a fetched catalog adds keeps the catalog's English name. */
const SUPPLY_LABEL_KEYS: Partial<Record<string, TranslationKey>> = {
  flask: 'supply.flask',
  potion: 'supply.potion',
  food: 'supply.food',
  healthPotion: 'supply.healthPotion',
  manaPotion: 'supply.manaPotion',
  rune: 'supply.rune'
}

export function supplyLabel(tr: Translator, group: Pick<SupplyGroup, 'id' | 'name'>): string {
  const key = SUPPLY_LABEL_KEYS[group.id]
  return key ? tr.t(key) : group.name
}
