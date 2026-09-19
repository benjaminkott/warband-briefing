/**
 * What the settings panels change, worked out without a DOM: each function
 * takes the stored value and answers with the next one, so a panel only has
 * to say which control was touched.
 */

import type { AppConfig, Goal, WeeklyQuestDef } from '../../../../shared/types'
import { seasonCatalog, seasonQuestDef } from '../../../../shared/seasonCatalog'
import { growPools, inPool, questIdsOf } from '../../../../shared/questPool'
import { DISPLAY_DEFAULTS, type DisplayFlag } from '../../../../shared/display'
import type { IconName } from '../Icon'
import type { GoalKind } from '../../../../shared/enums/goalKind'
import { FactionGroup } from '../../../../shared/enums/factionGroup'
import { SettingsSection } from '../../enums/settingsSection'

/**
 * The sections of the settings page, in setup order: where the data comes
 * from, whose it is, what stands on the list, how it is drawn, how the
 * keyboard drives it, and the app itself. The list's section carries the
 * list's name: a player looks for the quests and the goals where the
 * tasks are, not under the season they belong to. Each section is a page of its own behind the sub-navigation - ten
 * panels in one scroll were too much to find anything in.
 */
export const SETTINGS_SECTIONS: Array<{ id: SettingsSection; icon: IconName }> = [
  { id: SettingsSection.Setup, icon: 'plug' },
  { id: SettingsSection.Roster, icon: 'users' },
  { id: SettingsSection.Tasks, icon: 'tasks' },
  { id: SettingsSection.Appearance, icon: 'eye' },
  { id: SettingsSection.Keyboard, icon: 'keyboard' },
  { id: SettingsSection.App, icon: 'download' }
]

export function isSettingsSection(value: unknown): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section.id === value)
}

/** One quest the settings offer: a row with a box, on the list or not. */
export interface QuestChoice {
  id: number
  /** The client's title where a source saw the quest, the catalog's otherwise. */
  label: string
  /** The list's entry, when the quest is on it. */
  watched: WeeklyQuestDef | null
  /** What the box adds to the list: the catalog's entry, or the one the game gave. */
  def: WeeklyQuestDef
  /** For a pool: the quest of it the game gave last, by the client's title; null where none was seen. */
  latest: string | null
}

/** The season's quests and the rest, each as rows with a box. */
export interface QuestChoices {
  season: QuestChoice[]
  others: QuestChoice[]
}

/**
 * Every quest the settings can offer, one row for each id, in two groups:
 * the season's - the catalog's and the ones the companion learned from the
 * game - and the others a source saw finished or the player set by hand.
 * A row's box says whether the quest is on the list; nothing is added
 * from three places any more. The client's title wins over the catalog's:
 * it is in the client's language. A pool keeps the catalog's name - the
 * client's title is one week's quest of it - and the quests of the pool
 * the game gave are its rows, not rows of their own: the seed's, and the
 * ones the register grew it by (`growPools`, with the season's dungeon
 * names). The catalog's order comes first, the rest by name.
 */
export function questChoices(
  watched: WeeklyQuestDef[],
  detected: WeeklyQuestDef[],
  learned: WeeklyQuestDef[],
  dungeons: readonly string[],
  compare: (a: string, b: string) => number
): QuestChoices {
  const onList = new Map(watched.map((quest) => [quest.id, quest]))
  const fromGame = new Map([...detected, ...learned].map((quest) => [quest.id, quest]))
  // The learned quests come last done first, so the first of a pool among them is the week's.
  const latestOf = (def: WeeklyQuestDef): string | null =>
    def.pool ? ([...learned, ...detected].find((quest) => inPool(def, quest.id))?.label ?? null) : null
  const choice = (def: WeeklyQuestDef): QuestChoice => ({
    id: def.id,
    label: (def.pool ? undefined : fromGame.get(def.id)?.label) ?? def.label,
    watched: onList.get(def.id) ?? null,
    def,
    latest: latestOf(def)
  })
  const byName = (a: QuestChoice, b: QuestChoice): number => compare(a.label, b.label)
  const season = growPools(
    seasonCatalog().quests.map((quest) => seasonQuestDef(quest)),
    learned,
    dungeons
  ).map(choice)
  const inSeason = new Set(season.flatMap((quest) => questIdsOf(quest.def)))
  const learnedRows = learned
    .filter((quest) => !inSeason.has(quest.id))
    .map(choice)
    .sort(byName)
  for (const row of learnedRows) inSeason.add(row.id)
  const others = new Map<number, QuestChoice>()
  for (const quest of [...detected, ...watched]) {
    if (!inSeason.has(quest.id) && !others.has(quest.id)) others.set(quest.id, choice(quest))
  }
  return { season: [...season, ...learnedRows], others: [...others.values()].sort(byName) }
}

/** The list with the quests that are not on it yet; the labels already set stay. Null when nothing changes. */
export function withQuests(watched: WeeklyQuestDef[], defs: WeeklyQuestDef[]): WeeklyQuestDef[] | null {
  const known = new Set(watched.map((quest) => quest.id))
  const next = [...watched, ...defs.filter((def) => !known.has(def.id))]
  return next.length === watched.length ? null : next
}

/** The list with one quest set by hand, replacing an entry with the same id. Null for an invalid entry. */
export function withQuest(watched: WeeklyQuestDef[], id: number, label: string): WeeklyQuestDef[] | null {
  if (!Number.isInteger(id) || id <= 0 || !label.trim()) return null
  return [...watched.filter((quest) => quest.id !== id), { id, label: label.trim() }]
}

/**
 * The goals with one set for a kind - for everyone, or for one character.
 * One goal per kind and character set: a second target for the same number
 * on the same characters would only contradict the first. A goal for one
 * character sits beside the one for all and wins on that character. Null
 * for an invalid target.
 */
export function withGoal(goals: Goal[], kind: GoalKind, target: number, character: string | null = null): Goal[] | null {
  if (!Number.isInteger(target) || target <= 0) return null
  const same = (goal: Goal): boolean =>
    goal.kind === kind &&
    (character === null ? goal.characters === undefined : goal.characters?.length === 1 && goal.characters[0] === character)
  const goal: Goal =
    character === null
      ? { id: `${kind}-${target}`, kind, target }
      : { id: `${kind}-${target}-${character}`, kind, target, characters: [character] }
  return [...goals.filter((each) => !same(each)), goal]
}

/** One list of the factions panel: the catalog's season factions or its expansion factions. */
export interface FactionList {
  group: FactionGroup
  factions: Array<{ id: number; name: string }>
}

/**
 * The factions to pick from, in two lists: the season's and the expansion's.
 * The catalog names them and gives the order; a client name wins over the
 * catalog's. What the roster reports beyond the catalog is not offered: the
 * client also reports the factions of past seasons, and those are done.
 */
export function factionLists(reported: Array<{ id: number; name: string }>): FactionList[] {
  const names = new Map(reported.map((faction) => [faction.id, faction.name]))
  const lists: FactionList[] = [
    { group: FactionGroup.Season, factions: [] },
    { group: FactionGroup.Expansion, factions: [] }
  ]
  for (const faction of seasonCatalog().factions) {
    lists.find((entry) => entry.group === faction.group)!.factions.push({ id: faction.id, name: names.get(faction.id) ?? faction.name })
  }
  return lists.filter((list) => list.factions.length > 0)
}

/** The tracked currencies with one switched on or off. */
export function toggledCurrency(tracked: number[], id: number): number[] {
  return tracked.includes(id) ? tracked.filter((entry) => entry !== id) : [...tracked, id]
}

/** Only what differs from the default is stored, so a reset is an empty map. */
export function withFlag(display: AppConfig['display'], flag: DisplayFlag, on: boolean): AppConfig['display'] {
  const next = { ...(display ?? {}) }
  if (on === DISPLAY_DEFAULTS[flag]) delete next[flag]
  else next[flag] = on
  return next
}
