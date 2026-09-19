/**
 * Everything the overview needs to answer "what is still open this week".
 *
 * Card, table and summary bar all read from here, so they cannot disagree about
 * how many slots a character is missing or what counts as done.
 */

import type { CharacterSnapshot, CurrencyAmount, Goal, Profession, VaultRow } from '../../../shared/types'
import { fullVault, priceVaultRow, type VaultGapStep } from '../../../shared/vault'
import { WEEK_MS, splitDuration } from '../../../shared/time'
import type { Translator } from '../../../shared/i18n'
import { gearChores } from './gear'
import { DISPLAY_DEFAULTS, visibleActivities, type DisplayFlags } from '../../../shared/display'
import { goalsFor } from '../../../shared/assign'
import { seasonToken } from '../../../shared/seasonCatalog'
import { activityChoreId, vaultChoreId, wantsChore, weeklyChoreId } from '../../../shared/skips'
import { isOwed } from '../../../shared/weeklyTask'
import type { Region } from '../../../shared/enums/region'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { GoalKind } from '../../../shared/enums/goalKind'
import { GOAL_LABEL_KEYS } from './labels'
import { SortDirection } from '../enums/sortDirection'
import { SortKey } from '../enums/sortKey'
import { BrandId } from '../enums/brandId'
import { Severity } from '../enums/severity'
import { Tint } from '../enums/tint'
import { StateWord } from '../enums/stateWord'
import type { ChipModel } from '../components/ui/Chip'

/**
 * A reward is sitting in the Great Vault, uncollected. Either the client said
 * so, or the read saw filled slots on a snapshot from before the reset, which
 * says the same thing: the vault keeps what was earned until the next reset,
 * and the client only writes its own flag once someone logs in and looks - the
 * moment the reminder stops being worth anything. The reward is gone at the
 * next reset, so this is the one thing that cannot wait.
 */
export function hasUnclaimedVault(character: CharacterSnapshot): boolean {
  return character.vaultRewardWaiting === true
}

/**
 * Seen in the week before the current one. Someone who played last week is
 * part of the roster the player is actually running, so they belong in the
 * overview even while this week's data is still empty.
 */
export function playedLastWeek(character: CharacterSnapshot, resetAt: number): boolean {
  return character.weeklyUpdatedAt >= resetAt - WEEK_MS
}

/**
 * Last seen in the week that just ended: the character simply has not been
 * played since the reset. That is what most of a roster looks like on a
 * Wednesday morning, and it is not a fault in the data - "nothing done this
 * week" is a complete answer, not a missing one. So nothing here is dimmed or
 * called stale; the numbers on the snapshot are last week's, and the vault
 * still holds whatever they earned.
 */
export function isBetweenWeeks(character: CharacterSnapshot, resetAt: number): boolean {
  return character.stale && playedLastWeek(character, resetAt)
}

/**
 * Not seen for over a week. Here the snapshot really has stopped describing
 * anything: the week it belongs to is gone, and so is whatever its vault held.
 */
export function isInactive(character: CharacterSnapshot, resetAt: number): boolean {
  return character.stale && !playedLastWeek(character, resetAt)
}

/** The raid bosses a character killed this week, and how many its lockouts hold. */
export interface RaidKills {
  defeated: number
  /** 0 where no source reported a total. */
  total: number
}

/** Read once here: the goals, the board's rows, the table and the totals all count the same kills. */
export function raidKills(character: Pick<CharacterSnapshot, 'lockouts'>): RaidKills {
  const raids = character.lockouts.filter((lock) => lock.isRaid)
  return {
    defeated: raids.reduce((sum, lock) => sum + lock.defeated, 0),
    total: raids.reduce((sum, lock) => sum + lock.total, 0)
  }
}

export interface GoalProgress {
  goal: Goal
  current: number
  done: boolean
}

/** The one number a goal kind measures, for one character. */
export function goalValue(character: CharacterSnapshot, kind: GoalKind): number {
  const row = (category: VaultCategory): number => character.vault.find((entry) => entry.category === category)?.unlockedCount ?? 0
  switch (kind) {
    case GoalKind.VaultSlots:
      return character.vault.reduce((sum, entry) => sum + entry.unlockedCount, 0)
    case GoalKind.VaultDungeon:
      return row(VaultCategory.Dungeon)
    case GoalKind.VaultRaid:
      return row(VaultCategory.Raid)
    case GoalKind.VaultWorld:
      return row(VaultCategory.World)
    case GoalKind.MythicRuns:
      return character.mythicRuns.length
    case GoalKind.RaidBosses:
      return raidKills(character).defeated
  }
}

export function evaluateGoals(character: CharacterSnapshot, goals: Goal[]): GoalProgress[] {
  return goals.map((goal) => {
    const current = goalValue(character, goal.kind)
    return { goal, current, done: current >= goal.target }
  })
}

/** One of the user's weekly targets against the character, as a chip: unmet in the warning ink, met with the quiet tick. */
export function goalChip(tr: Translator, entry: GoalProgress): ChipModel {
  const label = tr.t(GOAL_LABEL_KEYS[entry.goal.kind])
  return {
    label,
    tone: entry.done ? Severity.Ok : Severity.Warn,
    icon: entry.done ? 'check' : 'dot',
    note: `${Math.min(entry.current, entry.goal.target)}/${entry.goal.target}`,
    numericNote: true,
    tip: tr.t('goal.progress', { goal: label, current: entry.current, target: entry.goal.target })
  }
}

export interface WeeklyProgress {
  /**
   * All three vault rows, in the vault's own order, missing ones included:
   * what a card or a ring draws. A skip hides nothing.
   */
  vault: VaultRow[]
  /**
   * The rows the character works on: all three, less the ones the player
   * took off the week (`skips.ts`). Every count below is over these rows,
   * and a chore is only ever one of them.
   */
  vaultRows: VaultRow[]
  vaultUnlocked: number
  /** Slots of the rows kept - 9 for a character that does everything. */
  vaultTotal: number
  /** 0..1 vault completion; drives the bar and the "open tasks" sort. */
  ratio: number
  /** The next slot each vault row is short of, priced, closest first. */
  gaps: VaultGapStep[]
  /** Weekly quests the user configured and kept that are still open. */
  openWeeklies: number
  /**
   * Tracked activities not yet done. Kept apart from the weeklies: the user
   * chose those, the tracker chose these, and "done for the week" is measured
   * against the user's list only.
   */
  openActivities: number
  /** Slots the gear check wants fixed - a bare ring, an empty socket. */
  gearIssues: number
  /**
   * Weekly-capped currencies whose name a source actually reported. Unnamed
   * ones are ids like "Currency 3376" - unreadable, and often leftovers from
   * old expansions, so they are left out rather than shown as a number.
   */
  weeklyCurrencies: CurrencyAmount[]
  /** How the character stands against the goals the user defined, the ones on a row it kept. */
  goals: GoalProgress[]
  /**
   * Every goal met - or, with no goals defined, the vault filled. This is what
   * "done for the week" means, and the user gets to say what it takes.
   */
  done: boolean
}

/** What each goal reads, so a goal on a row the player took off is not one of the character's. */
const GOAL_ROWS: Record<GoalKind, VaultCategory[]> = {
  vaultSlots: [VaultCategory.Raid, VaultCategory.Dungeon, VaultCategory.World],
  vaultRaid: [VaultCategory.Raid],
  vaultDungeon: [VaultCategory.Dungeon],
  vaultWorld: [VaultCategory.World],
  mythicRuns: [VaultCategory.Dungeon],
  raidBosses: [VaultCategory.Raid]
}

/**
 * The week of one character. What the player took off the list
 * (`skips.ts`) is not counted, not listed and not held against it. The
 * views' switches narrow it further: an activity filtered out or a gear
 * check switched off must not keep a character "busy".
 */
export function weeklyProgress(character: CharacterSnapshot, goals: Goal[] = [], flags: DisplayFlags = DISPLAY_DEFAULTS): WeeklyProgress {
  // A row no source reported is not a row that does not exist - it is three
  // slots nobody has filled yet, and those are the ones still worth doing. So
  // the vault is all nine slots, and the ones still open always count - for
  // the rows the player kept.
  const vault = fullVault(character.vault)
  const vaultRows = vault.filter((row) => wantsChore(character, vaultChoreId(row.category)))
  const vaultUnlocked = vaultRows.reduce((sum, row) => sum + row.unlockedCount, 0)
  const vaultTotal = vaultRows.reduce((sum, row) => sum + row.slots.length, 0)

  const gaps = vaultRows
    .map((row) => priceVaultRow(row, character.itemLevel))
    .filter((gap): gap is VaultGapStep => gap !== null)
    .sort((a, b) => a.missing - b.missing)

  const weeklyCurrencies = character.currencies.filter((c) => c.weeklyMax !== null && c.weeklyMax > 0 && c.name.length > 0)
  // A line the player took off the list (`skips.ts`) is not open either:
  // the count here is the count of the list's lines.
  const openWeeklies = character.weeklies.filter((task) => wantsChore(character, weeklyChoreId(task)) && isOwed(task)).length
  const openActivities = visibleActivities(character.activities, flags).filter((task) => wantsChore(character, activityChoreId(task)) && !task.done).length
  const gearIssues = gearChores(character, flags).issues

  // The character's own goals: the ones that name it beat the ones for all,
  // and a goal on a row the player took off is not the character's.
  const goalProgress = evaluateGoals(
    character,
    goalsFor(goals, character.key).filter((goal) => GOAL_ROWS[goal.kind].some((row) => wantsChore(character, vaultChoreId(row))))
  )
  const openGoals = goalProgress.filter((entry) => !entry.done).length

  const missingSlots = Math.max(vaultTotal - vaultUnlocked, 0)
  return {
    vault,
    vaultRows,
    vaultUnlocked,
    vaultTotal,
    ratio: vaultTotal > 0 ? vaultUnlocked / vaultTotal : 0,
    gaps,
    openWeeklies,
    openActivities,
    gearIssues,
    weeklyCurrencies,
    goals: goalProgress,
    // A stale snapshot describes last week, so nothing about it can be "done".
    done: !character.stale && openWeeklies === 0 && (goalProgress.length > 0 ? openGoals === 0 : missingSlots === 0)
  }
}

/**
 * The WTF accounts a character was seen in. Snapshots persisted by an older
 * version only carry the single `accountName`, so fall back to it.
 */
export function accountsOf(character: CharacterSnapshot): string[] {
  return character.accounts?.length ? character.accounts : [character.accountName]
}

/**
 * How many of the season's token the character holds. A source lists a
 * currency only while some of it is held, so none among the others is 0;
 * no currencies at all is a source that does not read them, and null.
 */
export function tokenAmount(character: Pick<CharacterSnapshot, 'currencies'>): number | null {
  const token = seasonToken()
  if (!token || character.currencies.length === 0) return null
  return character.currencies.find((currency) => currency.id === token.id)?.quantity ?? 0
}

/** Whether the roster spans realms: on a single realm the realm is the same word on every row - noise. */
export function multiRealm(characters: readonly Pick<CharacterSnapshot, 'realm'>[]): boolean {
  return new Set(characters.map((character) => character.realm)).size > 1
}

/** Every account present in the roster, for the account switcher. */
export function accountsIn(characters: CharacterSnapshot[]): string[] {
  const accounts = new Set<string>()
  for (const character of characters) {
    for (const account of accountsOf(character)) accounts.add(account)
  }
  return [...accounts].sort()
}

/**
 * Level cap of the current expansion. The roster is allowed to raise it: after
 * a launch the first character to ding tells us the new cap before this
 * constant is updated.
 */
export const LEVEL_CAP = 90

export function rosterMaxLevel(characters: CharacterSnapshot[]): number {
  return characters.reduce((max, character) => Math.max(max, character.level), LEVEL_CAP)
}

/**
 * Only characters at the cap have weekly tasks at all - no vault, no keystone
 * and no raid lockout exists below it. Everything else is levelling and gets
 * out of the way.
 */
export function isMaxLevel(character: CharacterSnapshot, maxLevel: number): boolean {
  return character.level >= maxLevel
}

/**
 * The four readings every view makes of a character before drawing it. Two
 * very different things live behind one stale flag - a character nobody has
 * played since the reset, the ordinary case, and one nobody has played in
 * over a week, whose numbers describe nothing any more - so they are told
 * apart here once rather than in every view.
 */
export interface CharacterState {
  /** Below the cap: no weekly tasks, so nothing to be open. */
  levelling: boolean
  /** A reward from a finished week is still sitting in the vault. */
  unclaimed: boolean
  /** Not seen for over a week; the snapshot is history. */
  inactive: boolean
  /** Seen last week, not yet this one - an ordinary Wednesday. */
  betweenWeeks: boolean
}

/** No word at all: a character mid-week, or one the view has not looked at yet. */
export const NO_STATE: CharacterState = { levelling: false, unclaimed: false, inactive: false, betweenWeeks: false }

export function characterState(character: CharacterSnapshot, maxLevel: number, resetAt: number): CharacterState {
  return {
    levelling: !isMaxLevel(character, maxLevel),
    unclaimed: hasUnclaimedVault(character),
    inactive: isInactive(character, resetAt),
    betweenWeeks: isBetweenWeeks(character, resetAt)
  }
}

/**
 * The one word that says where a character stands this week: a vault to
 * collect, still levelling, not seen in a week, not yet played since the
 * reset, or done. In that order - the first is the one that cannot wait, the
 * last is the only good news. Nothing at all for a character mid-week.
 */
export function stateWord(state: CharacterState, done: boolean): StateWord | null {
  if (state.unclaimed) return StateWord.Claim
  if (state.levelling) return StateWord.Levelling
  if (state.inactive) return StateWord.Inactive
  if (state.betweenWeeks) return StateWord.BetweenWeeks
  if (done) return StateWord.Done
  return null
}

/**
 * The word as a chip. Card, table and character page all draw it from here,
 * so the same character wears the same word on every view. A character
 * mid-week has no word, and then there is no chip.
 */
export function stateChip(tr: Translator, state: CharacterState, done: boolean, level: number): ChipModel | null {
  switch (stateWord(state, done)) {
    case StateWord.Claim:
      return { tone: Tint.Accent, icon: 'vault', label: tr.t('card.unclaimed'), tip: tr.t('card.unclaimedHint') }
    case StateWord.Levelling:
      return { label: tr.t('card.level', { level }), tip: tr.t('card.levellingHint') }
    case StateWord.Inactive:
      return { tone: Severity.Warn, icon: 'alert', label: tr.t('card.stale'), tip: tr.t('card.staleHint') }
    case StateWord.BetweenWeeks:
      return { icon: 'clock', label: tr.t('card.newWeek'), tip: tr.t('card.newWeekHint') }
    case StateWord.Done:
      return { tone: Severity.Ok, icon: 'check', label: tr.t('card.weekDone') }
    default:
      return null
  }
}

export interface CharacterLink {
  id: BrandId
  label: string
  url: string
}

/**
 * The sites players actually check a character on. All four address a
 * character the same way - region, realm slug, name - so no lookup is needed.
 */
export function characterLinks(character: CharacterSnapshot, fallbackRegion: Region): CharacterLink[] {
  const region = character.region ?? fallbackRegion
  const realm = character.realmSlug
  const name = character.name.toLowerCase()
  return [
    {
      id: BrandId.Armory,
      label: 'Armory',
      url: `https://worldofwarcraft.blizzard.com/en-gb/character/${region}/${realm}/${name}`
    },
    { id: BrandId.RaiderIo, label: 'Raider.IO', url: `https://raider.io/characters/${region}/${realm}/${name}` },
    {
      id: BrandId.WarcraftLogs,
      label: 'Logs',
      url: `https://www.warcraftlogs.com/character/${region}/${realm}/${name}`
    },
    {
      id: BrandId.Raidbots,
      label: 'Raidbots',
      url: `https://www.raidbots.com/simbot/quick?region=${region}&realm=${realm}&name=${name}`
    }
  ]
}

/** Free-text match over the fields a player would actually type. */
export function matches(character: CharacterSnapshot, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return needle.split(/\s+/).every((term) =>
    [
      character.name,
      character.realm,
      character.className,
      character.spec ?? '',
      character.faction ?? '',
      character.keystone?.name ?? '',
      character.zone ?? '',
      // "prey" finds everyone with a hunt still open, which is the question
      // a search on this screen tends to be.
      ...character.weeklies.filter(isOwed).map((task) => task.label),
      ...(character.activities ?? []).filter((task) => !task.done).map((task) => task.label),
      ...accountsOf(character)
    ]
      .join(' ')
      .toLowerCase()
      .includes(term)
  )
}

/**
 * Sorts a copy of `characters`. A vault waiting to be collected leads the
 * roster - it is lost at the next reset, and right after one it is the only
 * thing anybody has to do. Below that, levelling characters sink below the
 * max-level roster and stale snapshots below fresh ones: their numbers
 * describe last week, and comparing them against this week's is misleading.
 * The plan's order and the count of open lines are the shell's (`sorted`
 * in App.ts): both read the task list, which this module is below.
 */
export function sortCharacters(
  characters: CharacterSnapshot[],
  key: SortKey,
  direction: SortDirection,
  tr: Translator,
  maxLevel: number,
  goals: Goal[] = [],
  flags: DisplayFlags = DISPLAY_DEFAULTS
): CharacterSnapshot[] {
  const value = (character: CharacterSnapshot): number => {
    const progress = weeklyProgress(character, goals, flags)
    switch (key) {
      case SortKey.Ilvl:
        return character.itemLevel ?? 0
      case SortKey.Score:
        return character.mythicRating ?? 0
      case SortKey.Key:
        return character.keystone?.level ?? 0
      case SortKey.Vault:
        return progress.vaultUnlocked
      case SortKey.Gold:
        return character.money ?? 0
      case SortKey.Played:
        return character.playedTotal ?? 0
      case SortKey.Updated:
        return character.weeklyUpdatedAt
      case SortKey.Gear:
        return progress.gearIssues
      default:
        return 0
    }
  }

  // The key's figure of each character, read once: the comparator runs
  // n log n times, and the week is expensive to measure.
  const values = new Map(characters.map((character) => [character.key, value(character)]))
  const sign = direction === SortDirection.Asc ? 1 : -1
  return [...characters].sort((a, b) => {
    // Levelling characters sink below everything, whatever is sorted on.
    const levelling = Number(!isMaxLevel(a, maxLevel)) - Number(!isMaxLevel(b, maxLevel))
    if (levelling !== 0) return levelling
    // ...but an uncollected vault rises above the stale sink below: the
    // snapshot is old precisely because nobody has logged in to empty it.
    const unclaimed = Number(hasUnclaimedVault(b)) - Number(hasUnclaimedVault(a))
    if (unclaimed !== 0) return unclaimed
    const stale = Number(a.stale) - Number(b.stale)
    if (stale !== 0) return stale
    if (key === SortKey.Name) return sign * tr.compare(a.name, b.name)
    const diff = values.get(a.key)! - values.get(b.key)!
    if (diff !== 0) return sign * diff
    return tr.compare(a.name, b.name)
  })
}

/**
 * A dungeon's initials, the way keys get written in group finder: "Kings' Rest"
 * becomes "KR". The name comes from the client and is therefore localized, so
 * a table of English abbreviations would be wrong on a German client - reading
 * the capitals out of whatever the client wrote works in any language. A name
 * without capitals to take (or with only one) keeps its opening letters, which
 * is still shorter than the full name and never empty.
 */
export function keystoneShort(name: string): string {
  const capitals = [...name].filter((char) => char !== char.toLowerCase() && char === char.toUpperCase())
  if (capitals.length >= 2) return capitals.slice(0, 4).join('')
  return name.slice(0, 4)
}

/**
 * Concentration at its cap. It refills on its own and stops there, so a full
 * bar is regeneration being thrown away - the one profession worth a visit.
 */
/** A profession with its concentration bar; the guard says the bar is there. */
export type Concentrating = Profession & { concentration: NonNullable<Profession['concentration']> }

export function concentrationFull(profession: Profession): profession is Concentrating {
  return profession.concentration !== null && profession.concentration.current >= profession.concentration.max
}

/**
 * Time played, as "12 T 4 Std" / "4 Std 20 Min". Seconds are noise at this
 * scale, so the smallest unit shown is a minute.
 */
export function formatPlayed(tr: Translator, seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null
  const { days, hours, minutes } = splitDuration(seconds * 1000)
  if (days > 0) return tr.t('played.days', { days, hours })
  if (hours > 0) return tr.t('played.hours', { hours, minutes })
  return tr.t('played.minutes', { minutes })
}

/**
 * The same duration with its figures and its units kept apart.
 *
 * The summary tile sets the digits in the same figure type as every number
 * beside it and steps the unit down, the way the vault tile writes "/ 27" -
 * a duration spelled out as one string was the one tile that read as a
 * sentence in a row of numbers.
 */
export function playedParts(tr: Translator, seconds: number | null): { value: number; unit: string }[] {
  if (!seconds || seconds <= 0) return []
  const { days, hours, minutes } = splitDuration(seconds * 1000)
  if (days > 0)
    return [
      { value: days, unit: tr.t('played.unit.days') },
      { value: hours, unit: tr.t('played.unit.hours') }
    ]
  if (hours > 0)
    return [
      { value: hours, unit: tr.t('played.unit.hours') },
      { value: minutes, unit: tr.t('played.unit.minutes') }
    ]
  return [{ value: minutes, unit: tr.t('played.unit.minutes') }]
}

/** The direction that puts the interesting end of a column first. */
export function defaultDirection(key: SortKey): SortDirection {
  return key === SortKey.Name ? SortDirection.Asc : SortDirection.Desc
}
