/**
 * Everything the dashboard needs beyond what the overview already computes.
 *
 * The overview answers "what is still open on this character". The dashboard
 * asks the same question of the whole roster at once, and that is a different
 * shape of answer: the cheapest win first, the roster's standing against its
 * goals, and where its numbers actually sit. Nothing here re-derives weekly
 * progress - it all goes through `weeklyProgress`, so a card and the dashboard
 * cannot disagree about how full a vault is.
 */

import type { CharacterSnapshot, DungeonBest, Goal, Renown, SeasonDungeon, VaultRow } from '../../../shared/types'
import type { Translator } from '../../../shared/i18n'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../shared/display'
import { seasonCatalog, defaultTrackedFactions } from '../../../shared/seasonCatalog'
import { bestGap, compareValue, planValue } from './plan'
import { seasonDungeons } from './dungeons'
import type { VaultGapStep } from '../../../shared/vault'
import { characterState, hasUnclaimedVault, isMaxLevel, playedLastWeek, raidKills, weeklyProgress, type WeeklyProgress } from './overview'
import { RenownKind } from '../../../shared/enums/renownKind'
import { FactionGroup } from '../../../shared/enums/factionGroup'
import { classColor } from '../enums/classToken'
import { isAsked } from '../../../shared/weeklyTask'

/**
 * The characters the dashboard reports a week for: at the level cap, with data
 * from this week. Everything else is either levelling or describes last week,
 * and counting it would only deflate the figures.
 */
export function activeRoster(characters: CharacterSnapshot[], maxLevel: number): CharacterSnapshot[] {
  return characters.filter((c) => !c.stale && isMaxLevel(c, maxLevel))
}

/**
 * A character the player is actually running right now.
 *
 * Deliberately stricter than the overview's `current` filter, which also keeps
 * every character at the level cap. On an account that has been played for
 * years that clause is most of the roster - a wall of max-level alts nobody
 * has logged into in months - and a board made mostly of those answers nothing.
 * So the test is being seen: this week, or the week before it. An uncollected
 * vault reward overrides that, because it is the one thing a character can be
 * owed while sitting untouched.
 */
export function isPlayed(character: CharacterSnapshot, resetAt: number): boolean {
  return playedLastWeek(character, resetAt) || hasUnclaimedVault(character)
}

export function playedRoster(characters: CharacterSnapshot[], resetAt: number): CharacterSnapshot[] {
  return characters.filter((character) => isPlayed(character, resetAt))
}

/** Everything the matrix shows about one character, in one row. */
export interface RosterRow {
  character: CharacterSnapshot
  /** The full weekly reading, so a tile can name the next step the same way a card does. */
  progress: WeeklyProgress
  flags: DisplayFlags
  /** The season's dungeons, so the step can name the one never run. */
  dungeons: SeasonDungeon[]
  /** All three rows, for the ring; the counts beside it are over the focus's rows. */
  vault: VaultRow[]
  vaultRows: VaultRow[]
  vaultUnlocked: number
  vaultTotal: number
  ratio: number
  /** The vault slot worth filling first; null when the vault is full. */
  gap: VaultGapStep | null
  openWeeklies: number
  totalWeeklies: number
  /** Tracked activities still open, beyond the user's own list. */
  openActivities: number
  /** Slots the gear check wants fixed. */
  gearIssues: number
  raidBosses: number
  /** Bosses the lockouts say the raids hold; 0 where no source reported it. */
  raidTotal: number
  runs: number
  /** Below the roster's cap there is no vault, no lockout and no weekly task. */
  levelling: boolean
  /**
   * Not seen for over a week. Quiet since the reset is the ordinary state of
   * an alt on a Wednesday and is not this - only a snapshot that has stopped
   * describing anything steps back off the board.
   */
  inactive: boolean
  unclaimed: boolean
  done: boolean
  /** How few actions the next slot is away; `Infinity` when there is none. */
  cost: number
  /** What the next slot pays over the character's item level; null where no slot is priced. */
  gain: number | null
}

/**
 * How urgent a row is, which is what the matrix sorts on.
 *
 * A reward already earned is lost at the reset, so it outranks everything
 * still to be earned. Below it comes what is still open, then what is done,
 * then the snapshots that describe last week, then the characters that have no
 * week at all.
 */
function bucket(row: RosterRow): number {
  if (row.unclaimed) return 0
  if (row.levelling) return 4
  if (row.character.stale) return 3
  return row.done ? 2 : 1
}

/**
 * The whole roster, one row each, most urgent first.
 *
 * Everything is included - levelling and stale characters too, dimmed rather
 * than dropped. The dashboard is the one view that answers "what does the
 * account look like right now", and a roster with rows quietly missing from it
 * cannot answer that. Filtering is the overview's job.
 */
export function rosterRows(
  characters: CharacterSnapshot[],
  goals: Goal[],
  maxLevel: number,
  resetAt: number,
  tr: Translator,
  flags: DisplayFlags = DISPLAY_DEFAULTS,
  dungeons: SeasonDungeon[] = []
): RosterRow[] {
  const rows = characters.map((character): RosterRow => {
    const progress = weeklyProgress(character, goals, flags)
    const gearIssues = progress.gearIssues
    const gap = bestGap(progress.vaultRows, character.itemLevel)
    const kills = raidKills(character)
    const { levelling, inactive, unclaimed } = characterState(character, maxLevel, resetAt)
    return {
      character,
      progress,
      flags,
      dungeons,
      vault: progress.vault,
      vaultRows: progress.vaultRows,
      vaultUnlocked: progress.vaultUnlocked,
      vaultTotal: progress.vaultTotal,
      ratio: progress.ratio,
      gap,
      openWeeklies: progress.openWeeklies,
      totalWeeklies: character.weeklies.filter(isAsked).length,
      openActivities: progress.openActivities,
      gearIssues,
      raidBosses: kills.defeated,
      raidTotal: kills.total,
      runs: character.mythicRuns.length,
      levelling,
      inactive,
      unclaimed,
      done: progress.done,
      ...planValue(character, progress, flags)
    }
  })

  // Within a bucket the plan decides: the biggest pay-out first, then the
  // fewest actions - the evening goes to the character whose next slot is
  // worth the most.
  return rows.sort(
    (a, b) =>
      bucket(a) - bucket(b) ||
      compareValue(a, b) ||
      // Two equally cheap rows: the character already furthest along gets the
      // most out of it, so that is the one worth doing first.
      b.vaultUnlocked - a.vaultUnlocked ||
      tr.compare(a.character.name, b.character.name)
  )
}

/** How the whole roster stands against one goal. */
export interface GoalRollup {
  goal: Goal
  /** Characters that met it. */
  met: number
  /** Characters it was measured against. */
  total: number
  /**
   * 0..1 across the roster: every character's progress towards the target,
   * capped at it, over what all of them together would need. A roster at 50%
   * is halfway to every character meeting the goal, not halfway to one of them.
   */
  ratio: number
}

export function goalRollups(characters: CharacterSnapshot[], goals: Goal[]): GoalRollup[] {
  return goals.map((goal) => {
    let met = 0
    let progress = 0
    for (const character of characters) {
      const entry = weeklyProgress(character, [goal]).goals[0]!
      if (entry.done) met++
      progress += Math.min(entry.current, goal.target)
    }
    const needed = goal.target * characters.length
    return { goal, met, total: characters.length, ratio: needed > 0 ? progress / needed : 0 }
  })
}

/**
 * A drawable class colour.
 *
 * `classColor` returns nothing for a class it does not know, which is what a
 * name wants - it then simply inherits its colour. A dot or a bar segment has
 * no colour to inherit and would be invisible, so it falls back to a neutral
 * one instead.
 */
function markColor(token: string | null): string {
  return classColor(token) ?? 'var(--text-faint)'
}

/** One character's place on a value scale, in its own class colour. */
export interface SpreadPoint {
  key: string
  name: string
  value: number
  color: string
  /** 0..1 along the min..max track. */
  position: number
}

/** A small set of numbers laid out on the range they span. */
export interface Spread {
  points: SpreadPoint[]
  min: number
  max: number
  average: number
}

/**
 * The roster's values on one scale.
 *
 * With half a dozen characters a histogram has more bars than data, so the
 * numbers are placed on the range they actually span instead: one dot per
 * character, in its class colour, which is the key the rest of the app already
 * uses. Characters no source reported a value for are left out rather than
 * counted as a zero that would stretch the range to nothing.
 */
export function spread(characters: CharacterSnapshot[], pick: (character: CharacterSnapshot) => number | null): Spread | null {
  const measured: Array<{ character: CharacterSnapshot; value: number }> = []
  for (const character of characters) {
    const value = pick(character)
    if (value !== null && value > 0) measured.push({ character, value })
  }
  if (measured.length === 0) return null

  const values = measured.map((entry) => entry.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min

  return {
    min,
    max,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    points: measured
      .sort((a, b) => a.value - b.value)
      .map((entry) => ({
        key: entry.character.key,
        name: entry.character.name,
        value: entry.value,
        color: markColor(entry.character.classToken),
        // A roster where everyone sits on the same number has no range to
        // spread over, so it sits in the middle of the track instead.
        position: span > 0 ? (entry.value - min) / span : 0.5
      }))
  }
}

/** How many characters of each class the roster holds. */
export interface ClassCount {
  token: string | null
  label: string
  count: number
  color: string
}

export function classBreakdown(characters: CharacterSnapshot[], tr: Translator): ClassCount[] {
  const byClass = new Map<string, ClassCount>()
  for (const character of characters) {
    const token = character.classToken ?? character.className
    const entry = byClass.get(token)
    if (entry) {
      entry.count++
      continue
    }
    byClass.set(token, {
      token: character.classToken,
      label: character.className,
      count: 1,
      color: markColor(character.classToken)
    })
  }
  return [...byClass.values()].sort((a, b) => b.count - a.count || tr.compare(a.label, b.label))
}

/** One row: a character, its best per dungeon, and which of them is weakest. */
export interface MatrixRow {
  character: CharacterSnapshot
  cells: Map<number, DungeonBest>
  /** Sum of the bests - the rating as the client builds it. */
  total: number
  /** The dungeon with the lowest best, or the first one never run. */
  weakest: number | null
  /** The dungeon with the highest best; a timed run wins a tie with an overtime one. */
  strongest: number | null
}

export interface DungeonMatrix {
  dungeons: SeasonDungeon[]
  rows: MatrixRow[]
  /** The highest level anywhere in it. */
  maxLevel: number
  /** The highest score any one dungeon is worth on the board - what the cells are coloured against. */
  maxScore: number
}

/**
 * Every character's best per dungeon, laid out as one table.
 *
 * The question it answers is not "how good is this character" - the score
 * already says that - but "which key should this character run": the column
 * where a row is lowest is where the rating still has room. The columns are
 * the season's dungeons: what the client listed, and what the roster has
 * run - so a dungeon nobody has touched yet is a column of dashes.
 */
export function dungeonMatrix(characters: CharacterSnapshot[], tr: Translator, listed: SeasonDungeon[] = []): DungeonMatrix | null {
  const columns = seasonDungeons(characters, listed, tr)
  if (columns.length === 0) return null

  let maxLevel = 0
  let maxScore = 0
  const rows: MatrixRow[] = []
  for (const character of characters) {
    const bests = character.dungeonBests ?? []
    if (bests.length === 0) continue
    const cells = new Map<number, DungeonBest>()
    let total = 0
    for (const best of bests) {
      cells.set(best.mapChallengeModeId, best)
      total += best.score
      maxLevel = Math.max(maxLevel, best.level)
      maxScore = Math.max(maxScore, best.score)
    }
    // A dungeon never run is the biggest gap of all; among the ones run, the
    // lowest key. Ties go to the first column, which is as good as any.
    let weakest: number | null = null
    let weakestLevel = Infinity
    let strongest: number | null = null
    let strongestRank = -1
    for (const column of columns) {
      const cell = cells.get(column.mapChallengeModeId)
      const level = cell ? cell.level : 0
      if (level < weakestLevel) {
        weakestLevel = level
        weakest = column.mapChallengeModeId
      }
      // Two levels apart is always the higher key; at the same level the
      // timed run is the better one.
      const rank = cell ? cell.level * 2 + (cell.inTime ? 1 : 0) : -1
      if (cell && rank > strongestRank) {
        strongestRank = rank
        strongest = column.mapChallengeModeId
      }
    }
    rows.push({ character, cells, total, weakest, strongest })
  }

  // Columns without a row is a list, not a board.
  if (rows.length === 0) return null
  rows.sort((a, b) => b.total - a.total || tr.compare(a.character.name, b.character.name))
  return { dungeons: columns, rows, maxLevel, maxScore }
}

/**
 * The colour of a key level on the board: green for the low end, blue in
 * the middle, pink at the top - the three tiers a player reads at a glance,
 * measured against the highest key on the board rather than a fixed table
 * that would be wrong the next season. Returned as hue/saturation/lightness
 * so the cell can paint a tint and a border from the same colour.
 */
export function heatColor(heat: number): string {
  const t = Math.max(0, Math.min(1, heat))
  // Green (140°) → blue (215°) → pink (330°), through the hue wheel the
  // short way at each step.
  const hue = t < 0.5 ? 140 + (215 - 140) * (t / 0.5) : 215 + (330 - 215) * ((t - 0.5) / 0.5)
  return `${Math.round(hue)} 70% 62%`
}

/** The rating scale's stops: green, then blue, pink at 3500, gold at 4000. */
export const RATING_GREEN = 2000
export const RATING_PINK = 3500
export const RATING_GOLD = 4000

/**
 * The rating on the key levels' green-to-pink scale, carried on past pink
 * to gold for the top end - through red and orange, the way heat goes.
 * Below 2000 a rating is not yet a colour; the season's first weeks are all
 * below it, so null says "leave the number alone".
 */
export function ratingColor(rating: number | null): string | null {
  if (rating === null || rating < RATING_GREEN) return null
  if (rating <= RATING_PINK) return heatColor((rating - RATING_GREEN) / (RATING_PINK - RATING_GREEN))
  const t = Math.min(1, (rating - RATING_PINK) / (RATING_GOLD - RATING_PINK))
  // Pink (330°) round to the app's gold (42° = 402°), a shade lighter as it goes.
  const hue = Math.round(330 + (402 - 330) * t) % 360
  return `${hue} ${Math.round(70 - 5 * t)}% ${Math.round(62 + 3 * t)}%`
}

/**
 * Dungeons a season's rating is made of. The rating is the sum of one best
 * run per dungeon, so a dungeon's points sit on the rating scale divided by
 * this: 500 points is what a 4000 rating asks of every dungeon.
 */
export const SEASON_DUNGEONS = 8

/** A single dungeon's points on the rating scale: gold at 4000 / 8. */
export function dungeonScoreColor(score: number): string | null {
  return ratingColor(score * SEASON_DUNGEONS)
}

/** The inline style that paints a rating in its colour; nothing below the scale. */
export function ratingStyle(color: string | null): Record<string, string> | undefined {
  return color ? { '--heat': color } : undefined
}

/** The week, summed over the active roster: the five figures across the top of the board. */
export interface WeekTotals {
  unlocked: number
  slots: number
  done: number
  runs: number
  bosses: number
  /** Average keystone level, over the characters actually carrying one. */
  keyAvg: number | null
}

export function weekTotals(active: CharacterSnapshot[], goals: Goal[], flags: DisplayFlags): WeekTotals {
  const progress = active.map((character) => weeklyProgress(character, goals, flags))
  // Only characters actually carrying a keystone average into anything; a
  // character without one has no level to average, not a level of zero.
  const keys = active.map((c) => c.keystone?.level).filter((level): level is number => typeof level === 'number' && level > 0)
  const avg = (values: number[]): number | null =>
    values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null
  return {
    unlocked: progress.reduce((sum, p) => sum + p.vaultUnlocked, 0),
    slots: progress.reduce((sum, p) => sum + p.vaultTotal, 0),
    done: progress.filter((p) => p.done).length,
    runs: active.reduce((sum, c) => sum + c.mythicRuns.length, 0),
    bosses: active.reduce((sum, c) => sum + raidKills(c).defeated, 0),
    keyAvg: avg(keys)
  }
}

/* ---------------- renown ---------------- */

/**
 * Renown is shared by the whole warband, so every character reports the
 * same factions. The snapshots differ only in age. For each faction, the
 * highest level wins, then the highest progress: that is the newest report.
 * `tracked` limits the result to those ids; empty keeps every faction the
 * client reports.
 */
export function warbandRenown(characters: CharacterSnapshot[], tracked: number[] = []): Renown[] {
  const best = new Map<number, Renown>()
  for (const character of characters) {
    for (const faction of character.renown ?? []) {
      if (tracked.length > 0 && !tracked.includes(faction.factionId)) continue
      const known = best.get(faction.factionId)
      const newer =
        !known ||
        faction.level > known.level ||
        (faction.level === known.level && (faction.paragon?.current ?? faction.current) > (known.paragon?.current ?? known.current))
      if (newer) best.set(faction.factionId, faction)
    }
  }
  // Renown first, then the reputations, each by level: a rank of 6 is not
  // a renown of 6.
  const rank = (faction: Renown): number => (faction.kind === RenownKind.Reputation ? 1 : 0)
  return [...best.values()].sort((a, b) => rank(a) - rank(b) || b.level - a.level || b.current - a.current)
}

/** A faction as the ring draws it: the progress, the level on the badge, the mark in the middle. */
export interface RenownFigure {
  factionId: number
  name: string
  /** Two or three letters in place of the crest of the faction. No source supplies the crest. */
  initials: string
  level: number
  /** The progress to the next level, or in the paragon cycle after the maximum level. */
  percent: number
  maxed: boolean
  /** The faction is in paragon cycles. */
  paragon: boolean
  /** A paragon reward waits at the faction. */
  rewardPending: boolean
  /** The stage under the name: the level or the rank, "Paragon", or the reward that waits. */
  stage: string
  /** The way to the next level or reward: what is earned, and what it takes; null once there is no next. */
  current: number | null
  max: number | null
  /** The text of the tip of the ring. */
  hint: string
}

/** The words with a capital letter give the initials: "Council of Dornogal" is CD, not COD. */
function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((word) => /^\p{Lu}/u.test(word))
    .map((word) => word[0]!)
  return (letters.length > 0 ? letters : [name[0] ?? '?']).slice(0, 3).join('')
}

/** The factions as figures for the ring, in the given order. */
export function renownFigures(tr: Translator, factions: Renown[]): RenownFigure[] {
  return factions.map((faction) => {
    const paragon = faction.maxed ? (faction.paragon ?? null) : null
    const current = paragon ? paragon.current : faction.current
    const max = paragon ? paragon.max : faction.max
    const share = max > 0 ? Math.min(current / max, 1) * 100 : 0
    const level = tr.t(faction.kind === RenownKind.Reputation ? 'renown.rank' : 'renown.level', {
      level: faction.level,
      max: faction.maxLevel ?? faction.level
    })
    // Past the last level the ring counts to a reward, and the stage says
    // so; a faction maxed without paragon has nowhere to go.
    const next = paragon !== null || !faction.maxed
    return {
      factionId: faction.factionId,
      name: faction.name,
      initials: initialsOf(faction.name),
      level: faction.level,
      percent: paragon ? share : faction.maxed ? 100 : share,
      maxed: faction.maxed,
      paragon: paragon !== null,
      rewardPending: paragon?.rewardPending ?? false,
      stage: paragon
        ? paragon.rewardPending
          ? tr.t('renown.rewardReady')
          : tr.t('renown.paragon')
        : faction.maxed
          ? `${level} · ${tr.t('renown.maxed')}`
          : level,
      current: next ? current : null,
      max: next ? max : null,
      hint: paragon
        ? paragon.rewardPending
          ? `${faction.name}: ${tr.t('renown.paragon')} · ${tr.t('renown.rewardReady')}`
          : tr.t('renown.paragonHint', { name: faction.name, current: tr.formatNumber(current), max: tr.formatNumber(max) })
        : faction.maxed
          ? `${faction.name}: ${tr.t(faction.kind === RenownKind.Reputation ? 'renown.rank' : 'renown.level', { level: faction.level, max: faction.maxLevel ?? faction.level })} · ${tr.t('renown.maxed')}`
          : tr.t(faction.kind === RenownKind.Reputation ? 'renown.rankHint' : 'renown.hint', {
              name: faction.name,
              level: faction.level,
              maxLevel: faction.maxLevel ?? 0,
              current: tr.formatNumber(current),
              max: tr.formatNumber(max)
            })
    }
  })
}

/** The figures of one group of the renown panel. */
export interface RenownGroup {
  group: FactionGroup
  figures: RenownFigure[]
}

/**
 * The renown panel in groups: the factions of the season and the factions
 * of the expansion. An empty selection shows the default set of the season,
 * not every faction the client reports: the client also reports the
 * factions of past seasons. A selected id the catalog does not name is
 * left out too - it is a leftover of an older catalog. An empty group is
 * left out.
 */
export function renownGroups(tr: Translator, characters: CharacterSnapshot[], tracked: number[]): RenownGroup[] {
  const factions = warbandRenown(characters, tracked.length > 0 ? tracked : defaultTrackedFactions())
  const groupOf = new Map(seasonCatalog().factions.map((faction) => [faction.id, faction.group]))
  const groups: RenownGroup[] = [
    { group: FactionGroup.Season, figures: [] },
    { group: FactionGroup.Expansion, figures: [] }
  ]
  for (const figure of renownFigures(tr, factions)) {
    const group = groupOf.get(figure.factionId)
    if (group !== undefined) groups.find((entry) => entry.group === group)!.figures.push(figure)
  }
  return groups.filter((group) => group.figures.length > 0)
}

/** Every faction the roster knows, by id, for the settings to pick from. */
export function knownFactions(characters: CharacterSnapshot[]): Array<{ id: number; name: string }> {
  return warbandRenown(characters).map((faction) => ({ id: faction.factionId, name: faction.name }))
}
