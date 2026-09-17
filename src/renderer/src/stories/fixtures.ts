/**
 * The roster the stories draw, read from the JSON files beside this module:
 * a handful of characters that between them show every state a view knows -
 * a main mid-week, an alt with a reward waiting, one still levelling, one
 * nobody has played in a fortnight - and the account-wide numbers around
 * them.
 *
 * The files are written around one fixed moment, `now` in roster.json, with
 * every timestamp as an ISO string. Loaded as they are they would age - the
 * whole roster would read as inactive after a week - so every timestamp is
 * shifted by the distance from that moment to the real now. A timestamp is
 * any key called `at` or ending in `At`; that is the one convention the data
 * files follow.
 */

import type {
  CharacterHistory,
  CharacterSnapshot,
  GoldPoint,
  GoldSummary,
  ResolvedConfig,
  UpdateState,
  WarbandBank
} from '../../../shared/types'
import type { DataBundle, SourceInfo, SyncBundle } from '../../../preload/index'
import { createTranslator, type Locale, type Translator } from '../../../shared/i18n'
import rosterData from './data/roster.json'
import historyData from './data/history.json'
import goldData from './data/gold.json'
import configData from './data/config.json'
import sourcesData from './data/sources.json'
import updateData from './data/update.json'
import weekData from './data/week.json'
import iconData from './data/icons.json'
import { IconKind } from '../../../shared/enums/iconKind'

export const NOW = Date.now()
const SHIFT = NOW - Date.parse(rosterData.now)

const isTimestamp = (key: string): boolean => key === 'at' || key.endsWith('At')

/** The data with every ISO timestamp turned into epoch millis, moved to today. */
function shifted<T>(value: unknown, key = ''): T {
  if (Array.isArray(value)) return value.map((entry) => shifted(entry, key)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shifted(v, k)])) as T
  }
  if (typeof value === 'string' && isTimestamp(key)) return (Date.parse(value) + SHIFT) as T
  return value as T
}

/** The translator a story's globals ask for, for the template functions. */
export function translatorFor(context: { globals: Record<string, unknown> }): Translator {
  return createTranslator((context.globals.locale as Locale | undefined) ?? 'en')
}

/** Wednesday morning, two days ago: the week is young. */
export const RESET_AT: number = shifted(rosterData.resetAt, 'resetAt')
export const NEXT_RESET_AT: number = shifted(rosterData.nextResetAt, 'nextResetAt')
export const MAX_LEVEL: number = rosterData.maxLevel
export const ACCOUNTS: string[] = rosterData.accounts

export const ROSTER: CharacterSnapshot[] = shifted(rosterData.characters)
/** Counted over the whole roster - the fixture hides no account. */
export const ACCOUNT_CHARACTERS: Record<string, number> = Object.fromEntries(
  ACCOUNTS.map((account) => [account, ROSTER.filter((c) => c.accounts.includes(account)).length])
)
const byName = (name: string): CharacterSnapshot => {
  const found = ROSTER.find((character) => character.name === name)
  if (!found) throw new Error(`fixture roster has no "${name}"`)
  return found
}
/** The main: mid-week, most of the vault filled, a few things still open. */
export const MAIN = byName('Auriel')
/** An alt with last week's reward still in the vault - the thing that cannot wait. */
export const ALT_UNCLAIMED = byName('Mirella')
/** Still on the way up: no vault, no keystone, an experience bar instead. */
export const LEVELLING = byName('Thorgrim')
/** Not seen since before the reset: nothing done this week, and that is a complete answer. */
export const BETWEEN_WEEKS = byName('Sylvara')
/** Not seen in a fortnight: the numbers describe nothing any more. */
export const INACTIVE = byName('Kaelthar')

export const CHAR_HISTORY: CharacterHistory = shifted(historyData)
export const GOLD: GoldSummary = goldData.summary
export const WARBAND_BANKS: WarbandBank[] = shifted(goldData.warbandBanks)
export const GOLD_HISTORY: GoldPoint[] = shifted(goldData.history)
export const CONFIG = configData as ResolvedConfig
export const SOURCES: SourceInfo[] = shifted(sourcesData)

export const UPDATE_STATE: UpdateState = shifted(updateData.idle)
export const UPDATE_AVAILABLE: UpdateState = shifted(updateData.available)
export const UPDATE_DOWNLOADING: UpdateState = shifted(updateData.downloading)
export const UPDATE_READY: UpdateState = shifted(updateData.ready)

const WEEK: Pick<DataBundle, 'accountQuests' | 'events' | 'seasonDungeons' | 'detectedQuests' | 'learnedQuests' | 'lastSyncAt'> =
  shifted(weekData)

/** The season's dungeons as the companion lists them: two of them nobody on the roster has run. */
export const SEASON_DUNGEONS = WEEK.seasonDungeons?.list ?? []

export const DATA_BUNDLE: DataBundle = {
  resetAt: RESET_AT,
  nextResetAt: NEXT_RESET_AT,
  snapshots: ROSTER,
  gold: GOLD,
  warbandBanks: WARBAND_BANKS,
  goldHistory: GOLD_HISTORY,
  charHistory: CHAR_HISTORY,
  accounts: ACCOUNTS,
  accountCharacters: ACCOUNT_CHARACTERS,
  ...WEEK,
  status: { running: false, step: '', errors: [] }
}

export const SYNC_BUNDLE: SyncBundle = {
  resetAt: RESET_AT,
  nextResetAt: NEXT_RESET_AT,
  snapshots: ROSTER,
  gold: GOLD,
  warbandBanks: WARBAND_BANKS,
  goldHistory: GOLD_HISTORY,
  charHistory: CHAR_HISTORY,
  accounts: ACCOUNTS,
  accountCharacters: ACCOUNT_CHARACTERS,
  accountQuests: WEEK.accountQuests,
  events: WEEK.events,
  seasonDungeons: WEEK.seasonDungeons,
  detectedQuests: WEEK.detectedQuests,
  learnedQuests: WEEK.learnedQuests,
  lastSyncAt: NOW,
  errors: []
}

/**
 * The icon of a fixture id, the way the app's main process would resolve
 * it: Blizzard's image host by the icon's name. A class is named by its
 * token; an id the fixture does not name gets an address that fails, so
 * the element hides as it does in the app.
 */
export function storyIcon(kind: IconKind, ref: string | number): string {
  const name =
    kind === IconKind.Class
      ? `classicon_${String(ref).toLowerCase()}`
      : (iconData as Partial<Record<IconKind, Record<string, string>>>)[kind]?.[String(ref)]
  return name ? `https://render.worldofwarcraft.com/eu/icons/56/${name}.jpg` : 'data:,'
}
