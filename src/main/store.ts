/**
 * Persistence: app config and the last set of character snapshots, as JSON in
 * Electron's userData folder. There are no credentials to protect - the app
 * reads everything from the local WoW installation.
 */

import { app } from 'electron'
import { SystemLanguage } from '../shared/enums/systemLanguage'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  AppConfig,
  CharacterHistory,
  CharacterSnapshot,
  GoldPoint,
  GoldSummary,
  SeasonDungeons,
  WarbandBank,
  WeeklyEvents,
  WeeklyQuestDef
} from '../shared/types'
import { recordCharacters } from '../shared/charHistory'
import { DEFAULT_EVENING_MINUTES } from '../shared/effort'
import { recordGold } from '../shared/goldHistory'
import { defaultTrackedCurrencies, defaultTrackedFactions, seasonCatalog } from '../shared/seasonCatalog'
import { fullVault } from '../shared/vault'
import { emptyLexicon, mergeLexicons, type Lexicon } from '../shared/lexicon'
import type { FetchedCatalog } from './catalog'
import { vaultChoreId, weeklyChoreId, withSkip } from '../shared/skips'
import { foldIntoPools } from '../shared/questPool'
import type { WindowPlacement } from './windowFrame'
import { GoalKind } from '../shared/enums/goalKind'
import { VaultCategory } from '../shared/enums/vaultCategory'
import { Region } from '../shared/enums/region'
import { ThemeSetting } from '../shared/enums/themeSetting'
import { CloseAction } from '../shared/enums/closeAction'

const DEFAULT_CONFIG: AppConfig = {
  region: Region.Eu,
  wowPath: null,
  hiddenKeys: [],
  hiddenAccounts: [],
  // The SavedVariables watcher already re-reads the moment WoW writes, which is
  // every logout and every /reload - a timer on top of it would only re-read
  // files that have not changed. It stays available as a fallback for a folder
  // that cannot be watched.
  autoRefreshMinutes: 0,
  weeklyQuests: [],
  // The season's crests and tokens; the settings screen edits the list.
  trackedCurrencies: defaultTrackedCurrencies(),
  trackedFactions: defaultTrackedFactions(),
  // Three vault slots is the week most players actually play towards.
  goals: [{ id: 'vault-slots-3', kind: GoalKind.VaultSlots, target: 3 }],
  minLevel: 70,
  language: SystemLanguage.System,
  theme: ThemeSetting.System,
  enabledSources: {},
  customTasks: [],
  customTicks: {},
  updateSource: null,
  catalogUpdates: false,
  gameIcons: true,
  wowheadTooltips: true,
  autoUpdate: true,
  // Off: a login item is the user's choice, never the installer's.
  autoStart: false,
  onClose: CloseAction.Quit,
  display: {},
  eveningMinutes: DEFAULT_EVENING_MINUTES,
  supplyMinimums: {},
  taskSkips: {}
}

interface PersistedState {
  config: AppConfig
  snapshots: CharacterSnapshot[]
  gold: GoldSummary
  /** The warband bank per WTF account, as of the last read. */
  warbandBanks: WarbandBank[]
  /** Gold readings over time, oldest first. */
  goldHistory: GoldPoint[]
  /** Item level and rating readings per character, oldest first. */
  charHistory: CharacterHistory
  /**
   * Every WTF account the last read found, switched-off ones included - the
   * settings have to offer an account back that nothing is read from.
   */
  accounts: string[]
  /** Characters per WTF account, hidden ones counted too. */
  accountCharacters: Record<string, number>
  /** Weekly quests done once for the whole account, as of the last read. */
  accountQuests: WeeklyQuestDef[]
  /** The calendar's running events, as of the last read. */
  events: WeeklyEvents | null
  /** The season's dungeons, as of the last read; null before the companion listed them. */
  seasonDungeons?: SeasonDungeons | null
  /** The icons known by id, merged over every read: an id stays known after its source is gone. */
  lexicon: Lexicon
  lastSyncAt: number | null
  /** The season catalog last fetched from the net, put in force before the bundled one. */
  catalog: FetchedCatalog | null
  /**
   * Where the window frame was kept before it had a file of its own
   * (`windowFrame.ts`). Read once on the first start after, then dropped.
   */
  window?: WindowPlacement | null
}

const DEFAULT_STATE: PersistedState = {
  config: DEFAULT_CONFIG,
  snapshots: [],
  gold: { characters: 0, warband: 0, guilds: [], total: 0, byAccount: [] },
  warbandBanks: [],
  goldHistory: [],
  charHistory: {},
  accounts: [],
  accountCharacters: {},
  accountQuests: [],
  events: null,
  seasonDungeons: null,
  lexicon: emptyLexicon(),
  lastSyncAt: null,
  catalog: null
}

/**
 * The Great Vault's dungeon row used to be modelled as "Mythic+", which was
 * never what the vault counts. Persisted state from those versions still says
 * so, in the snapshots and in any goal set against that row.
 */
/** The vault row of each focus word; the other words held no row. */
const FOCUS_ROWS: Record<string, VaultCategory> = { raid: VaultCategory.Raid, keys: VaultCategory.Dungeon, world: VaultCategory.World }

/** The focus set a role of the first version stood for. */
function focusOfRole(role: string): string[] {
  switch (role) {
    case 'keys':
      return ['keys', 'world']
    case 'raid':
      return ['raid', 'keys']
    case 'crafter':
    case 'bank':
      return []
    default:
      return Object.keys(FOCUS_ROWS)
  }
}

/**
 * The vault rows a stored focus left out become skips of the character, so
 * an alt that was never measured against the raid row still is not. A
 * character without a focus of its own followed the default.
 */
function foldFocusIntoSkips(state: PersistedState): void {
  const config = state.config as unknown as {
    roles?: Record<string, string>
    focus?: Record<string, string[]>
    defaultFocus?: string[] | null
    taskSkips?: Record<string, string[]>
  }
  const roles = config.roles && typeof config.roles === 'object' ? config.roles : {}
  const focus = config.focus && typeof config.focus === 'object' ? config.focus : {}
  const fallback = Array.isArray(config.defaultFocus) ? config.defaultFocus : null
  const keys = new Set([...(state.snapshots ?? []).map((snapshot) => snapshot.key), ...Object.keys(focus), ...Object.keys(roles)])
  for (const key of keys) {
    const own = Array.isArray(focus[key]) ? focus[key] : typeof roles[key] === 'string' ? focusOfRole(roles[key]) : fallback
    if (!own) continue
    for (const [word, row] of Object.entries(FOCUS_ROWS)) {
      if (!own.includes(word)) config.taskSkips = withSkip(config.taskSkips, key, vaultChoreId(row), true)
    }
  }
  delete config.roles
  delete config.focus
  delete config.defaultFocus
}

function migrate(state: PersistedState): PersistedState {
  for (const goal of state.config.goals ?? []) {
    if ((goal.kind as string) === 'vaultMythicPlus') goal.kind = GoalKind.VaultDungeon
  }
  // fullVault owns the row rename, so the old name is spelled out in one place.
  for (const snapshot of state.snapshots ?? []) {
    snapshot.vault = fullVault(snapshot.vault ?? [])
  }
  // State written before the gold chart existed has no history at all; it
  // starts collecting with the next sync.
  if (!Array.isArray(state.goldHistory)) state.goldHistory = []
  if (!state.charHistory || typeof state.charHistory !== 'object') state.charHistory = {}
  // Snapshots written before these areas existed have to read as "unknown",
  // not crash the card that draws them.
  for (const snapshot of state.snapshots ?? []) {
    snapshot.activities ??= []
    snapshot.dungeonBests ??= []
    snapshot.raidProgress ??= []
    snapshot.gear ??= []
    snapshot.renown ??= []
    snapshot.xp ??= null
    snapshot.zone ??= null
    snapshot.lastActivity ??= null
    snapshot.auctions ??= null
    snapshot.mailCount ??= null
    snapshot.bagSpace ??= null
    snapshot.bags ??= null
    snapshot.bank ??= []
    snapshot.professions ??= []
    snapshot.cooldowns ??= []
  }
  if (!Array.isArray(state.warbandBanks)) state.warbandBanks = []
  // Same for the season currencies: a config from before them starts on the
  // suggested set rather than on an empty list.
  if (!Array.isArray(state.config.trackedFactions)) {
    state.config.trackedFactions = defaultTrackedFactions()
  }
  if (!Array.isArray(state.config.trackedCurrencies)) {
    state.config.trackedCurrencies = defaultTrackedCurrencies()
  }
  // Own chores came later; a config from before them has none.
  if (!Array.isArray(state.config.customTasks)) state.config.customTasks = []
  if (!state.config.customTicks || typeof state.config.customTicks !== 'object') state.config.customTicks = {}
  // A character had a focus, once - the set of what it is played for, which
  // said which vault rows were its week - and a role of one word before
  // that. The list is the one place now (`skips.ts`): a row the focus left
  // out is taken off the week, and the focus goes with the setup's question.
  foldFocusIntoSkips(state)
  // The board had a list of its own; the roster and the list are one place
  // now, so a character kept off the board is off the roster.
  const offBoard = (state.config as unknown as { dashboardHiddenKeys?: unknown }).dashboardHiddenKeys
  if (Array.isArray(offBoard)) {
    state.config.hiddenKeys = [
      ...new Set([...(state.config.hiddenKeys ?? []), ...offBoard.filter((key): key is string => typeof key === 'string')])
    ]
    delete (state.config as unknown as { dashboardHiddenKeys?: unknown }).dashboardHiddenKeys
  }
  // The evening's budget came later still; a config from before it plans for the default.
  if (typeof state.config.eveningMinutes !== 'number' || !(state.config.eveningMinutes > 0))
    state.config.eveningMinutes = DEFAULT_EVENING_MINUTES
  if (!state.config.supplyMinimums || typeof state.config.supplyMinimums !== 'object') state.config.supplyMinimums = {}
  if (!state.config.taskSkips || typeof state.config.taskSkips !== 'object') state.config.taskSkips = {}
  // A quest named the characters it was for, once; the choice is made on
  // the list now (`skips.ts`). Every character the list left out gets the
  // quest taken off its week, so nothing the player chose is lost.
  if (Array.isArray(state.config.weeklyQuests)) {
    const keys = (state.snapshots ?? []).map((snapshot) => snapshot.key)
    for (const quest of state.config.weeklyQuests as Array<WeeklyQuestDef & { characters?: unknown }>) {
      if (!Array.isArray(quest.characters)) continue
      for (const key of keys) {
        if (!quest.characters.includes(key)) state.config.taskSkips = withSkip(state.config.taskSkips, key, weeklyChoreId(quest), true)
      }
      delete quest.characters
    }
  }
  // A quest was bound to a profession by hand and flagged as one that pays
  // in gear, once; the register's tag binds it now (`questRegistry.ts`), and
  // the gear flag went with the focus. Both are dropped.
  if (Array.isArray(state.config.weeklyQuests)) {
    for (const quest of state.config.weeklyQuests as Array<WeeklyQuestDef & { profession?: unknown; gear?: unknown }>) {
      delete quest.profession
      delete quest.gear
    }
  }
  // The season's weekly was seven quests once, one line each; it is one line
  // with a pool now (`questPool.ts`), and a config from then folds into it.
  if (Array.isArray(state.config.weeklyQuests)) {
    state.config.weeklyQuests = foldIntoPools(
      state.config.weeklyQuests,
      seasonCatalog().quests.filter((quest) => quest.pool !== undefined)
    )
  }
  // The companion adapter was named after the app. Its id is neutral now, so
  // the next rename does not touch the config again.
  const sources = state.config.enabledSources
  if (sources && LEGACY_SOURCE_ID in sources && !(SOURCE_ID in sources)) {
    sources[SOURCE_ID] = sources[LEGACY_SOURCE_ID]
    delete sources[LEGACY_SOURCE_ID]
  }
  for (const snapshot of state.snapshots ?? []) {
    for (const [area, id] of Object.entries(snapshot.provenance ?? {})) {
      if (id === LEGACY_SOURCE_ID) snapshot.provenance[area] = SOURCE_ID
    }
  }
  return state
}

const SOURCE_ID = 'companion'
const LEGACY_SOURCE_ID = 'wowtodo'

const STATE_FILE = 'warband-briefing-state.json'
/**
 * Where the state was before the app was renamed. Electron names the user
 * data folder after the package, so the rename moved the folder; the first
 * start copies the old file over, and the old folder stays untouched.
 */
const LEGACY_STATE_FILES = [
  ['wowtodo', 'wowtodo-state.json'],
  ['WowTodo', 'wowtodo-state.json']
]

function stateFile(): string {
  return path.join(app.getPath('userData'), STATE_FILE)
}

/** The state file, or the first old one when the current does not exist yet. */
async function readStateText(): Promise<string> {
  const current = stateFile()
  try {
    return await fs.readFile(current, 'utf8')
  } catch {
    // No current file: a fresh install, or the first start after the rename.
  }
  for (const [folder, file] of LEGACY_STATE_FILES) {
    const legacy = path.join(app.getPath('appData'), folder, file)
    try {
      const text = await fs.readFile(legacy, 'utf8')
      await fs.mkdir(path.dirname(current), { recursive: true })
      await fs.writeFile(current, text, 'utf8')
      return text
    } catch {
      // Not there either; try the next.
    }
  }
  throw new Error('no state')
}

export class Store {
  private state: PersistedState = structuredClone(DEFAULT_STATE)

  async load(): Promise<void> {
    let text: string
    try {
      text = await readStateText()
    } catch {
      // No state yet - a fresh install starts from the defaults.
      this.state = structuredClone(DEFAULT_STATE)
      return
    }
    try {
      // Strip a BOM so a file touched by another editor still parses.
      const parsed = JSON.parse(text.replace(/^﻿/, '')) as Partial<PersistedState>
      this.state = { ...structuredClone(DEFAULT_STATE), ...parsed }
      this.state.config = { ...DEFAULT_CONFIG, ...this.state.config }
      this.state = migrate(this.state)
    } catch {
      // A file that does not parse holds the gold history and the settings
      // of months; the next save would write the defaults over it. It is
      // set aside under its own name, and the app starts from the defaults.
      this.state = structuredClone(DEFAULT_STATE)
      const file = stateFile()
      await fs.rename(file, `${file}.broken-${Date.now()}`).catch(() => undefined)
    }
  }

  getConfig(): AppConfig {
    return this.state.config
  }

  async setConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
    this.state.config = { ...this.state.config, ...patch }
    await this.save()
    return this.state.config
  }

  get region(): Region {
    return this.state.config.region
  }

  /** The frame the state file held, taken out of it: the next save writes the state without it. */
  takeLegacyWindow(): WindowPlacement | null {
    const placement = this.state.window ?? null
    delete this.state.window
    return placement
  }

  getCatalog(): FetchedCatalog | null {
    return this.state.catalog ?? null
  }

  async setCatalog(fetched: FetchedCatalog): Promise<void> {
    this.state.catalog = fetched
    await this.save()
  }

  getSnapshots(): CharacterSnapshot[] {
    return this.state.snapshots
  }

  async setSnapshots(
    snapshots: CharacterSnapshot[],
    gold: GoldSummary,
    accounts: string[],
    extras: {
      warbandBanks: WarbandBank[]
      accountCharacters: Record<string, number>
      accountQuests: WeeklyQuestDef[]
      events: WeeklyEvents | null
      seasonDungeons: SeasonDungeons | null
      lexicon: Lexicon
    }
  ): Promise<void> {
    this.state.snapshots = snapshots
    this.state.gold = gold
    this.state.warbandBanks = extras.warbandBanks
    this.state.accounts = accounts
    this.state.accountCharacters = extras.accountCharacters
    this.state.accountQuests = extras.accountQuests
    this.state.events = extras.events
    // A read without the list (an older companion) keeps the last one: the season has not changed.
    this.state.seasonDungeons = extras.seasonDungeons ?? this.state.seasonDungeons ?? null
    // What the read learned goes over what is known; nothing is forgotten.
    this.state.lexicon = mergeLexicons(this.state.lexicon, extras.lexicon)
    this.state.lastSyncAt = Date.now()
    // Every sync is a reading; the history modules decide whether it is worth keeping.
    this.state.goldHistory = recordGold(this.state.goldHistory, gold, this.state.lastSyncAt)
    this.state.charHistory = recordCharacters(this.state.charHistory, snapshots, this.state.lastSyncAt)
    await this.save()
  }

  getCharacterHistory(): CharacterHistory {
    return this.state.charHistory
  }

  getAccountQuests(): WeeklyQuestDef[] {
    return this.state.accountQuests ?? []
  }

  getEvents(): WeeklyEvents | null {
    return this.state.events ?? null
  }

  getSeasonDungeons(): SeasonDungeons | null {
    return this.state.seasonDungeons ?? null
  }

  getLexicon(): Lexicon {
    return this.state.lexicon ?? emptyLexicon()
  }

  getWarbandBanks(): WarbandBank[] {
    return this.state.warbandBanks ?? []
  }

  getGold(): GoldSummary {
    return this.state.gold
  }

  getGoldHistory(): GoldPoint[] {
    return this.state.goldHistory
  }

  /** Every WTF account the last read found, switched-off ones included. */
  getAccounts(): string[] {
    return this.state.accounts ?? []
  }

  /** Characters per WTF account, hidden ones counted too. */
  getAccountCharacters(): Record<string, number> {
    return this.state.accountCharacters ?? {}
  }

  get lastSyncAt(): number | null {
    return this.state.lastSyncAt
  }

  /** The writes, one after the other: two at once would share the one temporary file. */
  private writing: Promise<void> = Promise.resolve()

  private save(): Promise<void> {
    // A failed write must not stop the next one; the caller sees its own error.
    const next = this.writing.catch(() => undefined).then(() => this.write())
    this.writing = next
    return next
  }

  private async write(): Promise<void> {
    const file = stateFile()
    await fs.mkdir(path.dirname(file), { recursive: true })
    // Write-then-rename so a crash mid-write cannot leave a truncated file.
    const tmp = `${file}.tmp`
    await fs.writeFile(tmp, JSON.stringify(this.state, null, 2), 'utf8')
    await fs.rename(tmp, file)
  }
}
