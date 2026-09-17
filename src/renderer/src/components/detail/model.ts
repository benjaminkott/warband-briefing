/**
 * What the character page's panels show, worked out without a DOM: which
 * rows, in what order, and which one is marked. The panels only draw these.
 */

import type {
  CharacterSnapshot,
  CurrencyAmount,
  DungeonBest,
  GearItem,
  InstanceLockout,
  RaidBoss,
  RaidProgress,
  SeasonDungeon
} from '../../../../shared/types'
import type { DisplayFlags } from '../../../../shared/display'
import { difficultyLabel, type Translator } from '../../../../shared/i18n'
import type { ListTip } from '../../model/listTip'
import { Severity } from '../../enums/severity'
import { checkGear, type GearCheck } from '../../model/gear'
import { keyToRun, type KeyToRun } from '../../model/dungeons'
import type { IconName } from '../Icon'
import { DetailSection } from '../../enums/detailSection'

/**
 * The sections of the character page, in the order of its sub-navigation:
 * what resets this week, what the season built up, the equipped gear, the
 * professions, what the character carries. Eleven panels in one scroll were
 * too long to find anything in; one section is one screen.
 */
export const DETAIL_SECTIONS: Array<{ id: DetailSection; icon: IconName }> = [
  { id: DetailSection.Week, icon: 'calendar' },
  { id: DetailSection.Season, icon: 'flag' },
  { id: DetailSection.Gear, icon: 'shield' },
  { id: DetailSection.Professions, icon: 'anvil' },
  { id: DetailSection.Inventory, icon: 'bag' }
]

export function isDetailSection(value: unknown): value is DetailSection {
  return DETAIL_SECTIONS.some((section) => section.id === value)
}

/**
 * The season's dungeons by score, their sum, and the key to run. A dungeon
 * of the season never run is a row without a best, at the foot: the score
 * counts it as nothing, and so it is where the score has the most room.
 */
export function bestRows(
  bests: DungeonBest[],
  dungeons: SeasonDungeon[] = []
): { rows: KeyToRun[]; total: number; weakest: KeyToRun | null } {
  const run = new Set(bests.map((best) => best.mapChallengeModeId))
  const rows: KeyToRun[] = [...bests]
    .sort((a, b) => b.score - a.score)
    .map((best) => ({ dungeon: { mapChallengeModeId: best.mapChallengeModeId, name: best.name }, best }))
  for (const dungeon of dungeons) if (!run.has(dungeon.mapChallengeModeId)) rows.push({ dungeon, best: null })
  const total = bests.reduce((sum, best) => sum + best.score, 0)
  const key = keyToRun(bests, dungeons)
  const weakest = key ? (rows.find((row) => row.dungeon.mapChallengeModeId === key.dungeon.mapChallengeModeId) ?? null) : null
  return { rows, total, weakest }
}

/**
 * The raid difficulties as columns, easiest first: Blizzard's ids for LFR,
 * normal, heroic, mythic. The order is the one a raid is cleared in.
 */
export const RAID_DIFFICULTIES: readonly number[] = [17, 14, 15, 16]

export interface RaidCell {
  difficultyId: number
  /** Bosses with at least one kill on this difficulty. */
  killed: number
  total: number
  /** Every boss of the raid, in order, with its kills on this difficulty. */
  bosses: Array<{ name: string; kills: number }>
}

export interface RaidRow {
  raid: RaidProgress
  cells: RaidCell[]
  /** Any kill at all, on any difficulty. */
  started: boolean
}

function raidCell(bosses: RaidBoss[], difficultyId: number): RaidCell {
  const rows = bosses.map((boss) => ({ name: boss.name, kills: boss.kills[difficultyId] ?? 0 }))
  return { difficultyId, killed: rows.filter((boss) => boss.kills > 0).length, total: rows.length, bosses: rows }
}

/**
 * The season's raids, newest first, each with a cell per difficulty. The
 * journal lists them oldest first; the raid a player is in is the last
 * one, so it goes to the top.
 */
export function raidRows(raids: RaidProgress[]): RaidRow[] {
  return [...raids].reverse().map((raid) => {
    const cells = RAID_DIFFICULTIES.map((difficultyId) => raidCell(raid.bosses, difficultyId))
    return { raid, cells, started: cells.some((cell) => cell.killed > 0) }
  })
}

/**
 * The tip of a raid cell: the difficulty with its count as the heading,
 * then every boss in the raid's order, with its kills or `open`. The open
 * ones are what a player looks for in a cell that is not full.
 */
export function raidCellTip(tr: Translator, cell: RaidCell): ListTip {
  return {
    heading: tr.t('detail.raids.tipHeading', {
      difficulty: difficultyLabel(tr, cell.difficultyId, ''),
      killed: cell.killed,
      total: cell.total
    }),
    rows: cell.bosses.map((boss) =>
      boss.kills > 0
        ? { label: boss.name, value: tr.t('detail.raids.kills', { count: boss.kills }), tone: Severity.Ok }
        : { label: boss.name, value: tr.t('detail.raids.open'), tone: Severity.Warn }
    )
  }
}

/** Raids first: they are the weekly ones, and the ones a player plans around. */
export function lockoutRows(lockouts: InstanceLockout[]): InstanceLockout[] {
  return [...lockouts].sort((a, b) => Number(b.isRaid) - Number(a.isRaid))
}

export interface GearRows {
  rows: GearItem[]
  check: GearCheck
  /** The items with something still open, for the row's mark. */
  open: Set<GearItem>
  emptySockets: Set<GearItem>
}

/** Every equipped item in slot order, with what the gear check found against each. */
export function gearRows(character: CharacterSnapshot, flags: DisplayFlags): GearRows {
  const check = checkGear(character, flags)
  const emptySockets = new Set(check.emptySockets)
  const open = new Set([...check.missingEnchants, ...check.emptySockets])
  return { rows: [...character.gear].sort((a, b) => a.slot - b.slot), check, open, emptySockets }
}

/**
 * Watched currencies first, then the capped ones, then by amount: the top of
 * the list is what the user asked about, not the biggest number.
 */
export function currencyRows(character: CharacterSnapshot, tracked: Set<number>): CurrencyAmount[] {
  return [...character.currencies].sort(
    (a, b) =>
      Number(tracked.has(b.id)) - Number(tracked.has(a.id)) ||
      Number(b.weeklyMax !== null) - Number(a.weeklyMax !== null) ||
      b.quantity - a.quantity
  )
}

/** A currency's weekly cap is reached. */
export function capReached(currency: CurrencyAmount): boolean {
  return currency.weeklyMax !== null && (currency.earnedThisWeek ?? 0) >= currency.weeklyMax
}
