/**
 * Source registry and merger.
 *
 * Every adapter contributes what it knows; the merger picks a winner per data
 * area using the adapters' declared priority, breaking ties by freshness. The
 * result records which source won each area so the UI can be honest about it.
 */

import { existsSync } from 'node:fs'
import { WEEK_MS } from '../../shared/time'
import path from 'node:path'
import type { Translator } from '../../shared/i18n'
import type {
  CharacterSnapshot,
  Container,
  MythicRun,
  Profession,
  SeasonDungeons,
  WeeklyEvents,
  WeeklyQuestDef,
  WeeklyTask
} from '../../shared/types'
import { seasonCatalog, seasonCurrencyNames } from '../../shared/seasonCatalog'
import { isOffered, mergeRegistries, questProfession, seasonWeeklies, seenThisWeek, type QuestRegistry } from '../../shared/questRegistry'
import { fromPool, questIdsOf } from '../../shared/questPool'
import { mergeLexicons, type Lexicon } from '../../shared/lexicon'
import { fullVault } from '../../shared/vault'
import { applyEnchantSlots, learnEnchantSlots } from './enchants'
import { applyRewards, learnRewards } from './rewards'
import { retailDir } from './shared'
import { savedInstancesAdapter } from './savedinstances'
import { companionAdapter } from './companion'
import type { DataArea, ReadOptions, SourceAdapter, SourceCharacter, SourceStatus } from './types'
import type { Region } from '../../shared/enums/region'

export const ADAPTERS: SourceAdapter[] = [companionAdapter, savedInstancesAdapter]

export function getAdapter(id: string): SourceAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id)
}

export type { SourceAdapter, SourceStatus, SourceCharacter } from './types'
export { savedInstancesAdapter } from './savedinstances'
export { companionAdapter } from './companion'

/* ---------------- status ---------------- */

export async function getSourceStatuses(wowPath: string | null): Promise<SourceStatus[]> {
  if (!wowPath) {
    return ADAPTERS.map((adapter) => ({
      id: adapter.id,
      labelKey: adapter.labelKey,
      addonInstalled: false,
      hasData: false,
      files: [],
      lastWriteAt: null,
      characterCount: null,
      error: null
    }))
  }

  return Promise.all(
    ADAPTERS.map(async (adapter) => {
      const files = await adapter.findFiles(wowPath)
      return {
        id: adapter.id,
        labelKey: adapter.labelKey,
        addonInstalled: adapter.addonFolder ? existsSync(path.join(retailDir(wowPath), 'Interface', 'AddOns', adapter.addonFolder)) : false,
        hasData: files.length > 0,
        files,
        lastWriteAt: files.length > 0 ? Math.max(...files.map((f) => f.modifiedAt)) : null,
        characterCount: null,
        error: null
      }
    })
  )
}

/* ---------------- reading ---------------- */

/**
 * A quest the client tags with a profession is a task only for a character
 * with that profession. The register carries the tag; nothing else binds a
 * quest. A character without profession data keeps every quest: only the
 * companion addon reports professions, and "unknown" is not "none".
 */
function forProfessions(weeklies: WeeklyTask[], registry: QuestRegistry, professions: Profession[]): WeeklyTask[] {
  const bound = weeklies.map((task) => ({ ...task, profession: questProfession(registry, questIdsOf(task)) }))
  if (professions.length === 0) return bound
  const skills = new Set(professions.map((profession) => profession.skillLineId))
  return bound.filter((task) => !task.profession || skills.has(task.profession))
}

/**
 * The weeklies the game offers this week. The season's pool rotates: a
 * quest on the board one week is not there the next, and a line that says
 * "accept" for a quest nobody can accept is wrong. A quest done this week
 * was offered; a standing one - the catalog's core set, a profession's
 * quest, picked up at its giver every week - is offered unseen; any other
 * stays only when a log showed it since the reset, or when the register
 * does not know it at all.
 */
function offeredThisWeek(weeklies: WeeklyTask[], registry: QuestRegistry, resetAt: number): WeeklyTask[] {
  const standing = new Set(
    seasonCatalog()
      .quests.filter((quest) => quest.core)
      .map((quest) => quest.id)
  )
  return weeklies.filter((task) => task.done || task.profession || standing.has(task.id) || offered(registry, task, resetAt))
}

/** A pool is on the board when one of its quests was seen, or when the register knows none of them. */
function offered(registry: QuestRegistry, task: WeeklyTask, resetAt: number): boolean {
  const seen = questIdsOf(task).map((id) => seenThisWeek(registry, id, resetAt))
  return seen.includes(true) || seen.every((each) => each === null)
}

/**
 * The companion's quest log and turn-ins, laid over the weeklies whichever
 * source those came from. A source knows a weekly once it is done; only the
 * log knows one on the way - so "ready to turn in" and "2 of 4" come from
 * here, and a turn-in the log saw ticks a quest the other source has not
 * caught up with. Only records of this week count: a log from before the
 * reset describes quests that are gone.
 */
function overlayQuestLog(weeklies: WeeklyTask[], candidates: Candidate[], resetAt: number): WeeklyTask[] {
  const fresh = candidates.filter((c) => c.record.updatedAt >= resetAt)
  // A log was read at all: only then is "not on it" a fact.
  const logKnown = fresh.some((c) => c.record.questLog !== undefined)
  const log = new Map(fresh.flatMap((c) => (c.record.questLog ?? []).map((quest) => [quest.id, quest] as const)))
  const done = new Set(fresh.flatMap((c) => (c.record.questsDone ?? []).map((quest) => quest.id)))
  if (!logKnown && done.size === 0) return weeklies
  return weeklies.map((task) => {
    const entry = fromPool(task, (id) => log.get(id))
    if (task.done || questIdsOf(task).some((id) => done.has(id))) return { ...task, done: true }
    if (!entry) return logKnown ? { ...task, onLog: false } : task
    return {
      ...task,
      label: entry.title || task.label,
      onLog: true,
      ready: entry.ready || task.ready === true,
      progress: entry.progress ?? task.progress ?? null
    }
  })
}

/** Account-wide extras of a single WTF account folder. */
export interface AccountExtras {
  name: string
  warbandGold: number
  /** The warband bank's tabs, from the source that lists items; empty without one. */
  warbandBank: Container[]
  /** When that source last read the tabs; null without one. */
  warbandBankAt: number | null
  guilds: Array<{ name: string; money: number }>
}

export interface ReadResult {
  /** Records grouped by adapter id, in registry order. */
  bySource: Map<string, SourceCharacter[]>
  statuses: SourceStatus[]
  errors: string[]
  /** Account-wide extras, merged across adapters and WTF accounts. */
  account: {
    warbandGold: number
    guilds: Array<{ name: string; money: number }>
    /** The same extras kept apart per WTF account. */
    byAccount: AccountExtras[]
  }
  /**
   * Which WTF accounts have seen each character. Kept next to the records
   * because the per-adapter dedupe below only survives one of them.
   */
  accountsByKey: Map<string, string[]>
  /** Every WTF account folder a source found data in. */
  accounts: string[]
  /**
   * The next weekly reset per region, as the client itself reported it. Only a
   * source running inside the game can know this, so it is usually empty - and
   * where it is filled it is exact, which no rule of ours can promise.
   */
  weeklyResetAt: Partial<Record<Region, number>>
  /**
   * Weekly quests the sources saw a character finish this week, whatever the
   * user watches. The settings screen offers them, so nobody has to look up an
   * id to add the quest they just did.
   */
  detectedQuests: WeeklyQuestDef[]
  /**
   * The season's weeklies as the companion learned them from the game -
   * every register of every account as one. Empty without the companion.
   */
  learnedQuests: WeeklyQuestDef[]
  /** Weekly quests done once for the whole account this week. */
  accountQuests: WeeklyQuestDef[]
  /** The companion's register of quests, every account's as one. Empty without the companion. */
  questRegistry: QuestRegistry
  /** The calendar's running events, from whichever source reported them last. */
  events: WeeklyEvents | null
  /** The season's dungeons, from whichever source listed them last. */
  seasonDungeons: SeasonDungeons | null
  /** The icons every account's companion registered, as one lexicon. Empty without the companion. */
  lexicon: Lexicon
}

export async function readSources(
  wowPath: string,
  weeklyQuests: WeeklyQuestDef[],
  enabled: Record<string, boolean>,
  translator: Translator,
  /** Each source's records from its last clean read, for a file that fails now. */
  lastGood: ReadonlyMap<string, SourceCharacter[]> = new Map()
): Promise<ReadResult> {
  const bySource = new Map<string, SourceCharacter[]>()
  const statuses: SourceStatus[] = []
  const errors: string[] = []
  const guildGold = new Map<string, number>()
  const accountsByKey = new Map<string, Set<string>>()
  const seenAccounts = new Set<string>()
  const extrasByAccount = new Map<
    string,
    {
      warbandGold: number
      warbandGoldAt: number
      warbandBank: Container[]
      warbandBankAt: number | null
      warbandBankRank: number
      guilds: Map<string, number>
    }
  >()

  // Currency names only exist in sources that report them; read those first so
  // the later adapters can borrow the names for their id-only records. The
  // season catalogue seeds the ones no addon knows - a client name still wins,
  // so a German client shows German names.
  const currencyNames: Record<number, string> = seasonCurrencyNames()
  const detectedQuests = new Map<number, string>()
  const registries: QuestRegistry[] = []
  const lexicons: Lexicon[] = []
  const accountQuests = new Map<number, string>()
  let events: WeeklyEvents | null = null
  let seasonDungeons: SeasonDungeons | null = null
  const weeklyResetAt: Partial<Record<Region, number>> = {}
  const options: ReadOptions = { wowPath, weeklyQuests, currencyNames, translator }

  for (const adapter of ADAPTERS) {
    const status: SourceStatus = {
      id: adapter.id,
      labelKey: adapter.labelKey,
      addonInstalled: adapter.addonFolder ? existsSync(path.join(retailDir(wowPath), 'Interface', 'AddOns', adapter.addonFolder)) : false,
      hasData: false,
      files: [],
      lastWriteAt: null,
      characterCount: null,
      error: null
    }

    if (enabled[adapter.id] === false) {
      statuses.push(status)
      continue
    }

    try {
      const files = await adapter.findFiles(wowPath)
      status.files = files
      status.hasData = files.length > 0
      status.lastWriteAt = files.length > 0 ? Math.max(...files.map((f) => f.modifiedAt)) : null

      const records: SourceCharacter[] = []
      for (const file of files) {
        seenAccounts.add(file.accountName)
        try {
          const read = await adapter.read(file, options)
          records.push(...read)
          for (const record of read) {
            for (const quest of record.seenWeeklies ?? []) detectedQuests.set(quest.id, quest.label)
            // The freshest stamp wins: an older one describes the same
            // boundary a whole number of weeks back - and past two weeks
            // season.ts lets the realm's rule decide, because a stamp walked
            // across a change of daylight saving is an hour off.
            if (record.region && record.weeklyResetAt) {
              const known = weeklyResetAt[record.region] ?? 0
              if (record.weeklyResetAt > known) weeklyResetAt[record.region] = record.weeklyResetAt
            }
          }
          // Noted before the dedupe below, which keeps only one record per key.
          for (const record of read) {
            const accounts = accountsByKey.get(record.key) ?? new Set<string>()
            accounts.add(record.accountName)
            accountsByKey.set(record.key, accounts)
          }
          if (adapter.readAccount) {
            const account = await adapter.readAccount(file, options)
            const extras = extrasByAccount.get(file.accountName) ?? {
              warbandGold: 0,
              warbandGoldAt: 0,
              warbandBank: [],
              warbandBankAt: null,
              warbandBankRank: 0,
              guilds: new Map<string, number>()
            }
            // Gold moves by the minute, so the latest read of the account's
            // warband bank is the one, whichever source made it. Each WTF
            // account has its own warband bank; those add up below.
            const goldAt = account.warbandGoldAt ?? file.modifiedAt
            if (account.warbandGold !== undefined && goldAt > extras.warbandGoldAt) {
              extras.warbandGold = account.warbandGold
              extras.warbandGoldAt = goldAt
            }
            // The tabs come from the source that ranks highest for the bags:
            // the companion read them off the client at the bank, an addon's
            // copy is the fallback for an account it has not visited with.
            const rank = adapter.priority.bags ?? 0
            if (account.warbandBank?.length && rank > extras.warbandBankRank) {
              extras.warbandBank = account.warbandBank
              extras.warbandBankAt = account.warbandBankAt ?? file.modifiedAt
              extras.warbandBankRank = rank
            }
            for (const guild of account.guilds ?? []) {
              // The same guild shows up under several accounts; keep the best read.
              guildGold.set(guild.name, Math.max(guildGold.get(guild.name) ?? 0, guild.money))
              extras.guilds.set(guild.name, Math.max(extras.guilds.get(guild.name) ?? 0, guild.money))
            }
            extrasByAccount.set(file.accountName, extras)
            for (const quest of account.accountQuests ?? []) accountQuests.set(quest.id, quest.label)
            if (account.questRegistry) registries.push(account.questRegistry)
            if (account.lexicon) lexicons.push(account.lexicon)
            // Events are the same for everyone; the freshest report is simply
            // the one least likely to describe last week.
            if (account.events && (!events || account.events.updatedAt > events.updatedAt)) {
              events = account.events
            }
            // The same for the season's dungeons: the freshest list is the season's.
            if (account.seasonDungeons && (!seasonDungeons || account.seasonDungeons.updatedAt > seasonDungeons.updatedAt)) {
              seasonDungeons = account.seasonDungeons
            }
          }
        } catch (e) {
          const message = translator.t('error.sourceFileUnreadable', {
            source: translator.t(adapter.labelKey),
            account: file.accountName,
            message: (e as Error).message
          })
          errors.push(message)
          status.error = message
        }
      }

      // Keep the newest record when a character appears in several accounts.
      const byKey = new Map<string, SourceCharacter>()
      for (const record of records) {
        const existing = byKey.get(record.key)
        if (!existing || record.updatedAt > existing.updatedAt) byKey.set(record.key, record)
      }
      // A file the game is still writing fails to parse; the source's last
      // clean read stands in, so nobody drops off the roster for a second.
      // The status keeps the error, so the settings say what happened.
      const deduped = status.error && lastGood.has(adapter.id) ? lastGood.get(adapter.id)! : [...byKey.values()]

      for (const record of deduped) {
        for (const currency of record.currencies ?? []) {
          // An empty name means the adapter did not know one.
          if (currency.id > 0 && currency.name.length > 0) {
            currencyNames[currency.id] = currency.name
          }
        }
      }

      status.characterCount = deduped.length
      bySource.set(adapter.id, deduped)
    } catch (e) {
      status.error = `${translator.t(adapter.labelKey)}: ${(e as Error).message}`
      errors.push(status.error)
    }

    statuses.push(status)
  }

  const byMoney = (a: { money: number }, b: { money: number }): number => b.money - a.money

  const registry = mergeRegistries(registries)
  return {
    bySource,
    statuses,
    errors,
    account: {
      warbandGold: [...extrasByAccount.values()].reduce((sum, extras) => sum + extras.warbandGold, 0),
      guilds: [...guildGold.entries()].map(([name, money]) => ({ name, money })).sort(byMoney),
      byAccount: [...extrasByAccount.entries()]
        .map(([name, extras]) => ({
          name,
          warbandGold: extras.warbandGold,
          warbandBank: extras.warbandBank,
          warbandBankAt: extras.warbandBankAt,
          guilds: [...extras.guilds.entries()].map(([g, money]) => ({ name: g, money })).sort(byMoney)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    accountsByKey: new Map([...accountsByKey.entries()].map(([key, accounts]) => [key, [...accounts].sort()])),
    accounts: [...seenAccounts].sort(),
    weeklyResetAt,
    // A source saw the quest; the register says whether it is worth an
    // offer - a hidden one or one of an older expansion is not.
    detectedQuests: [...detectedQuests.entries()]
      .filter(([id]) => isOffered(registry, id))
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => translator.compare(a.label, b.label)),
    learnedQuests: seasonWeeklies(registry),
    questRegistry: registry,
    accountQuests: [...accountQuests.entries()].map(([id, label]) => ({ id, label })).sort((a, b) => translator.compare(a.label, b.label)),
    events,
    seasonDungeons,
    lexicon: mergeLexicons(...lexicons)
  }
}

/* ---------------- merging ---------------- */

/** Which adapter supplied each area of a merged character. */
export type Provenance = Partial<Record<DataArea, string>>

interface Candidate {
  adapter: SourceAdapter
  record: SourceCharacter
}

/** The span between two weekly resets - how long a vault reward stays there. */

/** Areas that describe the current week and go stale at the weekly reset. */
const WEEKLY_AREAS = new Set<DataArea>(['vault', 'runs', 'lockouts', 'worldBosses', 'weeklies', 'activities'])

/**
 * Picks the winning candidate for one area: highest declared priority first,
 * freshest record on a tie. Candidates that have nothing for the area lose.
 *
 * For weekly areas a record from the current week always beats one from before
 * the reset, whatever the priority - last week's vault is not better data than
 * this week's, it is simply wrong.
 */
function pickForArea(
  candidates: Candidate[],
  area: DataArea,
  hasValue: (record: SourceCharacter) => boolean,
  resetAt: number
): Candidate | null {
  const usable = candidates.filter((c) => (c.adapter.priority[area] ?? 0) > 0 && hasValue(c.record))
  if (usable.length === 0) return null

  const weekly = WEEKLY_AREAS.has(area)
  const fresh = (c: Candidate): number => (weekly && c.record.updatedAt >= resetAt ? 1 : 0)

  return usable.sort(
    (a, b) =>
      fresh(b) - fresh(a) || (b.adapter.priority[area] ?? 0) - (a.adapter.priority[area] ?? 0) || b.record.updatedAt - a.record.updatedAt
  )[0]
}

/**
 * The winning run list, with the details the other sources recorded for the
 * same runs. The companion addon has the client's own list, which is the one
 * to trust for what was run - but SavedInstances is the one that timed each
 * run and noted its score, and a run is the same run in both: same dungeon,
 * same level, matched off in order so a repeat run pairs with its own record.
 */
function enrichRuns(runs: MythicRun[], others: MythicRun[][]): MythicRun[] {
  const spare = others.flat()
  if (spare.length === 0) return runs
  return runs.map((run) => {
    if (run.durationSec && run.score && run.completedAt) return run
    const index = spare.findIndex((other) => other.mapChallengeModeId === run.mapChallengeModeId && other.level === run.level)
    if (index === -1) return run
    const [other] = spare.splice(index, 1)
    return {
      ...run,
      durationSec: run.durationSec ?? other!.durationSec ?? null,
      score: run.score ?? other!.score ?? null,
      completedAt: run.completedAt ?? other!.completedAt ?? null
    }
  })
}

export interface MergedCharacter extends CharacterSnapshot {
  provenance: Provenance
}

/**
 * @param resetAt timestamp of the last weekly reset, used to prefer records from
 *                the current week for weekly data.
 */
export function mergeSources(read: ReadResult, resetAt = 0): MergedCharacter[] {
  const byKey = new Map<string, Candidate[]>()
  for (const [sourceId, records] of read.bySource) {
    const adapter = getAdapter(sourceId)
    if (!adapter) continue
    for (const record of records) {
      const list = byKey.get(record.key) ?? []
      list.push({ adapter, record })
      byKey.set(record.key, list)
    }
  }

  const merged: MergedCharacter[] = []
  for (const [key, candidates] of byKey) {
    const provenance: Provenance = {}

    const identity = pickForArea(candidates, 'identity', () => true, resetAt)
    // Every candidate carries a name, so identity always resolves.
    const base = identity?.record ?? candidates[0].record
    if (identity) provenance.identity = identity.adapter.id

    const vaultRead = pickForArea(candidates, 'vault', (r) => (r.vault?.length ?? 0) > 0, resetAt)
    // The Great Vault keeps what was earned until the following reset, so rows
    // read before the last one are still a reward waiting to be collected -
    // the one thing a snapshot from last week has left to say. A week older
    // and that reward expired uncollected, so those rows are dropped rather
    // than shown as progress towards a week that has long since gone.
    const vault = vaultRead && vaultRead.record.updatedAt >= resetAt - WEEK_MS ? vaultRead : null
    const runs = pickForArea(candidates, 'runs', (r) => (r.mythicRuns?.length ?? 0) > 0, resetAt)
    const lockouts = pickForArea(candidates, 'lockouts', (r) => (r.lockouts?.length ?? 0) > 0, resetAt)
    const bosses = pickForArea(candidates, 'worldBosses', (r) => (r.worldBosses?.length ?? 0) > 0, resetAt)
    const currencies = pickForArea(candidates, 'currencies', (r) => (r.currencies?.length ?? 0) > 0, resetAt)
    const weeklies = pickForArea(candidates, 'weeklies', (r) => (r.weeklies?.length ?? 0) > 0, resetAt)
    const activities = pickForArea(candidates, 'activities', (r) => (r.activities?.length ?? 0) > 0, resetAt)
    // Season-long and gear state, not weekly: the freshest good read wins on
    // priority alone, and a source without the sockets loses to one with them.
    const bests = pickForArea(candidates, 'dungeonBests', (r) => (r.dungeonBests?.length ?? 0) > 0, resetAt)
    const raids = pickForArea(candidates, 'raidProgress', (r) => (r.raidProgress?.length ?? 0) > 0, resetAt)
    const gear = pickForArea(candidates, 'gear', (r) => (r.gear?.length ?? 0) > 0, resetAt)
    const renown = pickForArea(candidates, 'renown', (r) => (r.renown?.length ?? 0) > 0, resetAt)
    // Bags and bank are one read of one file: the source that lists the bags lists the bank.
    const bags = pickForArea(candidates, 'bags', (r) => r.bags != null || (r.bank?.length ?? 0) > 0, resetAt)

    if (vault) provenance.vault = vault.adapter.id
    if (runs) provenance.runs = runs.adapter.id
    if (lockouts) provenance.lockouts = lockouts.adapter.id
    if (bosses) provenance.worldBosses = bosses.adapter.id
    if (currencies) provenance.currencies = currencies.adapter.id
    if (weeklies) provenance.weeklies = weeklies.adapter.id
    if (activities) provenance.activities = activities.adapter.id
    if (bests) provenance.dungeonBests = bests.adapter.id
    if (raids) provenance.raidProgress = raids.adapter.id
    if (gear) provenance.gear = gear.adapter.id
    if (renown) provenance.renown = renown.adapter.id
    if (bags) provenance.bags = bags.adapter.id

    const byIdentity = [...candidates].sort(
      (a, b) => (b.adapter.priority.identity ?? 0) - (a.adapter.priority.identity ?? 0) || b.record.updatedAt - a.record.updatedAt
    )

    const pickFrom = <T>(from: Candidate[], get: (r: SourceCharacter) => T | null | undefined): T | null => {
      for (const candidate of from) {
        const value = get(candidate.record)
        if (value !== null && value !== undefined) return value
      }
      return null
    }

    /** First non-null value across candidates, best identity source first. */
    const pick = <T>(get: (r: SourceCharacter) => T | null | undefined): T | null => pickFrom(byIdentity, get)
    const professions = pick((r) => (r.professions?.length ? r.professions : null)) ?? []

    /**
     * The same, but only from records written since the reset. A keystone does
     * not outlive the week it was earned in: everyone starts a new one without
     * a key until a run hands them the next. Last week's is not a smaller key,
     * it is no key at all, and offering it would send someone looking through
     * their bags for something that is not there.
     */
    const pickThisWeek = <T>(get: (r: SourceCharacter) => T | null | undefined): T | null =>
      pickFrom(
        byIdentity.filter((c) => c.record.updatedAt >= resetAt),
        get
      )

    // A vault source may only know some rows; fill the rest with empty ones.
    const vaultRows = fullVault(vault?.record.vault ?? [])
    // "Last seen" is the freshest sighting anywhere; this week's numbers are
    // only ever as current as the source they actually came from.
    const weeklyUpdatedAt = Math.max(
      0,
      ...[vault, runs, lockouts, bosses, weeklies, activities].filter((c): c is Candidate => c !== null).map((c) => c.record.updatedAt)
    )
    // A snapshot from before the reset that still shows filled slots is a
    // reward nobody has picked up: the client writes its own flag only once
    // someone logs in and sees the vault, which is the very moment the
    // reminder stops being worth anything.
    const rewardWaiting =
      (pick((r) => r.vaultRewardWaiting) ?? false) || (weeklyUpdatedAt < resetAt && vaultRows.some((row) => row.unlockedCount > 0))

    merged.push({
      key,
      name: base.name,
      realm: base.realm,
      realmSlug: base.realmSlug,
      region: pick((r) => r.region),
      className: pick((r) => r.className) ?? '',
      classToken: pick((r) => r.classToken),
      spec: pick((r) => r.spec),
      level: pick((r) => r.level) ?? 0,
      itemLevel: pick((r) => r.itemLevel),
      faction: pick((r) => r.faction),
      guild: pick((r) => r.guild),
      money: pick((r) => r.money),
      mythicRating: pick((r) => r.mythicRating),
      vaultRewardWaiting: rewardWaiting,
      playedTotal: pick((r) => r.playedTotal),
      playedLevel: pick((r) => r.playedLevel),
      keystone: pickThisWeek((r) => r.keystone),
      mythicRuns: runs
        ? enrichRuns(
            runs.record.mythicRuns ?? [],
            candidates.filter((c) => c !== runs).map((c) => c.record.mythicRuns ?? [])
          )
        : [],
      vault: vaultRows,
      lockouts: lockouts?.record.lockouts ?? [],
      worldBosses: bosses?.record.worldBosses ?? [],
      currencies: currencies?.record.currencies ?? [],
      weeklies: offeredThisWeek(
        forProfessions(overlayQuestLog(weeklies?.record.weeklies ?? [], candidates, resetAt), read.questRegistry, professions),
        read.questRegistry,
        resetAt
      ),
      activities: activities?.record.activities ?? [],
      dungeonBests: bests?.record.dungeonBests ?? [],
      raidProgress: raids?.record.raidProgress ?? [],
      gear: gear?.record.gear ?? [],
      renown: renown?.record.renown ?? [],
      xp: pick((r) => r.xp),
      zone: pick((r) => r.zone),
      lastActivity: pick((r) => r.lastActivity),
      auctions: pick((r) => r.auctions),
      mailCount: pick((r) => r.mailCount),
      // The client's own count first; the bag list counts the same slots.
      bagSpace: pick((r) => r.bagSpace) ?? (bags?.record.bags ? { free: bags.record.bags.free, total: bags.record.bags.slots } : null),
      bags: bags?.record.bags ?? null,
      bank: bags?.record.bank ?? [],
      professions,
      cooldowns: pick((r) => (r.cooldowns?.length ? r.cooldowns : null)) ?? [],
      // The freshest sighting across sources is what "last seen" means.
      updatedAt: Math.max(...candidates.map((c) => c.record.updatedAt)),
      weeklyUpdatedAt,
      stale: false,
      accountName: base.accountName,
      accounts: read.accountsByKey.get(key) ?? [base.accountName],
      sources: candidates
        .map((c) => ({
          id: c.adapter.id,
          labelKey: c.adapter.labelKey,
          updatedAt: c.record.updatedAt
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt),
      provenance
    })
  }

  // One character with the companion addon knows what every slot in the season
  // pays out, so the rest of the roster borrows those numbers rather than
  // showing a vault with no reward attached to it. The same goes for which
  // slots take an enchant: the roster's own habits say so.
  const maxLevel = Math.max(0, ...merged.map((character) => character.level))
  return applyEnchantSlots(applyRewards(merged, learnRewards(merged, resetAt)), learnEnchantSlots(merged, maxLevel))
}
