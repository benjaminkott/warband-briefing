import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, screen, shell } from 'electron'
import { existsSync, watch, type FSWatcher } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTranslator, resolveLocale, type Translator } from '../shared/i18n'
import type { AppConfig, ResolvedConfig } from '../shared/types'
import { seasonCatalog } from '../shared/seasonCatalog'
import type { DataBundle } from '../preload'
import { Store } from './store'
import { landsOn, WindowFrame, type WindowPlacement } from './windowFrame'
import { addonVersions, installAddon, updateAddon, type AddonVersions } from './addon'
import { Collector } from './collect'
import { detectWowPath, normaliseWowPath } from './wow'
import { ADAPTERS, getSourceStatuses } from './sources'
import { lastWeeklyReset, nextWeeklyReset } from './season'
import { Updater } from './updater'
import { applyAutoStart } from './autostart'
import { AppTray } from './tray'
import { CloseAction } from '../shared/enums/closeAction'
import { GameWatch } from './game'
import { pruneTicks } from '../shared/customTasks'
import { CatalogUpdater } from './catalog'
import { registerIconScheme, serveIcons } from './iconProtocol'
import { ThemeSetting } from '../shared/enums/themeSetting'

const __dirname_ = path.dirname(fileURLToPath(import.meta.url))

/**
 * A packaged build takes its window icon from the exe itself; only a dev run
 * has to be pointed at the generated file.
 */
const DEV_ICON = path.join(app.getAppPath(), 'build', 'icon.png')

/**
 * The watch restart of electron-vite starts the new instance while the GPU
 * process of the old one still holds the shader caches under userData.
 * Chromium then logs "Gpu Cache Creation failed" three times on every start.
 * A dev run does not need the caches; a packaged build has no such race.
 */
if (!app.isPackaged) app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

// A privileged scheme is registered before the app is ready, or not at all.
registerIconScheme()

const store = new Store()
const windowFrame = new WindowFrame(app.getPath('userData'))
let mainWindow: BrowserWindow | null = null
let refreshTimer: NodeJS.Timeout | null = null
let watchers: FSWatcher[] = []
/** Counts the calls of watchSavedVariables, so an overlapped one stands down. */
let watchGeneration = 0
let watchDebounce: NodeJS.Timeout | null = null

/**
 * The OS UI languages, most preferred first.
 *
 * `app.getLocale()` reports Chromium's *application* locale, which on Windows
 * follows the regional format setting and falls back to `en-US` whenever
 * Chromium has no matching translation - so it says "English" on a German
 * system. The preferred-languages list is the actual display-language order.
 */
function systemLocales(): string[] {
  const preferred = app.getPreferredSystemLanguages()
  if (preferred.length > 0) return preferred
  return [app.getSystemLocale() || app.getLocale()]
}

/** Translator bound to the current language setting; rebuilt when it changes. */
function translator(): Translator {
  return createTranslator(resolveLocale(store.getConfig().language, systemLocales()))
}

const collector = new Collector(
  store,
  (status) => send('sync:status', status),
  () => systemLocales()
)

/** The renderer hears every change; the state is asked once on load. */
const gameWatch = new GameWatch((state) => send('game:state', state))

/** The season catalog from the net, when the setting asks for it; a new one reaches the renderer as a config change. */
const catalogUpdater = new CatalogUpdater({ get: () => store.getCatalog(), set: (fetched) => store.setCatalog(fetched) }, () =>
  send('config:changed', resolvedConfig())
)

const updater = new Updater((state) => send('update:changed', state), translator)

/** Set once the app ends: the window's close then lets it go, whatever the close setting says. */
let quitting = false
app.on('before-quit', () => {
  quitting = true
})

const tray = new AppTray(
  {
    open: () => {
      if (!mainWindow) createWindow()
      else mainWindow.show()
      mainWindow?.focus()
    },
    quit: () => app.quit()
  },
  DEV_ICON
)

/** The tray icon stands while the app runs; its menu follows the language. */
function configureTray(): Promise<void> {
  return tray.configure(translator())
}

/** The page ground of the theme the config resolves to; see styles.css. */
function windowBackground(): string {
  const setting = store.getConfig().theme ?? ThemeSetting.System
  const dark = setting === ThemeSetting.System ? nativeTheme.shouldUseDarkColors : setting === ThemeSetting.Dark
  return dark ? '#111112' : '#f3f1ec'
}

/** The frame the window last had, if a good part of it still lands on a screen. */
function lastWindowFrame(): Pick<WindowPlacement, 'x' | 'y' | 'width' | 'height'> | null {
  const placement = windowFrame.get()
  if (!placement) return null
  const { x, y, width, height } = placement
  const frame = { x, y, width, height }
  return landsOn(frame, screen.getDisplayMatching(frame).workArea) ? frame : null
}

/** Records the window's normal frame, so a maximised window remembers what it was maximised over. */
function rememberWindow(): Promise<void> {
  if (!mainWindow || mainWindow.isMinimized()) return Promise.resolve()
  const maximized = mainWindow.isMaximized()
  const bounds = maximized ? mainWindow.getNormalBounds() : mainWindow.getBounds()
  return windowFrame.set({ ...bounds, maximized })
}

/**
 * The frame is written after every resize and move, once the drag has come
 * to rest. The dev watcher's restart and a crash end the process without a
 * close event; a frame written only at close would be lost with them.
 */
const FRAME_WRITE_DELAY_MS = 500
let frameWrite: NodeJS.Timeout | null = null

function scheduleFrameWrite(): void {
  if (frameWrite) clearTimeout(frameWrite)
  frameWrite = setTimeout(() => {
    frameWrite = null
    void rememberWindow()
  }, FRAME_WRITE_DELAY_MS)
}

function createWindow(): void {
  const frame = lastWindowFrame()
  mainWindow = new BrowserWindow({
    width: frame?.width ?? 1320,
    height: frame?.height ?? 880,
    x: frame?.x,
    y: frame?.y,
    // The floor the layout is built for: the dashboard and the cards have
    // their last breakpoint at 760, and the topbar collapses to icons above it.
    minWidth: 760,
    minHeight: 540,
    show: false,
    // The topbar is the title bar: it carries the window controls itself so
    // the OS chrome does not sit as a grey stripe above the dark app.
    frame: false,
    autoHideMenuBar: true,
    icon: !app.isPackaged && existsSync(DEV_ICON) ? DEV_ICON : undefined,
    // What the window is painted with before the renderer has drawn: the
    // theme's own ground, so a light setup does not flash dark on start.
    backgroundColor: windowBackground(),
    title: 'Warband Briefing',
    webPreferences: {
      preload: path.join(__dirname_, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // The layout scales with the window, not with the page: no page zoom.
      // Chromium remembers a zoom level per origin, so an accidental
      // Ctrl+wheel would otherwise stick across restarts.
      zoomFactor: 1
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (windowFrame.get()?.maximized) mainWindow?.maximize()
    mainWindow?.show()
  })
  mainWindow.on('resize', scheduleFrameWrite)
  mainWindow.on('move', scheduleFrameWrite)
  mainWindow.on('maximize', scheduleFrameWrite)
  mainWindow.on('unmaximize', scheduleFrameWrite)
  // The close writes the frame once more, whatever the timer still holds,
  // and waits for the write, so a quit right after cannot lose it.
  let closing = false
  mainWindow.on('close', (event) => {
    if (closing || !mainWindow) return
    // The window goes, the app stays: the watchers keep the data current,
    // the tray icon brings the window back. A quit takes the way below.
    if (store.getConfig().onClose === CloseAction.Background && !quitting) {
      event.preventDefault()
      mainWindow.hide()
      return
    }
    closing = true
    event.preventDefault()
    if (frameWrite) clearTimeout(frameWrite)
    frameWrite = null
    const window = mainWindow
    void rememberWindow().finally(() => window.destroy())
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  // The maximise button doubles as restore, so the renderer has to know
  // which one it is showing.
  const sendWindowState = (): void => mainWindow?.webContents.send('window:state', { maximized: mainWindow.isMaximized() })
  mainWindow.on('maximize', sendWindowState)
  mainWindow.on('unmaximize', sendWindowState)

  // The window is frameless and shows no menu, but Electron's default menu
  // still owns its accelerators: Ctrl+R reloads the page before the renderer
  // sees the key, and the renderer wants it for its own re-read. Without a
  // menu every key reaches the page; the dev tools keep their keys below.
  Menu.setApplicationMenu(null)

  // Pinch and Ctrl+wheel zoom are visual zoom; the zoom keys are closed here
  // too, so no path to page zoom stays open.
  void mainWindow.webContents.setVisualZoomLevelLimits(1, 1)
  mainWindow.webContents.on('did-finish-load', () => mainWindow?.webContents.setZoomFactor(1))
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const devToolsKey = (input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12'
    if (!app.isPackaged && devToolsKey) {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
      return
    }
    if (!(input.control || input.meta)) return
    if (['+', '-', '=', '0', 'Add', 'Subtract', 'NumpadAdd', 'NumpadSubtract'].includes(input.key)) {
      event.preventDefault()
    }
  })

  // Keep external links out of the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) void mainWindow.loadURL(devServer)
  else void mainWindow.loadFile(path.join(__dirname_, '../renderer/index.html'))
}

/**
 * Sends to the renderer once its page is there. The first read starts before
 * the window has loaded, and a message sent before that is lost.
 */
function send(channel: string, payload?: unknown): void {
  // Between the window's destroy and its `closed` event the reference is
  // there and its contents are gone; a send then throws into whatever
  // called it - a running read, a watcher.
  if (!mainWindow || mainWindow.isDestroyed()) return
  const contents = mainWindow.webContents
  if (contents.isLoading()) contents.once('did-finish-load', () => contents.send(channel, payload))
  else contents.send(channel, payload)
}

/**
 * Keeps the installed addon at the app's version, before every read of the
 * data. That covers the start after an app update, a changed WoW folder and
 * an addon that something else has put back. The game loads the new files
 * on the next /reload, so the renderer tells the user.
 */
async function keepAddonCurrent(): Promise<void> {
  let updated: AddonVersions | null = null
  try {
    updated = await updateAddon(store.getConfig().wowPath)
  } catch {
    // A locked or read-only AddOns folder: the settings still offer the
    // update button, and the next read tries again.
  }
  if (updated) send('addon:updated', updated)
}

async function refresh(): Promise<void> {
  await keepAddonCurrent()
  await collector.run()
  send('data:updated')
}

function scheduleAutoRefresh(): void {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  const minutes = store.getConfig().autoRefreshMinutes
  if (minutes <= 0) return
  refreshTimer = setInterval(() => void refresh(), minutes * 60_000)
}

/**
 * Watches the SavedVariables folders of every source so the overview updates by
 * itself the moment WoW writes them - which happens on logout and on /reload.
 */
async function watchSavedVariables(): Promise<void> {
  // Two calls can overlap - a chosen folder, an installed addon - and the
  // earlier one must not add its watchers after the later one took over.
  const generation = ++watchGeneration
  for (const watcher of watchers) watcher.close()
  watchers = []

  const wowPath = store.getConfig().wowPath
  if (!wowPath) return

  // Every account's SavedVariables folder, whether or not a source has
  // written there yet: a fresh account gets its first file at the first
  // logout, and the watcher has to be there to see it. The names come from
  // the adapters, so a file that appears later is a signal too.
  const interesting = ADAPTERS.flatMap((adapter) => adapter.fileNames).map((name) => name.toLowerCase().replace(/\.lua$/, ''))
  const accountsDir = path.join(wowPath, '_retail_', 'WTF', 'Account')
  let accounts: string[] = []
  try {
    accounts = await readdir(accountsDir)
  } catch {
    // No WTF folder yet: nothing to watch until the game has run once.
  }
  if (generation !== watchGeneration) return

  for (const account of accounts) {
    const folder = path.join(accountsDir, account, 'SavedVariables')
    try {
      const watcher = watch(folder, (_event, filename) => {
        const name = String(filename ?? '').toLowerCase()
        // `.lua.bak` shows up alongside the real write; treat both as a signal.
        if (name && !interesting.some((f) => name.startsWith(f))) return
        if (watchDebounce) clearTimeout(watchDebounce)
        // WoW writes the file in chunks; wait until it settles.
        watchDebounce = setTimeout(() => void refresh(), 1500)
      })
      watchers.push(watcher)
    } catch {
      // A missing or locked folder simply means no live updates for it.
    }
  }
}

/** Wraps a handler so renderer-side callers get `{ ok, ... }` instead of a rejection. */
function handle<T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true as const, data: await fn(...args) }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })
}

function resetInfo(): { resetAt: number; nextResetAt: number } {
  const region = store.region
  // The companion addon writes down the reset the realm actually runs on; the
  // regional rule stands in for everyone without it.
  const reported = collector.getResets()[region]
  const now = Date.now()
  return {
    resetAt: lastWeeklyReset(region, now, reported),
    nextResetAt: nextWeeklyReset(region, now, reported)
  }
}

/** The config as the renderer gets it: with the locale it resolves to and the catalog in force. */
function resolvedConfig(): ResolvedConfig {
  const config = store.getConfig()
  return {
    ...config,
    resolvedLocale: resolveLocale(config.language, systemLocales()),
    season: seasonCatalog(),
    seasonFetchedAt: store.getCatalog()?.fetchedAt ?? null
  }
}

function registerHandlers(): void {
  handle('config:get', () => resolvedConfig())

  handle('config:set', async (patch: Partial<AppConfig>) => {
    // A tick from before the reset is spent; it goes when the ticks are next written.
    if (patch.customTicks || patch.customTasks) {
      const current = store.getConfig()
      patch.customTicks = pruneTicks(
        patch.customTicks ?? current.customTicks,
        patch.customTasks ?? current.customTasks ?? [],
        resetInfo().resetAt
      )
    }
    const config = await store.setConfig(patch)

    if (patch.autoRefreshMinutes !== undefined) scheduleAutoRefresh()
    if (patch.updateSource !== undefined || patch.autoUpdate !== undefined || patch.language !== undefined) {
      updater.configure(config.updateSource, config.autoUpdate)
    }
    if (patch.wowPath !== undefined) await watchSavedVariables()
    if (patch.catalogUpdates !== undefined) catalogUpdater.configure(config.catalogUpdates)
    if (patch.autoStart !== undefined) applyAutoStart(config.autoStart)
    if (patch.language !== undefined) void configureTray()
    // What is read - which accounts count, which quests are watched, which
    // levels and which region - decides what the data itself contains, so
    // it has to be read again rather than merely re-rendered.
    if (
      patch.hiddenAccounts !== undefined ||
      patch.weeklyQuests !== undefined ||
      patch.minLevel !== undefined ||
      patch.region !== undefined
    ) {
      void refresh()
    }
    return resolvedConfig()
  })

  handle('wow:choose', async () => {
    const tr = translator()
    const result = await dialog.showOpenDialog({
      title: tr.t('dialog.chooseFolder.title'),
      properties: ['openDirectory'],
      message: tr.t('dialog.chooseFolder.message')
    })
    if (result.canceled || !result.filePaths[0]) return null
    const normalised = normaliseWowPath(result.filePaths[0])
    if (!normalised) throw new Error(tr.t('error.notAWowFolder'))
    await store.setConfig({ wowPath: normalised })
    await watchSavedVariables()
    return normalised
  })

  handle<DataBundle>('data:get', () => ({
    snapshots: store.getSnapshots(),
    gold: store.getGold(),
    warbandBanks: store.getWarbandBanks(),
    goldHistory: store.getGoldHistory(),
    charHistory: store.getCharacterHistory(),
    accounts: store.getAccounts(),
    accountCharacters: store.getAccountCharacters(),
    accountQuests: store.getAccountQuests(),
    events: store.getEvents(),
    seasonDungeons: store.getSeasonDungeons(),
    // Part of the state, not just of a sync result: the settings screen offers
    // these as suggestions and reads them the moment it opens, which is long
    // before anyone presses "read again".
    detectedQuests: collector.getDetectedQuests(),
    learnedQuests: collector.getLearnedQuests(),
    lastSyncAt: store.lastSyncAt,
    status: collector.getStatus(),
    sources: collector.getSourceStatuses(),
    ...resetInfo()
  }))

  handle('data:sync', async () => {
    await keepAddonCurrent()
    const result = await collector.run()
    return {
      ...result,
      goldHistory: store.getGoldHistory(),
      charHistory: store.getCharacterHistory(),
      detectedQuests: collector.getDetectedQuests(),
      learnedQuests: collector.getLearnedQuests(),
      lastSyncAt: store.lastSyncAt,
      ...resetInfo()
    }
  })

  handle('sources:list', async () => {
    const config = store.getConfig()
    const statuses = await getSourceStatuses(config.wowPath)
    // Only the app's own addon can be installed from here. The other addons
    // come from the community, and the app only reads their files.
    const versions = await addonVersions(config.wowPath)
    return statuses.map((status) => {
      const adapter = ADAPTERS.find((a) => a.id === status.id)!
      const live = collector.getSourceStatuses().find((s) => s.id === status.id)
      const shipped = adapter.id === 'companion'
      return {
        ...status,
        characterCount: live?.characterCount ?? null,
        error: live?.error ?? null,
        descriptionKey: adapter.descriptionKey,
        areas: adapter.areas,
        enabled: config.enabledSources[status.id] !== false,
        addonVersion: shipped ? versions.installed : null,
        bundledVersion: shipped ? versions.bundled : null,
        canInstall: shipped && versions.bundled !== null && config.wowPath !== null
      }
    })
  })

  handle('addon:install', async () => {
    const tr = translator()
    const versions = await installAddon(store.getConfig().wowPath, tr.t('error.noWowPath'), tr.t('error.noAddonBundled'))
    // A new folder has no SavedVariables yet. The watcher and the status line
    // must know that the addon is installed now.
    await watchSavedVariables()
    return versions
  })

  handle('sources:toggle', async (id: string, enabled: boolean) => {
    const current = store.getConfig().enabledSources
    await store.setConfig({ enabledSources: { ...current, [id]: enabled } })
    return store.getConfig().enabledSources
  })

  handle('chars:hide', async (key: string, hidden: boolean) => {
    const current = store.getConfig().hiddenKeys
    const next = hidden ? [...new Set([...current, key])] : current.filter((k) => k !== key)
    await store.setConfig({ hiddenKeys: next })
    return next
  })

  handle('update:state', () => updater.getState())

  handle('update:check', () => updater.check(false))

  handle('update:install', () => {
    updater.installNow()
    return true
  })

  handle('window:minimize', () => {
    mainWindow?.minimize()
    return true
  })

  handle('window:toggleMaximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })

  handle('window:close', () => {
    mainWindow?.close()
    return true
  })

  handle('window:state', () => ({ maximized: mainWindow?.isMaximized() ?? false }))
  handle('game:state', () => gameWatch.getState())

  handle('shell:openExternal', async (url: string) => {
    await shell.openExternal(url)
    return true
  })
}

async function start(): Promise<void> {
  await store.load()
  await windowFrame.load(store.takeLegacyWindow())
  // The last fetched catalog is in force before the first read, and the
  // fetch runs only where the setting asks for it.
  catalogUpdater.restore()
  catalogUpdater.configure(store.getConfig().catalogUpdates)

  // The window first: the search for the WoW folder below spawns the
  // registry and probes every drive, and the user waits on nothing for it.
  registerHandlers()
  // The lexicon and the setting are read at each request: a read that
  // learns an id, or a switch in the settings, counts from the next image.
  serveIcons({ lexicon: () => store.getLexicon(), region: () => store.getConfig().region, enabled: () => store.getConfig().gameIcons })
  createWindow()
  gameWatch.start()
  scheduleAutoRefresh()

  const config = store.getConfig()
  updater.configure(config.updateSource, config.autoUpdate)
  updater.start()
  applyAutoStart(config.autoStart)
  void configureTray()

  // First run: find the WoW folder so the first read needs no setup at all.
  if (!config.wowPath) {
    const detected = await detectWowPath()
    if (detected) {
      await store.setConfig({ wowPath: detected })
      send('config:changed', resolvedConfig())
    }
  }

  await watchSavedVariables()
  void refresh()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

// An app that sits in the background is started again from the start menu:
// the second start hands over to the first and ends. A dev run takes no
// lock: it shares the user data folder with an installed build, and the two
// must run side by side.
if (app.isPackaged && !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) createWindow()
    else mainWindow.show()
    mainWindow?.focus()
  })
  // A throw before the window exists would leave a process with no window and
  // no word; the box says what went wrong, and the process ends.
  void app
    .whenReady()
    .then(start)
    .catch((error: unknown) => {
      dialog.showErrorBox('Warband Briefing', error instanceof Error ? (error.stack ?? error.message) : String(error))
      app.quit()
    })
}

app.on('window-all-closed', () => {
  for (const watcher of watchers) watcher.close()
  updater.dispose()
  if (process.platform !== 'darwin') app.quit()
})
