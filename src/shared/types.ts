// Shared types between main process, preload and renderer.

import type { LanguageSetting, Locale } from './i18n'
import type { DisplayFlag } from './display'
import type { CustomTaskDef, CustomTicks } from './customTasks'
import type { TaskSkips } from './skips'
import type { Region } from './enums/region'
import type { ItemCategory } from './enums/itemCategory'
import { ThemeSetting } from './enums/themeSetting'
import { CloseAction } from './enums/closeAction'
import type { VaultCategory } from './enums/vaultCategory'
import type { RenownKind } from './enums/renownKind'
import type { GoalKind } from './enums/goalKind'

/** A look the stylesheet has: the setting with `System` resolved. */
export type Theme = Exclude<ThemeSetting, ThemeSetting.System>

export interface VaultSlot {
  /**
   * Boss kills (2/4/6) for the raid row, dungeons (1/4/8) for the dungeon row,
   * world activities (2/4/8) for the world row. The dungeon row counts every
   * Heroic, Mythic, Timewalking and keystone dungeon, not just Mythic+; the
   * world row counts delves and the other world activities alike.
   */
  threshold: number
  /** How far the character has progressed towards `threshold`. */
  progress: number
  /** Keystone level / delve tier that determines the reward. */
  level: number
  /**
   * Raid rows carry the Blizzard difficulty id instead of a level, so the label
   * stays correct regardless of client language.
   */
  difficultyId?: number | null
  /** Item level of the reward once unlocked, if the client reported one. */
  rewardItemLevel: number | null
  /**
   * The reward itself, in the client's language. Only the companion addon can
   * know this - the vault's contents live in the client, not in any addon's
   * saved data - so it is absent for every character it has not seen.
   */
  rewardItem?: string | null
  unlocked: boolean
}

export interface VaultRow {
  category: VaultCategory
  slots: VaultSlot[]
  /** Number of unlocked slots in this row (0-3). */
  unlockedCount: number
  /**
   * True when the row was reconstructed from other data rather than read as-is.
   * No addon stores the Great Vault itself, so this is the normal case.
   */
  derived?: boolean
}

export interface MythicRun {
  dungeon: string
  mapChallengeModeId: number
  level: number
  /** Whether the timer was beaten. Every finished run counts for the vault. */
  completed: boolean
  /** How long the run took, in seconds, where the source recorded it. */
  durationSec?: number | null
  /** Rating the run was worth. */
  score?: number | null
  /** When the run finished (epoch millis). */
  completedAt?: number | null
}

/**
 * A character's best run of one dungeon this season, the way the rating is
 * built: the client keeps one per dungeon, and the sum of them is the score.
 * Only the companion addon reads it - no community addon writes it down.
 */
export interface DungeonBest {
  mapChallengeModeId: number
  name: string
  level: number
  /** Whether that best run was in time; an overtime run is worth less. */
  inTime: boolean
  score: number
  durationSec: number | null
}

/** A dungeon of the season, run or not, keyed the way the bests are. */
export interface SeasonDungeon {
  mapChallengeModeId: number
  name: string
}

/**
 * The season's dungeons as the client lists them. Only the companion reads
 * the list; a dungeon nobody has run is known from it alone.
 */
export interface SeasonDungeons {
  list: SeasonDungeon[]
  updatedAt: number
}

/** One entry from the character's saved-instance list (raid or dungeon). */
export interface InstanceLockout {
  name: string
  /** Blizzard difficulty id - language independent, preferred for labelling. */
  difficultyId: number | null
  /** Localized difficulty name as the client reported it; fallback only. */
  difficulty: string
  /** Raids reset weekly, dungeons daily - and they belong in separate rows. */
  isRaid: boolean
  /** Group size the lockout was saved at, e.g. 5, 10, 20. */
  maxPlayers: number | null
  defeated: number
  total: number
  /** Names of the bosses already killed in this lockout. */
  bosses: string[]
  resetsAt: number | null
}

/**
 * One boss of a raid of the season, with the kills this character has on
 * each difficulty (by Blizzard difficulty id: 17 LFR, 14 normal, 15 heroic,
 * 16 mythic). Only the companion addon reads them, out of the client's
 * statistics - the lockouts are the week's, the statistics the character's
 * whole record.
 */
export interface RaidBoss {
  /** The client's dungeon encounter id. */
  id: number
  name: string
  kills: Record<number, number>
}

/** A raid of the season - one the vault's raid row counts - as the Encounter Journal lists it, its bosses in order. */
export interface RaidProgress {
  /** The journal's instance id. */
  id: number
  name: string
  bosses: RaidBoss[]
}

export interface WorldBossLockout {
  name: string
  defeated: boolean
}

/** The keystone in the bags: the dungeon it opens, and its level. */
export interface Keystone {
  name: string
  level: number
}

export interface CurrencyAmount {
  id: number
  name: string
  quantity: number
  max: number | null
  /** Weekly earned / weekly cap, when the currency has one. */
  earnedThisWeek: number | null
  weeklyMax: number | null
}

/** Where a quest with objectives stands, before it is done. */
export interface TaskProgress {
  fulfilled: number
  required: number
  /** The client's own summary, e.g. "2/3" or "40%". */
  text: string
}

/**
 * A quest on the log, as the companion addon reports it: how far it is and
 * whether it is ready to turn in. The other sources only know a quest once
 * it is done.
 */
export interface QuestLogEntry {
  id: number
  title: string
  ready: boolean
  progress: TaskProgress | null
}

export interface WeeklyTask {
  id: number
  label: string
  /** From the register's tag: the skill line of the profession the quest is for. */
  profession?: number | null
  /** From the definition, grown from the register: the ids the week's quest is one of. */
  pool?: number[]
  done: boolean
  /** Objectives complete, quest not yet turned in. */
  ready?: boolean
  /**
   * Objective progress while the quest is on the log. Only a source that
   * records objectives can fill it; absent means "unknown", not "none".
   */
  progress?: TaskProgress | null
  /**
   * Whether the quest is on the log. Only the companion knows; false means
   * the log was read this week and the quest is not on it - the first step
   * is to pick it up. Absent means nobody looked.
   */
  onLog?: boolean
}

/**
 * A weekly activity a tracker follows with its objectives - a zone weekly at
 * 40%, three of four hunts done - whether or not the user watches its quest.
 * Complements `weeklies`, which is the user's own list and only knows done or
 * not done.
 */
export interface WeeklyActivity {
  /** The tracker's own key, stable across languages. */
  key: string
  label: string
  done: boolean
  /** Objectives complete, quest not yet turned in. */
  ready: boolean
  progress: TaskProgress | null
  /** Quest ids the activity stands for; the merger uses them to avoid listing a quest twice. */
  questIds: number[]
}

/** One equipped item, as far as the source could describe it. */
export interface GearItem {
  /** Inventory slot id, 1 (head) to 17 (off hand). */
  slot: number
  itemId: number
  name: string
  itemLevel: number | null
  /** Enchant id on the item; 0 when it has none, null when the source cannot tell. */
  enchantId: number | null
  /**
   * Whether the slot takes an enchant at all, as learned from the roster -
   * see `enchants.ts`. Absent on a record no merge has been through.
   */
  enchantable?: boolean
  /** Sockets the item has and how many of them hold a gem; null when unknown. */
  sockets: number | null
  gems: number
  /** Upgrade track and step as the tooltip prints it, e.g. "Champion 4/8". */
  track: string | null
  quality: number | null
  /** The tooltip as the client shows it; absent where no source has the lines. */
  tooltip?: TooltipLine[]
  /** What Wowhead's tooltip needs to show this item as it is; see `wowhead.ts`. */
  wowhead?: string | null
}

/** A renown faction: the level, and how far into it the character is. */
/** Reputation after the maximum renown level: each full cycle gives a reward. */
export interface RenownParagon {
  /** Progress in the current cycle. */
  current: number
  /** The size of one cycle. */
  max: number
  /** A reward from a full cycle waits at the faction. */
  rewardPending: boolean
}

/**
 * A standing with a faction. A major faction counts in renown levels. A
 * minor faction or a friendship (a delve companion) counts in ranks, and
 * the companion addon reports those too, in the same shape.
 */
export interface Renown {
  factionId: number
  name: string
  level: number
  /** The last rank of a friendship or a minor faction; absent for renown. */
  maxLevel?: number
  current: number
  max: number
  maxed: boolean
  /** Only after the maximum level, and only from the companion addon. */
  paragon?: RenownParagon | null
  /** Absent means renown. */
  kind?: RenownKind
}

/** Experience towards the next level, for a character still levelling. */
export interface LevelProgress {
  xp: number
  xpMax: number
  /** Rested experience still banked. */
  rested: number
}

/** The character's auctions, summed: how many, and when the first one ends. */
export interface AuctionSummary {
  count: number
  nextExpiresAt: number | null
}

/** Free bag slots, across the regular bags. */
export interface BagSpace {
  free: number
  total: number
}

/** One item in a container, its stacks summed. */
/**
 * One line of an item's tooltip as the client draws it: the text on the
 * left, a second text on the right where the line has one (the slot and
 * the armour type), and the game's colour of each as six hex digits where
 * it is not the plain white of most lines. The game's tooltip is a dark
 * surface, so the colours only read on one: the app draws the tip that way
 * in both themes.
 */
export interface TooltipLine {
  left: string
  right: string | null
  leftColor: string | null
  rightColor: string | null
}

export interface BagItem {
  itemId: number
  name: string
  count: number
  quality: number | null
  /** The item level of a piece of gear; null where the source cannot tell, or the item has none. */
  itemLevel?: number | null
  /** The group a bag sorts the item into, from the lexicon; null where the lexicon does not know the item. */
  category?: ItemCategory | null
  /** The tooltip as the client shows it; absent where no source has the lines (an addon without the register). */
  tooltip?: TooltipLine[]
  /** What Wowhead's tooltip needs to show this item as it is; see `wowhead.ts`. */
  wowhead?: string | null
  /** The crafting tier, 1 to 5, of a reagent or a crafted piece; null where the item has none. */
  craftTier?: number | null
}

/**
 * A set of slots with what sits in them: the bags as one, a bank tab, a
 * warband bank tab. The bags are one container because nobody cares which
 * of the five holds the flasks; a bank tab keeps its name because the
 * player gave it one.
 */
export interface Container {
  /** The tab's name as the client stores it; null for the bags. */
  name: string | null
  slots: number
  free: number
  items: BagItem[]
}

/** The warband bank of one WTF account, tab by tab. */
export interface WarbandBank {
  account: string
  tabs: Container[]
  /** When the tabs were read: the companion's visit to the bank, else the addon file's write. */
  updatedAt: number | null
}

/** A primary profession, with the concentration the client keeps for it. */
export interface Profession {
  name: string
  skillLineId: number
  skill: number
  maxSkill: number
  /** Null for a profession without concentration (gathering, or an old expansion). */
  concentration: { current: number; max: number } | null
  /** Knowledge points earned and not yet spent in the specialisation tree; null where the source cannot tell. */
  knowledge: number | null
}

/**
 * A recipe with a cooldown, as the profession window last showed it. The
 * client tells only there, so the record is as fresh as that visit.
 */
export interface CraftCooldown {
  recipeId: number
  name: string
  /** When the cooldown runs out, epoch millis; 0 when it is not running. */
  readyAt: number
  /** Charges left and the most it holds; null for a recipe without charges. */
  charges: number | null
  maxCharges: number | null
  /** When the window last showed the recipe, epoch millis. */
  seenAt: number
}

/** A calendar holiday running right now - the timewalking week, a bonus event. */
export interface CalendarEvent {
  title: string
  startsAt: number | null
  endsAt: number | null
}

export interface WeeklyEvents {
  list: CalendarEvent[]
  updatedAt: number
}

export interface CharacterSnapshot {
  /** Stable key: `${realmSlug}-${nameLower}` */
  key: string
  name: string
  realm: string
  realmSlug: string
  region: Region | null
  className: string
  /** Uppercase English class token, e.g. MAGE - used for the class colour. */
  classToken: string | null
  spec: string | null
  level: number
  itemLevel: number | null
  /** Faction token as the client names it: Alliance, Horde or Neutral. */
  faction: string | null
  /** Guild name without the realm; null while unguilded. */
  guild: string | null
  money: number | null

  mythicRating: number | null
  /** Total time played, in seconds, as the client last reported it. */
  playedTotal: number | null
  /** Time played at the current level, in seconds. */
  playedLevel: number | null
  /** The keystone currently in the character's bags. */
  keystone: Keystone | null

  mythicRuns: MythicRun[]
  vault: VaultRow[]
  lockouts: InstanceLockout[]
  worldBosses: WorldBossLockout[]
  currencies: CurrencyAmount[]
  weeklies: WeeklyTask[]
  /** Tracked weekly activities with their objectives; empty where no source follows them. */
  activities: WeeklyActivity[]
  /** Season best per dungeon; empty without the companion addon. */
  dungeonBests: DungeonBest[]
  /** The season's raids with the kills on each boss; empty without the companion addon. */
  raidProgress: RaidProgress[]
  /** Equipped items; empty where no source lists them. */
  gear: GearItem[]
  renown: Renown[]
  /** Only for a character below the cap; null at max level or when unknown. */
  xp: LevelProgress | null
  /** Where the character logged out. */
  zone: string | null
  /** The last boss the character killed, and when. */
  lastActivity: { name: string; at: number } | null
  auctions: AuctionSummary | null
  /** Items sitting in the mailbox; null when no source looked. */
  mailCount: number | null
  bagSpace: BagSpace | null
  /** What the character carries, the bags as one; null when no source lists them. */
  bags: Container | null
  /** The character's bank, one entry per tab; empty where no source lists it. */
  bank: Container[]
  /** Primary professions; empty where no source reports them. */
  professions: Profession[]
  /** Recipes with a cooldown; empty where no source lists them. */
  cooldowns: CraftCooldown[]

  /** When any source last saw this character (epoch millis). */
  updatedAt: number
  /**
   * When the source that supplied this week's numbers last saw the character.
   * `stale` is judged on this, not on `updatedAt`: a source may know the
   * character without knowing anything about the current week.
   */
  weeklyUpdatedAt: number
  /**
   * A Great Vault reward from a finished week is still sitting there. It is
   * lost at the next reset, so it outranks everything else on the card.
   */
  vaultRewardWaiting: boolean
  /** True when the snapshot predates the last weekly reset. */
  stale: boolean
  /** WTF account folder the current data came from. */
  accountName: string
  /**
   * Every WTF account folder that has seen this character. An account shared by
   * two people, or a second Blizzard account on the same machine, puts the same
   * character in more than one folder.
   */
  accounts: string[]
  /** Every source that knows this character, freshest first. */
  sources: Array<{ id: string; labelKey: string; updatedAt: number }>
  /** Which source supplied each area, keyed by area name. */
  provenance: Record<string, string>
  /**
   * The chores the player took off this character's week, by chore id,
   * stamped on the same way (`withSkips`). Not persisted; none reads as
   * every chore wanted.
   */
  skipped?: string[]
}

/** Gold belonging to one WTF account, in copper. */
export interface AccountGold {
  /** WTF account folder name. */
  account: string
  characters: number
  warband: number
  guilds: Array<{ name: string; money: number }>
  total: number
}

/** Account-wide gold, in copper. */
export interface GoldSummary {
  /** Sum across all visible characters. */
  characters: number
  /** Warband bank, summed over the WTF accounts that report one. */
  warband: number
  guilds: Array<{ name: string; money: number }>
  total: number
  /** The same numbers per WTF account, so the overview can scope them. */
  byAccount: AccountGold[]
}

/**
 * One recorded reading of the account-wide gold, in copper.
 *
 * Written once per sync, so the overview can show where the gold went rather
 * than only what is left. Kept deliberately small: a point is stored for every
 * change, for years.
 */
export interface GoldPoint {
  /** When the reading was taken (epoch millis). */
  at: number
  characters: number
  warband: number
  /** All guild banks together - their names change and would bloat the file. */
  guilds: number
  total: number
  /** Per WTF account totals, so the chart can be scoped like the summary bar. */
  accounts: Record<string, number>
}

/**
 * One reading of a character's two headline figures, taken per sync so a
 * card can show where they came from rather than only where they are.
 */
export interface CharacterPoint {
  at: number
  itemLevel: number | null
  rating: number | null
}

/** Readings per character key, oldest first. */
export type CharacterHistory = Record<string, CharacterPoint[]>

/** A weekly target the user set, e.g. three vault slots - for every character, or for the ones it names. */
export interface Goal {
  /** Stable id so a goal survives edits and reordering. */
  id: string
  kind: GoalKind
  target: number
  /**
   * The characters the goal is for; absent means every character. A goal
   * that names a character beats the goal of the same kind for everyone
   * on that character - see `assign.ts`.
   */
  characters?: string[]
}

export interface WeeklyQuestDef {
  id: number
  label: string
  /**
   * The quest ids the game rotates through: one of them is the week's
   * quest, and the line stands for whichever it is (`questPool.ts`). The
   * `id` is the line's own name and one of them. The stored ids are a
   * seed; the register adds the ones the game added since.
   */
  pool?: number[]
}

export interface UpdateState {
  /** False in an unpackaged dev build, where there is no update metadata. */
  supported: boolean
  currentVersion: string
  checking: boolean
  available: boolean
  latestVersion: string | null
  releaseNotes: string | null
  downloading: boolean
  percent: number
  downloaded: boolean
  lastCheckedAt: number | null
  error: string | null
}

export interface AppConfig {
  /** Only used to compute the reset countdown before any addon data exists. */
  region: Region
  wowPath: string | null
  /** Characters the user took off the roster and the list; they stay in the data and count towards the gold. */
  hiddenKeys: string[]
  /**
   * WTF account folders the user switched off. Their characters, their gold and
   * their guild banks stay out of everything the overview reports.
   */
  hiddenAccounts: string[]
  /** Re-read the SavedVariables files this often; 0 disables it. */
  autoRefreshMinutes: number
  /** Weekly quests the addon should watch, written into its config file. */
  weeklyQuests: WeeklyQuestDef[]
  /** Currency ids the cards show, whether or not they carry a weekly cap. */
  trackedCurrencies: number[]
  /** Faction ids the board shows. Empty shows every faction the client reports. */
  trackedFactions: number[]
  /** Weekly targets every character is measured against. */
  goals: Goal[]
  /** Hide characters below this level. */
  minLevel: number
  /** UI language; `system` follows the OS. */
  language: LanguageSetting
  /** Light or dark; `system` follows the OS. */
  theme: ThemeSetting
  /** Per-source on/off switches, keyed by adapter id. Missing means enabled. */
  enabledSources: Record<string, boolean>
  /** The user's own chores, ticked by hand in a block of their own; see customTasks.ts. */
  customTasks: CustomTaskDef[]
  /** Their ticks: task id -> character key or "warband" -> when. */
  customTicks: CustomTicks
  /** Show the game's icons: fetched once from Blizzard's image host by the file id the companion registered, then kept. */
  gameIcons: boolean
  /** Wowhead's tooltip script on every item link: the stats of the item as it is, fetched from Wowhead when the pointer is on it. */
  wowheadTooltips: boolean
  /** Check for updates on a schedule and download them in the background. */
  autoUpdate: boolean
  /** Start the app when the user logs in to the computer; see `autostart.ts`. */
  autoStart: boolean
  /** What the close button does: end the app, or hide the window; the tray icon (`tray.ts`) brings it back. */
  onClose: CloseAction
  /**
   * Which blocks, columns and panels the views draw. Only the flags that
   * differ from the defaults are stored; see `display.ts`.
   */
  display: Partial<Record<DisplayFlag, boolean>>
  /** How many days the trend under item level and rating covers. */
  /** The evening "Tonight" plans for, in minutes; see `effort.ts`. */
  eveningMinutes: number
  /** The player's own minimum of a supply group over the catalog's, by group id; see `supplies.ts`. */
  supplyMinimums: Record<string, number>
  /** The chores taken off a week, by character key or "warband"; see `skips.ts`. */
  taskSkips: TaskSkips
}

/** Config plus everything derived from it that the renderer needs. */
export interface ResolvedConfig extends AppConfig {
  /** The concrete locale `language` resolves to right now. */
  resolvedLocale: Locale
}

/** Whether the game runs right now; null where the platform is not asked. */
export interface GameState {
  running: boolean | null
}

export interface SyncStatus {
  running: boolean
  step: string
  errors: string[]
}
