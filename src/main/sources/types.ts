/**
 * Contract for a data source.
 *
 * A source is any addon that leaves per-character weekly data in the WoW
 * SavedVariables folder. Each adapter knows one addon's file layout and returns
 * partial character records; the merger in `index.ts` combines them.
 *
 * Adapters must never throw for a single bad record - return what parsed and let
 * the caller show the rest. Only an unreadable file is worth an error.
 */

import type { Translator, TranslationKey } from '../../shared/i18n'
import type { QuestRegistry } from '../../shared/questRegistry'
import type { Lexicon } from '../../shared/lexicon'
import type {
  AuctionSummary,
  BagSpace,
  Container,
  CraftCooldown,
  CurrencyAmount,
  DungeonBest,
  GearItem,
  InstanceLockout,
  LevelProgress,
  MythicRun,
  Profession,
  QuestLogEntry,
  RaidProgress,
  Renown,
  SeasonDungeons,
  VaultRow,
  WeeklyActivity,
  WeeklyEvents,
  WeeklyQuestDef,
  WeeklyTask,
  WorldBossLockout
} from '../../shared/types'
import type { Region } from '../../shared/enums/region'

/** Which parts of a character record an adapter can speak for. */
export type DataArea =
  | 'identity'
  | 'vault'
  | 'runs'
  | 'lockouts'
  | 'worldBosses'
  | 'currencies'
  | 'weeklies'
  | 'activities'
  | 'dungeonBests'
  | 'raidProgress'
  | 'gear'
  | 'renown'
  | 'bags'

/**
 * What one adapter knows about one character. Every field is optional: the
 * merger fills gaps from lower-priority sources.
 */
export interface SourceCharacter {
  /** `${realmSlug}-${nameLower}` - the identity the merger joins on. */
  key: string
  name: string
  realm: string
  realmSlug: string
  region?: Region | null
  className?: string | null
  classToken?: string | null
  spec?: string | null
  level?: number | null
  itemLevel?: number | null
  faction?: string | null
  guild?: string | null
  money?: number | null
  mythicRating?: number | null
  /** Total time played and time at the current level, both in seconds. */
  playedTotal?: number | null
  playedLevel?: number | null
  keystone?: { name: string; level: number } | null
  xp?: LevelProgress | null
  zone?: string | null
  lastActivity?: { name: string; at: number } | null
  auctions?: AuctionSummary | null
  mailCount?: number | null
  bagSpace?: BagSpace | null
  /** The bags as one container, and the bank tab by tab - one area, from the same read. */
  bags?: Container | null
  bank?: Container[]
  professions?: Profession[]
  cooldowns?: CraftCooldown[]

  vault?: VaultRow[]
  mythicRuns?: MythicRun[]
  lockouts?: InstanceLockout[]
  worldBosses?: WorldBossLockout[]
  currencies?: CurrencyAmount[]
  weeklies?: WeeklyTask[]
  activities?: WeeklyActivity[]
  dungeonBests?: DungeonBest[]
  raidProgress?: RaidProgress[]
  gear?: GearItem[]
  renown?: Renown[]
  /**
   * Every weekly quest this character was seen completing, with the client's
   * own title. Not part of the merged snapshot - it feeds the suggestions on
   * the settings screen.
   */
  seenWeeklies?: WeeklyQuestDef[]
  /**
   * The quest log as the companion reports it, and the quests turned in
   * since the reset. Not an area of their own: the merger lays them over the
   * weeklies whichever source those came from, so a weekly on the way reads
   * as ready or half done instead of merely not done.
   */
  questLog?: QuestLogEntry[]
  questsDone?: WeeklyQuestDef[]

  /** A finished week's vault reward is still waiting to be collected. */
  vaultRewardWaiting?: boolean | null
  /**
   * The next weekly reset as the client reported it, epoch millis. Only a
   * source that runs inside the game can know this; it beats the app's own
   * timezone rule, which has to guess at DST.
   */
  weeklyResetAt?: number | null
  /** When this source last saw the character (epoch millis). */
  updatedAt: number
  /** WTF account folder the record came from. */
  accountName: string
}

export interface SourceFile {
  accountName: string
  filePath: string
  modifiedAt: number
}

export interface SourceStatus {
  id: string
  /** Translation key for the display name. */
  labelKey: TranslationKey
  /** The addon folder exists under Interface/AddOns. */
  addonInstalled: boolean
  /** At least one SavedVariables file was found. */
  hasData: boolean
  files: SourceFile[]
  lastWriteAt: number | null
  characterCount: number | null
  /** Set when the last read failed. */
  error: string | null
}

export interface SourceAdapter {
  /** Stable id used in config and provenance. */
  readonly id: string
  /** Translation key for the display name. */
  readonly labelKey: TranslationKey
  /** Translation key for the short sentence on the settings screen. */
  readonly descriptionKey: TranslationKey
  /** Areas this adapter can contribute, best-first for the UI. */
  readonly areas: DataArea[]
  /**
   * Priority per area. Higher wins during the merge; ties keep the fresher
   * record. Areas the adapter cannot fill are simply absent.
   */
  readonly priority: Partial<Record<DataArea, number>>
  /** Addon folder name under Interface/AddOns, when there is one. */
  readonly addonFolder: string | null
  /** The SavedVariables file names the adapter reads; the watcher waits for these. */
  readonly fileNames: readonly string[]

  /** Locates this source's SavedVariables files under a WoW install. */
  findFiles(wowPath: string): Promise<SourceFile[]>
  /** Parses one file. Throws only when the file itself is unusable. */
  read(file: SourceFile, options: ReadOptions): Promise<SourceCharacter[]>
  /** Optional: account-wide extras the same file happens to carry. */
  readAccount?(file: SourceFile, options: ReadOptions): Promise<SourceAccountData>
}

/** Data that belongs to the account rather than to a single character. */
export interface SourceAccountData {
  /** Warband bank gold, in copper; absent where the source never read it. */
  warbandGold?: number
  /** When that gold was read; the file's own stamp without one. */
  warbandGoldAt?: number | null
  /** The warband bank's tabs, from a source that lists items. */
  warbandBank?: Container[]
  /** When the source read the tabs; a source without a stamp leaves it to the file's mtime. */
  warbandBankAt?: number | null
  guilds?: Array<{ name: string; money: number }>
  /** Weekly quests that complete once for the whole account, seen done this week. */
  accountQuests?: WeeklyQuestDef[]
  /** The calendar's running events, where the source runs inside the client. */
  events?: WeeklyEvents | null
  /** The season's dungeons, run or not, where the source runs inside the client. */
  seasonDungeons?: SeasonDungeons | null
  /** The quests the source registered from the log, where it runs inside the client. */
  questRegistry?: QuestRegistry
  /** The icons the source registered by id, where it runs inside the client. */
  lexicon?: Lexicon
}

export interface ReadOptions {
  /** The WoW folder the files came from, for an adapter that also reads its addon. */
  wowPath: string
  /** Weekly quests the user configured, so adapters can resolve them. */
  weeklyQuests: WeeklyQuestDef[]
  /** Currency id -> name, learned from sources that report names. */
  currencyNames: Record<number, string>
  /** For the few strings an adapter has to synthesise (placeholders, fallbacks). */
  translator: Translator
}
