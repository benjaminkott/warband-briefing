/**
 * What the character page's panels show, worked out without a DOM: which
 * rows, in what order, and which one is marked. The panels only draw these.
 */

import type {
  AppConfig,
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
import { checkGear, slotLabel, slotList, type GearCheck } from '../../model/gear'
import { keyToRun, type KeyToRun } from '../../model/dungeons'
import { supplyStock } from '../../../../shared/supplies'
import { concentrationFull } from '../../model/overview'
import { supplyLabel } from '../../model/labels'
import { counted, type Task } from '../../model/tasks'
import { TaskKind } from '../../enums/taskKind'
import { TaskState } from '../../enums/taskState'
import type { IconName } from '../Icon'
import { DetailSection } from '../../enums/detailSection'

/**
 * The sections of the character page, in the order of its sub-navigation:
 * a summary of the others, what resets this week, what the season built
 * up, the equipped gear, the professions, the currencies, what the
 * character carries. Eleven panels in one scroll were too long to find
 * anything in; one section is one screen.
 */
export const DETAIL_SECTIONS: Array<{ id: DetailSection; icon: IconName }> = [
  { id: DetailSection.Overview, icon: 'gauge' },
  { id: DetailSection.Week, icon: 'calendar' },
  { id: DetailSection.Season, icon: 'flag' },
  { id: DetailSection.Gear, icon: 'shield' },
  { id: DetailSection.Professions, icon: 'anvil' },
  { id: DetailSection.Currencies, icon: 'coins' },
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

/*
 * The overview section: the lines of its summary panels. Each panel says in
 * a few lines what its section says in full, and only what needs a look.
 */

/** One line of a summary panel: what, how much, in which tone. */
export interface SummaryLine {
  icon: IconName
  label: string
  value: string
  tone: Severity
  tip?: string
}

/** The open weekly tasks the week's summary lists; the rest is a count under them. */
export const SUMMARY_TASKS = 5

/**
 * The week: the first open tasks in the list's order, and a count of the
 * rest. The vault rows stay out, because the vault block stands beside the
 * panel. A reward to claim is in the done tone: it waits only for a visit.
 */
export function taskLines(tr: Translator, tasks: Task[]): SummaryLine[] {
  const open = counted(tasks).filter((task) => task.kind !== TaskKind.Vault && task.state !== TaskState.Done)
  const lines: SummaryLine[] = open.slice(0, SUMMARY_TASKS).map((task) => ({
    icon: task.icon,
    label: task.label,
    value: task.note ?? '',
    tone: task.state === TaskState.Ready ? Severity.Ok : Severity.Info,
    tip: typeof task.tip === 'string' ? task.tip : undefined
  }))
  const rest = open.length - lines.length
  if (rest > 0) lines.push({ icon: 'tasks', label: tr.plural('detail.overview.moreTasks', rest), value: '', tone: Severity.Info })
  return lines
}

/** The step of an upgrade track, from the tooltip's "Champion 4/8"; null without one. */
export function trackStep(track: string | null): { step: number; max: number } | null {
  const match = track?.match(/(\d+)\s*\/\s*(\d+)\s*$/)
  return match ? { step: Number(match[1]), max: Number(match[2]) } : null
}

/**
 * The item to upgrade next: of the items with steps left on their track,
 * the lowest item level, because a step there lifts the average the most.
 */
export function nextUpgrade(gear: GearItem[]): GearItem | null {
  let next: GearItem | null = null
  for (const item of gear) {
    const step = trackStep(item.track)
    if (!step || step.step >= step.max) continue
    if (!next || (item.itemLevel ?? Infinity) < (next.itemLevel ?? Infinity)) next = item
  }
  return next
}

/** The gear: the slots to fix, the weakest slot, the next upgrade. Empty without a source for the gear. */
export function gearLines(tr: Translator, character: CharacterSnapshot, flags: DisplayFlags): SummaryLine[] {
  const check = checkGear(character, flags)
  if (!check.known) return []
  const lines: SummaryLine[] = []
  if (check.missingEnchants.length > 0)
    lines.push({ icon: 'wand', label: tr.t('gear.row.enchant'), value: slotList(tr, check.missingEnchants), tone: Severity.Warn })
  if (check.emptySockets.length > 0) {
    lines.push({
      icon: 'gem',
      label: tr.plural('gear.row.sockets', check.emptySockets.length),
      value: slotList(tr, check.emptySockets),
      tone: Severity.Warn
    })
  }
  if (check.issues === 0) lines.push({ icon: 'check', label: tr.t('detail.overview.gearDone'), value: '', tone: Severity.Ok })
  if (check.weakest) {
    lines.push({
      icon: 'target',
      label: tr.t('gear.row.weakest'),
      value: `${slotLabel(tr, check.weakest.slot)} ${tr.formatNumber(Math.round(check.weakest.itemLevel ?? 0))}`,
      tone: Severity.Info
    })
  }
  const upgrade = nextUpgrade(character.gear)
  if (upgrade) {
    lines.push({
      icon: 'trendUp',
      label: tr.t('detail.overview.upgrade'),
      value: `${slotLabel(tr, upgrade.slot)} · ${upgrade.track}`,
      tone: Severity.Info,
      tip: upgrade.name
    })
  }
  return lines
}

/**
 * Mythic+ and the raid: the key that lifts the rating the most, and the
 * newest raid with a line for each difficulty that has a kill.
 */
export function keyLines(tr: Translator, character: CharacterSnapshot, dungeons: SeasonDungeon[]): SummaryLine[] {
  const lines: SummaryLine[] = []
  const key = keyToRun(character.dungeonBests ?? [], dungeons)
  if (key) {
    lines.push({
      icon: 'dungeon',
      label: tr.t('detail.overview.keyToRun'),
      value: key.best ? `${key.dungeon.name} +${key.best.level}` : `${key.dungeon.name} · ${tr.t('detail.overview.unrun')}`,
      tone: Severity.Info,
      tip: tr.t(key.best ? 'detail.bests.weakest' : 'detail.bests.unrun')
    })
  }
  const raid = raidRows(character.raidProgress ?? [])[0]
  if (raid) {
    const started = raid.cells.filter((cell) => cell.killed > 0)
    if (started.length === 0)
      lines.push({ icon: 'raid', label: raid.raid.name, value: tr.t('detail.overview.raidNone'), tone: Severity.Info })
    for (const cell of started) {
      lines.push({
        icon: 'raid',
        label: `${raid.raid.name} · ${difficultyLabel(tr, cell.difficultyId, '')}`,
        value: `${cell.killed}/${cell.total}`,
        tone: cell.killed === cell.total ? Severity.Ok : Severity.Info
      })
    }
  }
  return lines
}

/**
 * What the character holds that needs a look: the watched currencies, the
 * supplies under their minimum, the professions with concentration or
 * unspent knowledge. A supply that is not short is no line.
 */
export function resourceLines(
  tr: Translator,
  character: CharacterSnapshot,
  tracked: Set<number>,
  minimums: AppConfig['supplyMinimums']
): SummaryLine[] {
  const lines: SummaryLine[] = []
  for (const currency of character.currencies) {
    if (!tracked.has(currency.id)) continue
    const week =
      currency.weeklyMax !== null
        ? ` · ${tr.t('detail.overview.week', { earned: tr.formatNumber(currency.earnedThisWeek ?? 0), max: tr.formatNumber(currency.weeklyMax) })}`
        : ''
    lines.push({
      icon: 'coins',
      label: currency.name || tr.t('currency.unknown', { id: currency.id }),
      value: `${tr.formatNumber(currency.quantity)}${week}`,
      tone: capReached(currency) ? Severity.Ok : Severity.Info
    })
  }
  for (const entry of supplyStock(character, minimums) ?? []) {
    if (!entry.short) continue
    lines.push({
      icon: 'bag',
      label: supplyLabel(tr, entry.group),
      value: `${tr.formatNumber(entry.inBags)}/${tr.formatNumber(entry.needed)}`,
      tone: Severity.Warn
    })
  }
  for (const profession of character.professions ?? []) {
    const parts: string[] = []
    if (profession.concentration) {
      parts.push(
        tr.t('profession.concentration', {
          current: tr.formatNumber(profession.concentration.current),
          max: tr.formatNumber(profession.concentration.max)
        })
      )
    }
    if (profession.knowledge) parts.push(tr.plural('profession.knowledgePoints', profession.knowledge))
    if (parts.length === 0) continue
    const full = concentrationFull(profession)
    lines.push({
      icon: 'anvil',
      label: profession.name,
      value: parts.join(' · '),
      tone: full || profession.knowledge ? Severity.Warn : Severity.Info,
      tip: full ? tr.t('profession.concentrationFull') : undefined
    })
  }
  return lines
}
