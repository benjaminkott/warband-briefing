import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { keyed } from 'lit/directives/keyed.js'
import { provide } from '@lit/context'
import type {
  AppConfig,
  CharacterHistory,
  CharacterSnapshot,
  Goal,
  GoldPoint,
  GoldSummary,
  ResolvedConfig,
  SeasonDungeon,
  SeasonDungeons,
  SyncStatus,
  UpdateState,
  WarbandBank,
  WeeklyEvents,
  WeeklyQuestDef
} from '../../shared/types'
import type { DataBundle, IpcResult, SourceInfo, SyncBundle } from '../../preload/index'
import { createTranslator, type Translator } from '../../shared/i18n'
import { displayFlags, type DisplayFlags } from '../../shared/display'
import { eveningsUntil, formatUntil } from '../../shared/reset'
import { eveningMinutesOf } from '../../shared/effort'
import { withSkip, withSkips } from '../../shared/skips'
import { memoLast } from './memo'
import { goldMonth, type GoldSeries } from './model/gold'
import { isPlayed, rosterRows } from './model/dashboard'
import { seasonDungeons } from './model/dungeons'
import { openCount } from './model/tasks'
import { customTaskState, withTick, type CustomTaskState } from '../../shared/customTasks'
import { applyWowheadTooltips } from './wowheadTooltips'
import { DEFAULT_TRANSLATOR, translatorContext } from './i18n'
import { clockContext } from './clock'
import { WtElement, type WtEvent } from './element'
import { accountsIn, accountsOf, matches, rosterMaxLevel, sortCharacters } from './model/overview'
import { loadPrefs, savePrefs, type ViewPrefs } from './prefs'
import { followTheme } from './theme'
import type { NoticeMessage } from './components/Notice'
import { ThemeSetting } from '../../shared/enums/themeSetting'
import { AnyAccount } from '../../shared/enums/anyAccount'
import { SortDirection } from './enums/sortDirection'
import { SortKey } from './enums/sortKey'
import { ViewMode } from './enums/viewMode'
import type { TaskFilter } from './enums/taskFilter'
import type { TaskGrouping } from './enums/taskGrouping'
import { Tab, tabAfter } from './enums/tab'
import { Command } from './enums/command'
import { START, back, canBack, canForward, forward, here, lastTab, lookFor, visit, type Place, type Trail } from './model/navigation'
import { HitKind } from './enums/hitKind'
import { Stash } from './enums/stash'
import { DetailSection } from './enums/detailSection'
import type { Hit } from './model/search'
import { bindingOf } from './model/shortcuts'
import { SettingsSection } from './enums/settingsSection'
import { ButtonRole } from './enums/buttonRole'
import { Severity } from './enums/severity'
import './components/views/CharacterDetail'
import './components/views/GoldView'
import './components/views/BankView'
import './components/views/RenownView'
import './components/views/RosterView'
import './components/views/Settings'
import './components/views/TasksView'
import './components/EmptyState'
import './components/Notices'
import { hasNotices } from './components/Notices'
import './components/ui/Checkbox'
import './components/ui/Button'
import './components/Icon'
import './components/TopBar'
import './components/ui/TipLayer'
import { IconSize } from './enums/iconSize'

/** Unwraps the `{ ok, data | error }` envelope the main process returns. */
async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** One empty list, so the memo sees the same input while the companion lists nothing. */
const NO_DUNGEONS: SeasonDungeon[] = []

/**
 * The shell: holds what the main process sent, decides which view is open,
 * and turns the views' events into calls back to the main process. Nothing
 * is drawn here beyond the top bar, the scroll area and the tooltip layer;
 * the views under `components/` do the drawing.
 *
 * It is also the translator's provider, so every element below can pull the
 * translator from context rather than have it threaded through properties;
 * the shell itself reads it back the same way.
 */
@customElement('wt-app')
export class WtApp extends WtElement {
  @provide({ context: translatorContext })
  accessor translator: Translator = DEFAULT_TRANSLATOR

  @state() accessor config: ResolvedConfig | null = null
  /**
   * The places visited, and where the shell stands: a tab, and the character
   * whose page is open over it. A tab click closes the page: the tabs are the
   * way out, and a page that stayed put across them would make the tab bar
   * lie. The bar's back and forward buttons, the keys in shortcuts.ts and
   * the mouse's side buttons walk the trail as a browser's do.
   */
  @state() accessor trail: Trail = START
  @state() accessor sources: SourceInfo[] = []
  @state() accessor snapshots: CharacterSnapshot[] = []
  @state() accessor gold: GoldSummary | null = null
  @state() accessor warbandBanks: WarbandBank[] = []
  @state() accessor goldHistory: GoldPoint[] = []
  @state() accessor charHistory: CharacterHistory = {}
  @state() accessor detectedQuests: WeeklyQuestDef[] = []
  @state() accessor learnedQuests: WeeklyQuestDef[] = []
  @state() accessor accountQuests: WeeklyQuestDef[] = []
  @state() accessor events: WeeklyEvents | null = null
  /** The season's dungeons as the companion listed them; null before it did. */
  @state() accessor seasonDungeons: SeasonDungeons | null = null
  /** Every WTF account the last read found, switched-off ones included. */
  @state() accessor knownAccounts: string[] = []
  @state() accessor accountCharacters: Record<string, number> = {}
  @state() accessor lastSyncAt: number | null = null
  /** The shell's own clock, one tick a minute: the countdown and the relative times move on it. */
  // Provided as `tick`, consumed by every element - the shell included - as
  // `clock`: one name for both would feed the provider its own value forever.
  @provide({ context: clockContext })
  @state()
  accessor tick = Date.now()
  // Start of the current week. Needed to tell "was online last week" from
  // "has not been played in months".
  @state() accessor resetAt = Date.now()
  /** Whether the roster shows the characters not played this week or last; per session, like the task list's. */
  @state() accessor showQuiet = false
  // End of it. The top bar reads the countdown off the string the main process
  // formats; the dashboard sets the figures big and their units small, so it
  // needs the timestamp itself rather than the sentence.
  @state() accessor nextResetAt = Date.now()
  @state() accessor status: SyncStatus | null = null
  @state() accessor updateState: UpdateState | null = null
  /** Whether the game runs; while it does, the roster on screen is older than the game's. */
  @state() accessor gameRunning: boolean | null = null
  @state() accessor maximized = false
  @state() accessor notice: NoticeMessage | null = null
  @state() accessor busy = false
  @state() accessor prefs: ViewPrefs = loadPrefs()

  private unsubscribe: Array<() => void> = []
  private timer: ReturnType<typeof setInterval> | null = null
  /** Whether a bundle has been applied: the first one is the load, not an arrival. */
  private hadBundle = false
  /** Stops following the system's light/dark preference. */
  private unfollowTheme: (() => void) | null = null
  // Derived once per change of their inputs, not once per render: see memo.ts.
  private rosterWithSkips = memoLast(withSkips)
  private flagsFor = memoLast((display: AppConfig['display']) => displayFlags({ display }))
  // The sets the views take: a new one each render would make every child
  // see a changed property on each tick of the clock.
  private hiddenKeysOf = memoLast((keys: string[] | undefined) => new Set(keys ?? []))
  private trackedCurrenciesOf = memoLast((ids: number[] | undefined) => new Set(ids ?? []))
  private hiddenAccountsOf = memoLast((names: string[] | undefined) => new Set(names ?? []))
  private customOf = memoLast(customTaskState)
  private dungeonsOf = memoLast(seasonDungeons)
  private accountsOf = memoLast(accountsIn)
  // The month's gold series, drawn by the overview's and the board's tile alike.
  private goldMonthOf = memoLast(goldMonth)
  private relevantOf = memoLast((snapshots: CharacterSnapshot[], hiddenKeys: Set<string>) =>
    snapshots.filter((c) => !hiddenKeys.has(c.key))
  )
  // The hidden characters stay in: the gold total counts them (collect.ts).
  private goldCharactersOf = memoLast((snapshots: CharacterSnapshot[], account: string) =>
    snapshots.filter((c) => account === AnyAccount.All || accountsOf(c).includes(account))
  )
  // The roster's list: filtered, then sorted - once per change of what it reads.
  private visibleOf = memoLast(
    (
      relevant: CharacterSnapshot[],
      query: string,
      showQuiet: boolean,
      sort: SortKey,
      direction: SortDirection,
      tr: Translator,
      maxLevel: number,
      goals: Goal[],
      flags: DisplayFlags,
      resetAt: number,
      custom: CustomTaskState,
      minimums: AppConfig['supplyMinimums'] | null
    ) =>
      this.sorted(
        relevant.filter((character) => {
          if (!matches(character, query)) return false
          // Characters not seen this week or last say nothing about the
          // week, so they stay out of the roster until asked for.
          return showQuiet || isPlayed(character, resetAt)
        }),
        sort,
        direction,
        tr,
        maxLevel,
        goals,
        flags,
        resetAt,
        custom,
        minimums
      )
  )

  /**
   * The plan's order is the board's: a reward waiting first, then the biggest
   * pay-out. It comes from the same rows the board draws, so the roster and
   * the list never disagree about who goes first. "Most open" is the list's
   * own count of open lines, the plan's order between equals. The other
   * keys are the roster's own.
   */
  private sorted(
    list: CharacterSnapshot[],
    sort: SortKey,
    direction: SortDirection,
    tr: Translator,
    maxLevel: number,
    goals: Goal[],
    flags: DisplayFlags,
    resetAt: number,
    custom: CustomTaskState,
    minimums: AppConfig['supplyMinimums'] | null
  ): CharacterSnapshot[] {
    if (sort !== SortKey.Plan && sort !== SortKey.Todo) return sortCharacters(list, sort, direction, tr, maxLevel, goals, flags)
    const rows = rosterRows(list, goals, maxLevel, resetAt, tr, flags)
    const ordered =
      sort === SortKey.Todo
        ? rows
            .map((row) => ({ row, open: openCount(tr, row, flags, custom, minimums) }))
            .sort((a, b) => b.open - a.open)
            .map((entry) => entry.row)
        : rows
    const order = ordered.map((row) => row.character)
    return direction === SortDirection.Desc ? order : order.reverse()
  }
  override connectedCallback(): void {
    super.connectedCallback()
    void unwrap(window.briefing.config.get()).then((config) => {
      this.config = config
      void this.refreshMeta()
      void this.refreshData()
    })
    this.unsubscribe = [
      window.briefing.onSyncStatus((status) => (this.status = status)),
      window.briefing.onUpdateChanged((update) => (this.updateState = update)),
      window.briefing.onDataUpdated(() => {
        void this.refreshData()
        void this.refreshMeta()
      }),
      window.briefing.onWindowState((state) => (this.maximized = state.maximized)),
      window.briefing.onGameState((state) => (this.gameRunning = state.running)),
      window.briefing.onConfigChanged((config) => (this.config = config)),
      // The main process has put its own addon version into the game folder;
      // the sources panel shows the new version, the user does /reload.
      window.briefing.onAddonUpdated((versions) => {
        this.notice = { severity: Severity.Ok, text: this.tr.t('settings.sources.addonUpdated', { version: versions.installed ?? '' }) }
        void this.refreshMeta()
      })
    ]
    void window.briefing.window.state().then((r) => r.ok && (this.maximized = r.data.maximized))
    void window.briefing.game.state().then((r) => r.ok && (this.gameRunning = r.data.running))
    // The clock ticks once a minute for the countdown. The data itself
    // comes with the events the main process sends - and once more when
    // the reset passes, because "this week" is a different week then.
    this.timer = setInterval(() => {
      const before = this.tick
      this.tick = Date.now()
      if (before < this.nextResetAt && this.tick >= this.nextResetAt) void this.refreshData()
    }, 60_000)
    // Dark until the config says otherwise: the tokens' default, so the
    // first paint does not flash the wrong way round.
    this.unfollowTheme = followTheme(() => this.config?.theme ?? ThemeSetting.Dark)
    window.addEventListener('keydown', this.onWindowKey)
    window.addEventListener('mouseup', this.onWindowMouse)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.onWindowKey)
    window.removeEventListener('mouseup', this.onWindowMouse)
    for (const off of this.unsubscribe) off()
    this.unsubscribe = []
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.unfollowTheme?.()
    this.unfollowTheme = null
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    this.hostClasses({ app: true })
    // Rebuilding on every update would throw away the Intl formatters.
    if (changed.has('config')) {
      const previous = changed.get('config') as ResolvedConfig | null | undefined
      if (this.config && this.config.resolvedLocale !== previous?.resolvedLocale) {
        this.translator = createTranslator(this.config.resolvedLocale)
      }
      // Wowhead's tooltip script follows its switch; the links read the state when they draw.
      if (this.config && this.config.wowheadTooltips !== previous?.wowheadTooltips) applyWowheadTooltips(this.config.wowheadTooltips)
      // The theme follows the setting the same way; re-following applies it.
      if (this.config && this.config.theme !== previous?.theme) {
        this.unfollowTheme?.()
        this.unfollowTheme = followTheme(() => this.config?.theme ?? ThemeSetting.Dark)
      }
    }
  }

  private changePrefs(patch: Partial<ViewPrefs>): void {
    this.prefs = { ...this.prefs, ...patch }
    savePrefs(this.prefs)
  }

  private get tab(): Tab {
    return here(this.trail).tab
  }

  private get selectedKey(): string | null {
    return here(this.trail).character
  }

  /** The search text of the place the shell stands in. */
  private get query(): string {
    return here(this.trail).query
  }

  private go(place: Place): void {
    this.trail = visit(this.trail, place)
  }

  private setTab(next: Tab): void {
    this.go({ tab: next, character: null, query: '' })
  }

  private openCharacter(key: string | null): void {
    this.go({ tab: this.tab, character: key, query: '' })
  }

  /**
   * A hit of the search: a character's page, or the place an item sits -
   * the character's inventory section, or the bank tab - with the text
   * carried along, so the place opens narrowed to the item.
   */
  private openHit(hit: Hit): void {
    if (hit.kind === HitKind.Character) {
      this.openCharacter(hit.character.key)
      return
    }
    const query = this.query
    if (hit.stash === Stash.Warband) {
      // The bank is scoped to one account when the player picked one; the
      // hit's account has to be the one on screen.
      if (this.prefs.account !== AnyAccount.All && hit.account && this.prefs.account !== hit.account)
        this.changePrefs({ account: hit.account })
      this.go({ tab: Tab.Bank, character: null, query })
      return
    }
    if (!hit.character) return
    this.changePrefs({ detailSection: DetailSection.Inventory })
    this.go({ tab: this.tab, character: hit.character.key, query })
  }

  // The keys that move between screens; the table in shortcuts.ts names
  // them. A view's own keys (the search box, a page's neighbours) are the
  // view's, so a binding the shell does not own passes through.
  private onWindowKey = (event: KeyboardEvent): void => {
    const binding = bindingOf(event)
    if (!binding) return
    switch (binding.command) {
      case Command.Back:
        this.trail = back(this.trail)
        break
      case Command.Forward:
        this.trail = forward(this.trail)
        break
      case Command.OpenTab:
        this.setTab(binding.tab)
        break
      case Command.LastTab: {
        const previous = lastTab(this.trail)
        if (previous) this.setTab(previous)
        break
      }
      case Command.NextTab:
        this.setTab(tabAfter(this.tab, 1))
        break
      case Command.PrevTab:
        this.setTab(tabAfter(this.tab, -1))
        break
      case Command.Reread:
        // The same guard as the bar's button: a read that runs is not started twice.
        if (!this.busy && !this.status?.running) void this.sync()
        break
      default:
        return
    }
    event.preventDefault()
  }

  // The side buttons of a mouse are 3 and 4.
  private onWindowMouse = (event: MouseEvent): void => {
    if (event.button === 3) this.trail = back(this.trail)
    else if (event.button === 4) this.trail = forward(this.trail)
  }

  /** The settings, open on the section an empty state points at. */
  private openSettings(section: SettingsSection): void {
    this.changePrefs({ settingsSection: section })
    this.setTab(Tab.Settings)
  }

  /** The button on a message: the message is answered, so it goes. */
  private followNotice(tab: Tab): void {
    this.notice = null
    this.setTab(tab)
  }

  private async refreshMeta(): Promise<void> {
    this.config = await unwrap(window.briefing.config.get())
    this.updateState = await unwrap(window.briefing.update.state()).catch(() => null)
    this.sources = await unwrap(window.briefing.sources.list()).catch(() => [])
  }

  /** Takes what a read or a sync returned into state - the same fields either way. */
  private applyBundle(bundle: DataBundle | SyncBundle): void {
    // The first character arrives while the player still stands in the
    // settings after the setup: the list has filled behind the tabs, and
    // nothing there would say so. The message does, with the way to it.
    if (this.hadBundle && this.snapshots.length === 0 && bundle.snapshots.length > 0 && this.tab === Tab.Settings) {
      const names = bundle.snapshots.map((snapshot) => snapshot.name)
      this.notice = {
        severity: Severity.Ok,
        text: this.tr.plural('notice.firstCharacters', names.length, { names: names.join(', ') }),
        action: { label: this.tr.t('notice.toList'), tab: Tab.Tasks }
      }
    }
    this.hadBundle = true
    this.snapshots = bundle.snapshots
    this.gold = bundle.gold
    this.goldHistory = bundle.goldHistory
    // An older main process may not send these; a missing list must not take
    // the settings screen down with it.
    this.warbandBanks = bundle.warbandBanks ?? []
    this.charHistory = bundle.charHistory ?? {}
    this.detectedQuests = bundle.detectedQuests ?? []
    this.learnedQuests = bundle.learnedQuests ?? []
    this.accountQuests = bundle.accountQuests ?? []
    this.events = bundle.events ?? null
    this.seasonDungeons = bundle.seasonDungeons ?? null
    this.knownAccounts = bundle.accounts
    this.accountCharacters = bundle.accountCharacters ?? {}
    this.lastSyncAt = bundle.lastSyncAt
    this.resetAt = bundle.resetAt
    this.nextResetAt = bundle.nextResetAt
  }

  private async refreshData(): Promise<void> {
    const bundle = await unwrap(window.briefing.data.get())
    this.applyBundle(bundle)
    this.status = bundle.status
  }

  /** Runs an action, surfaces its error as a notice and keeps the UI in sync. */
  private async act(fn: () => Promise<void>, successText?: string): Promise<void> {
    this.busy = true
    this.notice = null
    try {
      await fn()
      if (successText) this.notice = { severity: Severity.Ok, text: successText }
    } catch (e) {
      this.notice = { severity: Severity.Danger, text: (e as Error).message }
    } finally {
      this.busy = false
    }
  }

  private sync(): Promise<void> {
    return this.act(async () => {
      const bundle = await unwrap(window.briefing.data.sync())
      this.applyBundle(bundle)
      await this.refreshMeta()
      if (bundle.errors.length > 0) {
        this.notice = { severity: Severity.Warn, text: bundle.errors.join(' · ') }
      }
    })
  }

  private installUpdate(): Promise<void> {
    return this.act(async () => {
      await unwrap(window.briefing.update.install())
    })
  }

  /** A box on an own chore, ticked or cleared: the config keeps the tick with its time. */
  private tickTask = (event: WtEvent<'wt-task-tick'>): void => {
    const { id, subject, done } = event.detail
    void this.changeConfig({ customTicks: withTick(this.config?.customTicks, id, subject, done) })
  }

  /** A line taken off a week or put back, in the list's pick mode. */
  private skipTask = (event: WtEvent<'wt-task-skip'>): void => {
    const { id, subject, skipped } = event.detail
    void this.changeConfig({ taskSkips: withSkip(this.config?.taskSkips, subject, id, skipped) })
  }

  private changeConfig(patch: Partial<AppConfig>): Promise<void> {
    return this.act(async () => {
      this.config = await unwrap(window.briefing.config.set(patch))
      this.sources = await unwrap(window.briefing.sources.list()).catch(() => [])
    })
  }

  /** The settings page's events, each a call to the main process. */
  private settingsHandlers = {
    config: (event: WtEvent<'wt-config'>) => void this.changeConfig(event.detail as Partial<AppConfig>),
    toggleSource: (event: WtEvent<'wt-toggle-source'>) =>
      void this.act(async () => {
        await unwrap(window.briefing.sources.toggle(event.detail.id, event.detail.enabled))
        await this.refreshMeta()
        await this.sync()
      }),
    checkUpdate: () =>
      void this.act(async () => {
        this.updateState = await unwrap(window.briefing.update.check())
      }),
    toggleCharacter: (event: WtEvent<'wt-toggle-character'>) =>
      void this.act(async () => {
        await unwrap(window.briefing.chars.hide(event.detail.key, event.detail.hidden))
        this.config = await unwrap(window.briefing.config.get())
      }),
    toggleAccount: (event: WtEvent<'wt-toggle-account'>) =>
      void this.act(async () => {
        const current = this.config?.hiddenAccounts ?? []
        const next = event.detail.hidden
          ? [...new Set([...current, event.detail.account])]
          : current.filter((a) => a !== event.detail.account)
        // The main process re-reads the sources and announces the new data
        // by itself; nothing to sync from here.
        this.config = await unwrap(window.briefing.config.set({ hiddenAccounts: next }))
      }),
    chooseWowPath: () =>
      void this.act(async () => {
        await unwrap(window.briefing.wow.choose())
        await this.refreshMeta()
        await this.sync()
      }),
    installAddon: () =>
      void this.act(async () => {
        await unwrap(window.briefing.addon.install())
        await this.refreshMeta()
      }, this.tr.t('settings.sources.addonInstalled'))
  }

  /**
   * What the views draw, derived from the state once per render: the roster
   * with its skips, the sets and the flags, the lists each view takes, and
   * the page's place in the list it was opened from.
   */
  private model(config: ResolvedConfig): ShellModel {
    const tr = this.tr
    const { prefs, query, sources } = this
    // Each character carries the chores the player took off from here on,
    // so every view that gets a character measures it by the same week
    // without the config.
    const snapshots = this.rosterWithSkips(this.snapshots, config.taskSkips)

    const hiddenKeys = this.hiddenKeysOf(config.hiddenKeys)
    const maxLevel = rosterMaxLevel(snapshots)
    // The whole roster, hidden characters too: a dungeon anyone ran is in the season.
    const dungeons = this.dungeonsOf(snapshots, this.seasonDungeons?.list ?? NO_DUNGEONS, tr)
    const goals = config.goals ?? []
    // What the views draw, resolved once: the stored flags over the defaults.
    const flags = this.flagsFor(config.display)
    const accounts = this.accountsOf(snapshots)
    // Only the gold tab switches between accounts - which folder a character
    // sits in says nothing about its week. A folder can disappear (renamed, or
    // switched off in the settings), so fall back to all of them.
    const account = prefs.account !== AnyAccount.All && !accounts.includes(prefs.account) ? AnyAccount.All : prefs.account

    /** Everything the roster counts: the characters, minus what the user hid. */
    const relevant = this.relevantOf(snapshots, hiddenKeys)
    // The user's own chores, with the reset that decides which ticks count.
    const custom = this.customOf(config, this.resetAt)
    const minimums = config.supplyMinimums ?? null
    const visible = this.visibleOf(
      relevant,
      query,
      this.showQuiet,
      // The tiles and the rows are in the plan's order; only the table sorts by a column.
      prefs.view === ViewMode.Table ? prefs.sort : SortKey.Plan,
      prefs.direction,
      tr,
      maxLevel,
      goals,
      flags,
      this.resetAt,
      custom,
      minimums
    )

    // The page walks the list it was opened from: the roster's, with its
    // filter and sort, when the character is in it - and otherwise the whole
    // roster in the same order, because the task list names characters the
    // filter would drop. A character the last read no longer knows simply
    // closes the page rather than leaving it open on nothing.
    const selectedKey = this.selectedKey
    const selected = snapshots.find((c) => c.key === selectedKey) ?? null
    const walk = !selectedKey
      ? []
      : visible.some((c) => c.key === selectedKey)
        ? visible
        : this.sorted(relevant, prefs.sort, prefs.direction, tr, maxLevel, goals, flags, this.resetAt, custom, minimums)
    const walkIndex = walk.findIndex((c) => c.key === selectedKey)

    return {
      config,
      snapshots,
      hiddenKeys,
      trackedCurrencies: this.trackedCurrenciesOf(config.trackedCurrencies),
      trackedFactions: config.trackedFactions ?? [],
      hiddenAccounts: this.hiddenAccountsOf(config.hiddenAccounts),
      maxLevel,
      goals,
      flags,
      custom,
      dungeons,
      accounts,
      account,
      goldMonth: this.goldMonthOf(this.goldHistory, this.gold),
      relevant,
      /** The gold tab has an account switcher of its own, so it scopes by account, not by the roster. */
      goldCharacters: this.goldCharactersOf(snapshots, account),
      visible,
      quietCount: relevant.filter((c) => !isPlayed(c, this.resetAt)).length,
      selected,
      prevKey: walkIndex > 0 ? walk[walkIndex - 1]!.key : null,
      nextKey: walkIndex >= 0 && walkIndex < walk.length - 1 ? walk[walkIndex + 1]!.key : null,
      nothingConfigured: !config.wowPath || sources.every((source) => !source.hasData),
      showAccount: accounts.length > 1
    }
  }

  protected override render(): TemplateResult {
    const config = this.config
    if (!config) return html``
    const model = this.model(config)
    return html`
      <wt-top-bar
        tab=${this.tab}
        ?can-back=${canBack(this.trail)}
        ?can-forward=${canForward(this.trail)}
        .lastSyncAt=${this.lastSyncAt}
        until-reset=${formatUntil(this.nextResetAt - this.tick)}
        evenings=${eveningsUntil(this.tick, this.nextResetAt)}
        .status=${this.status}
        .updateState=${this.updateState}
        ?maximized=${this.maximized}
        ?busy=${this.busy}
        query=${this.query}
        .characters=${model.relevant}
        .banks=${this.warbandBanks}
        ?show-account=${model.showAccount}
        @wt-tab=${(event: WtEvent<'wt-tab'>) => this.setTab(event.detail as Tab)}
        @wt-query=${(event: WtEvent<'wt-query'>) => (this.trail = lookFor(this.trail, event.detail))}
        @wt-open-hit=${(event: WtEvent<'wt-open-hit'>) => this.openHit(event.detail)}
        @wt-back=${() => (this.trail = back(this.trail))}
        @wt-forward=${() => (this.trail = forward(this.trail))}
        @wt-sync=${() => void this.sync()}
        @wt-install-update=${() => void this.installUpdate()}
      ></wt-top-bar>

      <div
        class="content"
        @wt-open-character=${(event: WtEvent<'wt-open-character'>) => this.openCharacter(event.detail)}
        @wt-query=${(event: WtEvent<'wt-query'>) => (this.trail = lookFor(this.trail, event.detail))}
        @wt-open-gold=${() => this.setTab(Tab.Gold)}
        @wt-open-settings=${(event: WtEvent<'wt-open-settings'>) => this.openSettings(event.detail)}
        @wt-tab=${(event: WtEvent<'wt-tab'>) => this.followNotice(event.detail)}
        @wt-install-update=${() => void this.installUpdate()}
      >
        ${
          hasNotices({ notice: this.notice, update: this.updateState, noWowPath: !config.wowPath })
            ? // Above every view, and only when there is something: the view
              // under it stays the first block of the scroll area otherwise.
              html`<wt-notices
                .notice=${this.notice}
                .updateState=${this.updateState}
                ?busy=${this.busy}
                ?no-wow-path=${!config.wowPath}
              ></wt-notices>`
            : nothing
        }
        ${this.view(model)}
      </div>

      <wt-tip-layer></wt-tip-layer>
    `
  }

  /**
   * The one view under the top bar: a character's page over whichever tab
   * it was opened from, else the tab - and, until a source has data, the
   * setup in place of the three roster views.
   */
  private view(model: ShellModel): TemplateResult {
    const { config, selected } = model
    if (selected) return this.detailView(model, selected)
    switch (this.tab) {
      case Tab.Settings:
        return this.settingsView(model)
      case Tab.Gold:
        return this.goldView(model)
      case Tab.Bank:
        return this.bankView(model)
      default:
        break
    }
    if (model.nothingConfigured && model.snapshots.length === 0) return this.setupState(config)
    switch (this.tab) {
      case Tab.Tasks:
        return this.tasksView(model)
      case Tab.Renown:
        return this.renownView(model)
      default:
        return this.rosterView(model)
    }
  }

  private renownView(model: ShellModel): TemplateResult {
    return html`<wt-renown-view .characters=${model.relevant} .trackedFactions=${model.trackedFactions}></wt-renown-view>`
  }

  private detailView(model: ShellModel, selected: CharacterSnapshot): TemplateResult {
    const { config, prevKey, nextKey } = model
    // Keyed, so a page opened on another character is a new element, not the old one refilled.
    return html`${keyed(
      selected.key,
      html`<wt-character-detail
        .character=${selected}
        .history=${this.charHistory[selected.key]}
        .maxLevel=${model.maxLevel}
        .resetAt=${this.resetAt}
        .goals=${model.goals}
        .flags=${model.flags}
        .custom=${model.custom}
        .dungeons=${model.dungeons}
        .supplyMinimums=${config.supplyMinimums ?? {}}
        region=${config.region}
        ?show-account=${model.showAccount}
        query=${this.query}
        .trackedCurrencies=${model.trackedCurrencies}
        ?has-prev=${prevKey !== null}
        ?has-next=${nextKey !== null}
        section=${this.prefs.detailSection}
        @wt-detail-section=${(event: WtEvent<'wt-detail-section'>) => this.changePrefs({ detailSection: event.detail })}
        @wt-back=${() => this.openCharacter(null)}
        @wt-task-tick=${this.tickTask}
        @wt-prev=${() => prevKey && this.openCharacter(prevKey)}
        @wt-next=${() => nextKey && this.openCharacter(nextKey)}
      ></wt-character-detail>`
    )}`
  }

  private settingsView(model: ShellModel): TemplateResult {
    const { config } = model
    return html`<wt-settings
      .config=${config}
      section=${this.prefs.settingsSection}
      resolved-locale=${config.resolvedLocale}
      .sources=${this.sources}
      .updateState=${this.updateState}
      ?busy=${this.busy}
      .characters=${model.snapshots}
      .detectedQuests=${this.detectedQuests}
      .learnedQuests=${this.learnedQuests}
      .hiddenKeys=${model.hiddenKeys}
      .accounts=${this.knownAccounts}
      .accountCharacters=${this.accountCharacters}
      .hiddenAccounts=${model.hiddenAccounts}
      @wt-config=${this.settingsHandlers.config}
      @wt-toggle-source=${this.settingsHandlers.toggleSource}
      @wt-check-update=${this.settingsHandlers.checkUpdate}
      @wt-toggle-character=${this.settingsHandlers.toggleCharacter}
      @wt-toggle-account=${this.settingsHandlers.toggleAccount}
      @wt-choose-wow-path=${this.settingsHandlers.chooseWowPath}
      @wt-install-addon=${this.settingsHandlers.installAddon}
      @wt-section=${(event: WtEvent<'wt-section'>) => this.changePrefs({ settingsSection: event.detail as SettingsSection })}
    ></wt-settings>`
  }

  private bankView(model: ShellModel): TemplateResult {
    return html`<wt-bank-view
      .banks=${this.warbandBanks}
      .accounts=${model.accounts}
      account=${model.account}
      query=${this.query}
      @wt-account=${(event: WtEvent<'wt-account'>) => this.changePrefs({ account: event.detail })}
    ></wt-bank-view>`
  }

  private goldView(model: ShellModel): TemplateResult {
    return html`<wt-gold-view
      .gold=${this.gold}
      .history=${this.goldHistory}
      .characters=${model.goldCharacters}
      .hiddenKeys=${model.hiddenKeys}
      .accounts=${model.accounts}
      account=${model.account}
      range=${this.prefs.goldRange}
      .lastSyncAt=${this.lastSyncAt}
      @wt-account=${(event: WtEvent<'wt-account'>) => this.changePrefs({ account: event.detail })}
      @wt-range=${(event: WtEvent<'wt-range'>) => this.changePrefs({ goldRange: event.detail })}
    ></wt-gold-view>`
  }

  /**
   * What a fresh install sees instead of a roster: a sentence on what comes
   * after, the three steps to the first read, each ticked as far as it is
   * done, and the way to the settings.
   */
  private setupState(config: AppConfig): TemplateResult {
    const tr = this.tr
    return html`<wt-empty-state icon="folder" heading=${tr.t('setup.title')}>
      <p class="setup-intro">${tr.t('setup.intro')}</p>
      <ol class="steps">
        <li>
          ${tr.t('setup.step.folder')}
          ${
            config.wowPath
              ? html`<span class="ok-text"><wt-icon name="check" size=${IconSize.Sm}></wt-icon> ${config.wowPath}</span>`
              : html`<span class="faint">${tr.t('setup.step.folderMissing')}</span>`
          }
        </li>
        <li>
          ${tr.t('setup.step.addon')}
          ${this.sources.some((source) => source.addonInstalled) ? html`<span class="ok-text"><wt-icon name="check" size=${IconSize.Sm}></wt-icon></span>` : nothing}
        </li>
        <li>${tr.t('setup.step.reload')}</li>
      </ol>
      <div class="row">
        <wt-button
          icon="settings"
          tone=${ButtonRole.Primary}
          label=${tr.t('setup.goToSettings')}
          @click=${() => this.openSettings(SettingsSection.Setup)}
        ></wt-button>
      </div>
    </wt-empty-state>`
  }

  private tasksView(model: ShellModel): TemplateResult {
    const { prefs } = this
    return html`<wt-tasks-view
      .characters=${model.relevant}
      .accountQuests=${this.accountQuests}
      .events=${this.events}
      .goals=${model.goals}
      .flags=${model.flags}
      .maxLevel=${model.maxLevel}
      .resetAt=${this.resetAt}
      .gameRunning=${this.gameRunning}
      .custom=${model.custom}
      .supplyMinimums=${model.config.supplyMinimums ?? {}}
      .skips=${model.config.taskSkips ?? {}}
      filter=${prefs.tasksFilter}
      .grouping=${prefs.tasksGrouping}
      evening-minutes=${eveningMinutesOf(model.config)}
      @wt-config=${this.settingsHandlers.config}
      @wt-tasks-filter=${(event: WtEvent<'wt-tasks-filter'>) => this.changePrefs({ tasksFilter: event.detail as TaskFilter })}
      @wt-tasks-grouping=${(event: WtEvent<'wt-tasks-grouping'>) => this.changePrefs({ tasksGrouping: event.detail as TaskGrouping })}
      @wt-task-tick=${this.tickTask}
      @wt-task-skip=${this.skipTask}
    ></wt-tasks-view>`
  }

  private rosterView(model: ShellModel): TemplateResult {
    const { config } = model
    const { prefs } = this
    return html`<wt-roster-view
      .characters=${model.relevant}
      .visible=${model.visible}
      quiet-count=${model.quietCount}
      .prefs=${prefs}
      .query=${this.query}
      .gold=${this.gold}
      .goldMonth=${model.goldMonth}
      .history=${this.charHistory}
      .hiddenKeys=${model.hiddenKeys}
      .goals=${model.goals}
      .flags=${model.flags}
      .custom=${model.custom}
      .dungeons=${model.dungeons}
      .supplyMinimums=${config.supplyMinimums ?? {}}
      .maxLevel=${model.maxLevel}
      .resetAt=${this.resetAt}
      .nextResetAt=${this.nextResetAt}
      region=${config.region}
      ?show-account=${model.showAccount}
      ?show-quiet=${this.showQuiet}
      @wt-quiet=${(event: WtEvent<'wt-quiet'>) => (this.showQuiet = event.detail)}
      @wt-sort-column=${(event: WtEvent<'wt-sort-column'>) => this.changePrefs({ sort: event.detail.sort as SortKey, direction: event.detail.direction })}
      @wt-view=${(event: WtEvent<'wt-view'>) => this.changePrefs({ view: event.detail as ViewMode })}
      @wt-task-tick=${this.tickTask}
    ></wt-roster-view>`
  }
}

/** What the shell derives from its state for the views, once per render. */
interface ShellModel {
  config: ResolvedConfig
  /** The roster, each character with its skips. */
  snapshots: CharacterSnapshot[]
  hiddenKeys: Set<string>
  trackedCurrencies: Set<number>
  trackedFactions: number[]
  hiddenAccounts: Set<string>
  maxLevel: number
  goals: Goal[]
  flags: DisplayFlags
  custom: CustomTaskState
  /** The season's dungeons: what the companion listed, and what the roster has run. */
  dungeons: SeasonDungeon[]
  accounts: string[]
  /** The gold tab's account, or `all` where the stored one is gone. */
  account: string
  goldMonth: GoldSeries | null
  relevant: CharacterSnapshot[]
  goldCharacters: CharacterSnapshot[]
  visible: CharacterSnapshot[]
  /** What the played filter leaves out. */
  quietCount: number
  selected: CharacterSnapshot | null
  prevKey: string | null
  nextKey: string | null
  nothingConfigured: boolean
  showAccount: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-app': WtApp
  }
}
