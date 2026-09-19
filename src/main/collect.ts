/**
 * Reads every enabled source, merges them and marks snapshots that predate the
 * last weekly reset.
 */

import { createTranslator, resolveLocale } from '../shared/i18n'
import type {
  AppConfig,
  CharacterSnapshot,
  GoldSummary,
  SeasonDungeons,
  SyncStatus,
  WarbandBank,
  WeeklyEvents,
  WeeklyQuestDef
} from '../shared/types'
import { mergeSources, readSources, withAccountRewards, type SourceCharacter, type SourceStatus } from './sources'
import { lastWeeklyReset } from './season'
import type { Store } from './store'
import { mergeLexicons } from '../shared/lexicon'
import { withCategories } from '../shared/itemCategory'
import type { Region } from '../shared/enums/region'

export interface CollectResult {
  snapshots: CharacterSnapshot[]
  statuses: SourceStatus[]
  errors: string[]
  gold: GoldSummary
  /** The warband bank of every visible WTF account that has one listed. */
  warbandBanks: WarbandBank[]
  /** Every WTF account the read found, switched-off ones included. */
  accounts: string[]
  /**
   * How many characters each of those accounts holds, hidden or not - the
   * settings say what switching a folder off would take away.
   */
  accountCharacters: Record<string, number>
  events: WeeklyEvents | null
  seasonDungeons: SeasonDungeons | null
}

const EMPTY_GOLD: GoldSummary = {
  characters: 0,
  warband: 0,
  guilds: [],
  total: 0,
  byAccount: []
}

export class Collector {
  private status: SyncStatus = { running: false, step: '', errors: [] }
  private statuses: SourceStatus[] = []
  /** Weekly quests the last read saw completed - the settings suggestions. */
  private detectedQuests: WeeklyQuestDef[] = []
  /** The season's weeklies the companion learned from the game. */
  private learnedQuests: WeeklyQuestDef[] = []
  /**
   * Next weekly reset per region as the last read found it reported. Kept so
   * the rest of the app measures the week against the same boundary this read
   * did, rather than falling back to the rule on its own.
   */
  private resets: Partial<Record<Region, number>> = {}
  /** A run asked for while one runs: the files changed again, so the next run is owed. */
  private pending = false
  /**
   * The records each source gave on its last clean read. A file the game is
   * still writing does not parse; without this the source's characters
   * would drop off the roster and the gold history would dip until the
   * next read.
   */
  private lastGood = new Map<string, SourceCharacter[]>()

  constructor(
    private readonly store: Store,
    private readonly onStatus: (status: SyncStatus) => void,
    private readonly systemLocale: () => string | readonly string[]
  ) {}

  getStatus(): SyncStatus {
    return this.status
  }

  getSourceStatuses(): SourceStatus[] {
    return this.statuses
  }

  getDetectedQuests(): WeeklyQuestDef[] {
    return this.detectedQuests
  }

  getLearnedQuests(): WeeklyQuestDef[] {
    return this.learnedQuests
  }

  /** The client-reported next reset per region, empty where none was found. */
  getResets(): Partial<Record<Region, number>> {
    return this.resets
  }

  private setStatus(patch: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...patch }
    this.onStatus(this.status)
  }

  async run(): Promise<CollectResult> {
    if (this.status.running) {
      // WoW writes three files seconds apart; the change that lands mid-run
      // is not lost, the run goes again when this one is done.
      this.pending = true
      return {
        snapshots: this.store.getSnapshots(),
        statuses: this.statuses,
        errors: [],
        gold: this.store.getGold(),
        warbandBanks: this.store.getWarbandBanks(),
        accounts: this.store.getAccounts(),
        accountCharacters: this.store.getAccountCharacters(),
        events: this.store.getEvents(),
        seasonDungeons: this.store.getSeasonDungeons()
      }
    }

    const result = await this.collect()
    if (this.pending) {
      this.pending = false
      return this.run()
    }
    return result
  }

  private async collect(): Promise<CollectResult> {
    const config: AppConfig = this.store.getConfig()
    const translator = createTranslator(resolveLocale(config.language, this.systemLocale()))
    this.setStatus({ running: true, step: translator.t('sync.step.reading'), errors: [] })

    if (!config.wowPath) {
      const errors = [translator.t('error.noWowPath')]
      this.setStatus({ running: false, step: translator.t('sync.step.error'), errors })
      return {
        snapshots: [],
        statuses: [],
        errors,
        gold: EMPTY_GOLD,
        warbandBanks: [],
        accounts: this.store.getAccounts(),
        accountCharacters: this.store.getAccountCharacters(),
        events: null,
        seasonDungeons: this.store.getSeasonDungeons()
      }
    }

    try {
      const read = await readSources(config.wowPath, config.weeklyQuests, config.enabledSources, translator, this.lastGood)
      for (const status of read.statuses) {
        if (!status.error && read.bySource.has(status.id)) this.lastGood.set(status.id, read.bySource.get(status.id)!)
      }
      this.statuses = read.statuses
      this.detectedQuests = read.detectedQuests
      this.learnedQuests = read.learnedQuests
      this.resets = read.weeklyResetAt

      // An account switched off in the settings is simply not one of a
      // character's accounts any more - and a character left without a single
      // visible one leaves the roster with it.
      const hidden = new Set(config.hiddenAccounts ?? [])
      const visibleAccounts = read.accounts.filter((account) => !hidden.has(account))

      // What the app knows of the items: this read and every read before it.
      const lexicon = mergeLexicons(this.store.getLexicon(), read.lexicon)
      const merged = withAccountRewards(
        read,
        mergeSources(read, lastWeeklyReset(config.region, Date.now(), read.weeklyResetAt[config.region])).filter((c) => c.level >= config.minLevel)
      )

      // Counted before the hiding below: a folder switched off still has its
      // characters, and the settings say how many it keeps out.
      const accountCharacters = Object.fromEntries(
        read.accounts.map((account) => [account, merged.filter((c) => c.accounts.includes(account)).length])
      )

      const snapshots = merged
        .map((c) => {
          const accounts = c.accounts.filter((account) => !hidden.has(account))
          return {
            ...c,
            accounts,
            // The group of each item, for the bag drawn as a bag addon draws it.
            bags: c.bags ? withCategories([c.bags], lexicon)[0]! : null,
            bank: withCategories(c.bank, lexicon),
            // The data on hand may well have come from an account now hidden.
            accountName: accounts.includes(c.accountName) ? c.accountName : (accounts[0] ?? c.accountName),
            // Each region resets at its own time; prefer the one a source
            // reported for the character, and the boundary the client itself
            // named over the rule. A character with no weekly data at all
            // counts as stale. What is left in its vault is the merger's
            // business - it is the one that knows how old each area's numbers
            // are.
            stale: c.weeklyUpdatedAt < lastWeeklyReset(c.region ?? config.region, Date.now(), read.weeklyResetAt[c.region ?? config.region])
          }
        })
        .filter((c) => c.accounts.length > 0)
        // Item level is only comparable within an expansion, so level leads.
        .sort(
          (a, b) =>
            Number(a.stale) - Number(b.stale) ||
            b.level - a.level ||
            (b.itemLevel ?? 0) - (a.itemLevel ?? 0) ||
            translator.compare(a.name, b.name)
        )

      // Hidden characters still count: the total is about the account, not the view.
      const characterGold = snapshots.reduce((sum, c) => sum + (c.money ?? 0), 0)

      // Warband bank and guild banks are read per WTF account, so an account
      // switched off takes its own out of the totals. The same guild seen from
      // two accounts is still one guild - keep the best read, as the reader does.
      const visibleExtras = read.account.byAccount.filter((entry) => !hidden.has(entry.name))
      const warbandGold = visibleExtras.reduce((sum, entry) => sum + entry.warbandGold, 0)
      const guildBanks = new Map<string, number>()
      for (const entry of visibleExtras) {
        for (const guild of entry.guilds) {
          guildBanks.set(guild.name, Math.max(guildBanks.get(guild.name) ?? 0, guild.money))
        }
      }
      const guilds = [...guildBanks.entries()].map(([name, money]) => ({ name, money })).sort((a, b) => b.money - a.money)
      const guildGold = guilds.reduce((sum, g) => sum + g.money, 0)

      // A character logged in under two WTF accounts counts towards both here,
      // so each account's number matches the characters shown under it. Only
      // the top-level total is deduplicated.
      const byAccount = visibleAccounts.map((account) => {
        const extras = read.account.byAccount.find((entry) => entry.name === account)
        const characters = snapshots.filter((c) => c.accounts.includes(account)).reduce((sum, c) => sum + (c.money ?? 0), 0)
        const warband = extras?.warbandGold ?? 0
        const guilds = extras?.guilds ?? []
        return {
          account,
          characters,
          warband,
          guilds,
          total: characters + warband + guilds.reduce((sum, g) => sum + g.money, 0)
        }
      })

      const gold: GoldSummary = {
        characters: characterGold,
        warband: warbandGold,
        guilds,
        total: characterGold + warbandGold + guildGold,
        byAccount
      }

      // Only an account with a listed bank; an empty list would be a bank
      // with nothing in it, which is a different thing from no data.
      const warbandBanks: WarbandBank[] = visibleExtras
        .filter((entry) => entry.warbandBank.length > 0)
        .map((entry) => ({ account: entry.name, tabs: withCategories(entry.warbandBank, lexicon), updatedAt: entry.warbandBankAt }))

      await this.store.setSnapshots(snapshots, gold, read.accounts, {
        warbandBanks,
        accountCharacters,
        events: read.events,
        seasonDungeons: read.seasonDungeons,
        lexicon: read.lexicon
      })
      this.setStatus({ running: false, step: translator.t('sync.step.done'), errors: read.errors })
      return {
        snapshots,
        statuses: read.statuses,
        errors: read.errors,
        gold,
        warbandBanks,
        accounts: read.accounts,
        accountCharacters,
        events: read.events,
        seasonDungeons: this.store.getSeasonDungeons()
      }
    } catch (e) {
      const errors = [(e as Error).message]
      this.setStatus({ running: false, step: translator.t('sync.step.error'), errors })
      return {
        snapshots: this.store.getSnapshots(),
        statuses: this.statuses,
        errors,
        gold: this.store.getGold(),
        warbandBanks: this.store.getWarbandBanks(),
        accounts: this.store.getAccounts(),
        accountCharacters: this.store.getAccountCharacters(),
        events: this.store.getEvents(),
        seasonDungeons: this.store.getSeasonDungeons()
      }
    }
  }
}
