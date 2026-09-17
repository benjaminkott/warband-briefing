import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppConfig,
  CharacterHistory,
  CharacterSnapshot,
  GoldPoint,
  GoldSummary,
  SeasonDungeons,
  WeeklyEvents,
  WeeklyQuestDef,
  ResolvedConfig,
  GameState,
  SyncStatus,
  UpdateState,
  WarbandBank
} from '../shared/types'

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface ResetInfo {
  resetAt: number
  nextResetAt: number
}

export interface DataBundle extends ResetInfo {
  snapshots: CharacterSnapshot[]
  gold: GoldSummary
  /** The warband bank per WTF account, where a source lists it. */
  warbandBanks: WarbandBank[]
  /** Gold readings over time, oldest first. */
  goldHistory: GoldPoint[]
  /** Item level and rating readings per character, oldest first. */
  charHistory: CharacterHistory
  /** Every WTF account found, the ones switched off in the settings included. */
  accounts: string[]
  /** Characters per WTF account, the switched-off ones counted too. */
  accountCharacters: Record<string, number>
  /** Weekly quests done once for the whole account this week. */
  accountQuests: WeeklyQuestDef[]
  /** The calendar's running events, where a source reported them. */
  events: WeeklyEvents | null
  /** The season's dungeons, run or not; null before the companion listed them. */
  seasonDungeons: SeasonDungeons | null
  /** Weekly quests the sources saw completed, offered in the settings. */
  detectedQuests: WeeklyQuestDef[]
  /** The season's weeklies the companion learned from the game. */
  learnedQuests: WeeklyQuestDef[]
  lastSyncAt: number | null
  status: SyncStatus
}

export interface SyncBundle extends ResetInfo {
  snapshots: CharacterSnapshot[]
  gold: GoldSummary
  warbandBanks: WarbandBank[]
  goldHistory: GoldPoint[]
  charHistory: CharacterHistory
  /** Every WTF account found, the ones switched off in the settings included. */
  accounts: string[]
  accountCharacters: Record<string, number>
  accountQuests: WeeklyQuestDef[]
  events: WeeklyEvents | null
  seasonDungeons: SeasonDungeons | null
  /** Weekly quests the sources saw completed, offered in the settings. */
  detectedQuests: WeeklyQuestDef[]
  /** The season's weeklies the companion learned from the game. */
  learnedQuests: WeeklyQuestDef[]
  lastSyncAt: number | null
  errors: string[]
}

export interface SourceInfo {
  id: string
  /** Translation key for the display name. */
  labelKey: string
  /** Translation key for the description. */
  descriptionKey: string
  areas: string[]
  enabled: boolean
  addonInstalled: boolean
  hasData: boolean
  files: Array<{ accountName: string; filePath: string; modifiedAt: number }>
  lastWriteAt: number | null
  characterCount: number | null
  error: string | null
  /** The version of the installed addon, only for the source that the app includes. Null otherwise. */
  addonVersion: string | null
  /** The version that the app includes, only for the source that the app includes. */
  bundledVersion: string | null
  /** True when the app can copy its addon into the game folder: it includes the addon and knows the folder. */
  canInstall: boolean
}

export interface AddonVersions {
  bundled: string | null
  installed: string | null
}

export interface WindowState {
  maximized: boolean
}

const invoke = <T>(channel: string, ...args: unknown[]): Promise<IpcResult<T>> =>
  ipcRenderer.invoke(channel, ...args) as Promise<IpcResult<T>>

const api = {
  config: {
    get: () => invoke<ResolvedConfig>('config:get'),
    set: (patch: Partial<AppConfig>) => invoke<ResolvedConfig>('config:set', patch)
  },
  wow: {
    choose: () => invoke<string | null>('wow:choose')
  },
  data: {
    get: () => invoke<DataBundle>('data:get'),
    sync: () => invoke<SyncBundle>('data:sync')
  },
  sources: {
    list: () => invoke<SourceInfo[]>('sources:list'),
    toggle: (id: string, enabled: boolean) => invoke<Record<string, boolean>>('sources:toggle', id, enabled)
  },
  chars: {
    hide: (key: string, hidden: boolean) => invoke<string[]>('chars:hide', key, hidden)
  },
  addon: {
    install: () => invoke<AddonVersions>('addon:install')
  },
  update: {
    state: () => invoke<UpdateState>('update:state'),
    check: () => invoke<UpdateState>('update:check'),
    install: () => invoke<boolean>('update:install')
  },
  window: {
    minimize: () => invoke<boolean>('window:minimize'),
    toggleMaximize: () => invoke<boolean>('window:toggleMaximize'),
    close: () => invoke<boolean>('window:close'),
    state: () => invoke<WindowState>('window:state')
  },
  shell: {
    openExternal: (url: string) => invoke<boolean>('shell:openExternal', url)
  },
  game: {
    state: () => invoke<GameState>('game:state')
  },
  /** The main process changed the config on its own - a fetched season catalog, for one. */
  onConfigChanged: (cb: (config: ResolvedConfig) => void) => {
    const listener = (_e: unknown, config: ResolvedConfig): void => cb(config)
    ipcRenderer.on('config:changed', listener)
    return (): void => {
      ipcRenderer.removeListener('config:changed', listener)
    }
  },
  /** The game started or stopped; the data on screen is older than the game's while it runs. */
  onGameState: (cb: (state: GameState) => void) => {
    const listener = (_e: unknown, state: GameState): void => cb(state)
    ipcRenderer.on('game:state', listener)
    return (): void => {
      ipcRenderer.removeListener('game:state', listener)
    }
  },
  onSyncStatus: (cb: (status: SyncStatus) => void) => {
    const listener = (_e: unknown, status: SyncStatus): void => cb(status)
    ipcRenderer.on('sync:status', listener)
    return (): void => {
      ipcRenderer.removeListener('sync:status', listener)
    }
  },
  onUpdateChanged: (cb: (state: UpdateState) => void) => {
    const listener = (_e: unknown, state: UpdateState): void => cb(state)
    ipcRenderer.on('update:changed', listener)
    return (): void => {
      ipcRenderer.removeListener('update:changed', listener)
    }
  },
  onWindowState: (cb: (state: WindowState) => void) => {
    const listener = (_e: unknown, state: WindowState): void => cb(state)
    ipcRenderer.on('window:state', listener)
    return (): void => {
      ipcRenderer.removeListener('window:state', listener)
    }
  },
  onDataUpdated: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('data:updated', listener)
    return (): void => {
      ipcRenderer.removeListener('data:updated', listener)
    }
  },
  /** The app has replaced the installed addon with its own version. */
  onAddonUpdated: (cb: (versions: AddonVersions) => void) => {
    const listener = (_e: unknown, versions: AddonVersions): void => cb(versions)
    ipcRenderer.on('addon:updated', listener)
    return (): void => {
      ipcRenderer.removeListener('addon:updated', listener)
    }
  }
}

export type BriefingApi = typeof api

contextBridge.exposeInMainWorld('briefing', api)
