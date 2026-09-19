/**
 * The known ids of the current season: the weekly quests, the currencies,
 * and the factions.
 *
 * No addon has a catalog like this. SavedInstances records a quest only
 * after a character has completed it, and no source knows the name of a
 * currency. Both store only ids. So the season set is kept here, and the
 * settings screen offers it as a start.
 *
 * The ids were read off a live client (build 12.1.0.69587, Midnight
 * season 2). The two pools - the season's meta weekly, the dungeon weekly -
 * are the client's quest labels 6072 and 4887 on build 12.1.0.69814
 * (wago.tools, 17 September 2026): the game offers one quest of each pool
 * a week, so each is one line (`questPool.ts`). The lists are a seed: a
 * quest a patch adds to a pool joins it from the companion's register, by
 * the prefix of its title or the name of a season dungeon. The Coiled Isle weeklies
 * and the rest were read off the companion's register of a live roster.
 * The currency names were checked against Wowhead. The item
 * ids and names of the supplies come from Wowhead (13 September 2026), not
 * from a client: a wrong one counts nothing, a missing one leaves a stack out.
 * The food is every dish of the expansion whose tooltip says "Well Fed" and
 * that one player eats; a feast set out for the group is not a stock.
 * Each consumable has one id for each quality tier; a bag list of the
 * same day added the tiers it held (241323, 241308, 241301, 258138), so
 * a check against real bags is the way to complete a group. The rune is
 * the season's own (level 90): the last expansion's, still in many bags,
 * does not count.
 * The carried items (the trove map, 274374) were read off that bag list.
 *
 * For a new season, edit `data/seasonCatalog.json`: set `patch` and `label`,
 * replace the crest ids, and check the quest ids against a client that has
 * completed them. The settings screen lists every id a source has seen.
 */

import type { WeeklyQuestDef } from './types'
import catalog from './data/seasonCatalog.json'
import type { FactionGroup } from './enums/factionGroup'
import type { Minutes } from './effort'
import type { SupplyGroup } from './supplies'
import type { CarriedGroup } from './carried'

export interface SeasonQuest extends WeeklyQuestDef {
  /**
   * Part of the suggested set. The rest are offered too, but a player who takes
   * "the season set" wants the week's main activities, not every side quest
   * that happens to reset weekly.
   */
  core: boolean
}

export interface SeasonCurrency {
  id: number
  /**
   * English name, as the game calls it. A client name learned from a source
   * beats it, so a German client ends up showing German names.
   */
  name: string
  /** Watched by default. */
  core: boolean
  /**
   * The roster shows how many of it a character holds, under this word: a
   * figure on the card, a column of the table. One currency a season - the
   * one a player counts before every raid night, the Voidcores.
   */
  figure?: string
}

/** A major faction of the season. The client reports all factions of the expansion; the board shows only these. */
export interface SeasonFaction {
  id: number
  /** English name, as the game calls it. The client name wins where a source reports one. */
  name: string
  group: FactionGroup
  /** Shown by default. */
  core: boolean
}

export interface SeasonCatalog {
  /** Client patch these ids were read from. */
  patch: string
  label: string
  /** Name of the expansion; the settings use it as the title of the factions that stay over all seasons. */
  expansion: string
  quests: SeasonQuest[]
  currencies: SeasonCurrency[]
  factions: SeasonFaction[]
  /** How long a step takes this season, in minutes; `effort.ts` fills in what is missing. */
  minutes?: Partial<Minutes>
  /** The season's consumables and how many of each a focus wants; see `supplies.ts`. */
  supplies?: SupplyGroup[]
  /** Items that are a chore while carried - the trove map; see `carried.ts`. */
  carried?: CarriedGroup[]
}

/**
 * The data is `data/seasonCatalog.json`, so a season change edits data, not code.
 * The quests with `core` are the main activities of the week; the rest are
 * offered, but off by default. The currencies with `core` are the upgrade
 * crests in track order and the season tokens. The factions are in two
 * groups: the season's (its renown faction, the delve and prey tracks, the
 * arena faction) and the expansion's (the launch renown factions, the ritual
 * sites, the delve companion). A faction of a past season is not listed, so
 * the board does not show it. The four Silvermoon houses are offered, but
 * off. The addon writes every reputation; the adapter keeps only the ids
 * listed here.
 */
export const BUNDLED_SEASON: SeasonCatalog = catalog as SeasonCatalog

/** The catalog in force: the bundled one. Read it through this, never hold it. */
export function seasonCatalog(): SeasonCatalog {
  return BUNDLED_SEASON
}

/** The suggested weekly quests, as the config stores them. */
export function seasonQuestDefs(coreOnly = true): WeeklyQuestDef[] {
  return seasonCatalog()
    .quests.filter((quest) => !coreOnly || quest.core)
    .map((quest) => seasonQuestDef(quest))
}

/** One catalog quest as the config stores it: the id, the label, and the pool where it has one. */
export function seasonQuestDef(quest: SeasonQuest): WeeklyQuestDef {
  return { id: quest.id, label: quest.label, ...(quest.pool ? { pool: [...quest.pool] } : {}) }
}

/** Currency id -> name, used to seed what the sources cannot name themselves. */
export function seasonCurrencyNames(): Record<number, string> {
  const names: Record<number, string> = {}
  for (const currency of seasonCatalog().currencies) names[currency.id] = currency.name
  return names
}

/** The currency the roster shows a count of, if the season names one. */
export function seasonToken(): SeasonCurrency | null {
  return seasonCatalog().currencies.find((currency) => Boolean(currency.figure)) ?? null
}

/** The currencies a fresh install watches. */
export function defaultTrackedCurrencies(): number[] {
  return seasonCatalog()
    .currencies.filter((currency) => currency.core)
    .map((currency) => currency.id)
}

/** The factions a fresh install shows, and what the board shows when the selection is empty. */
export function defaultTrackedFactions(): number[] {
  return seasonCatalog()
    .factions.filter((faction) => faction.core)
    .map((faction) => faction.id)
}
