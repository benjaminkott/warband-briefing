/**
 * Adapter for the SavedInstances addon.
 *
 * Field names below were read off real `SavedInstances.lua` files (DBVersion 12):
 *
 *   SavedInstancesDB.Toons["Name - Realm Name"] = {
 *     Level, Class ("WARRIOR"), LClass ("Warrior"), Race, Faction, Order,
 *     IL / ILe (item level), MythicPlusScore, Money, LastSeen, Zone,
 *     PlayedTotal / PlayedLevel (seconds, from /played),
 *     WeeklyResetTime, DailyResetTime,
 *     MythicKey    = { mapID, level, ResetTime, link },
 *     MythicKeyBest= { threshold = {1,4,8}, ResetTime, rewardWaiting,
 *                      lastCompletedIndex, [1..3] = vault slot levels,
 *                      runHistory = { { level, name, mapChallengeModeID,
 *                                       completed, thisWeek, runScore,
 *                                       durationSec, completionDate } } },
 *     currency     = { [currencyId] = { amount, totalMax, weeklyMax, earnedThisWeek } },
 *     Progress     = { ["<activity-key>"] = { show, isComplete, isFinish,
 *                                             numFulfilled, numRequired, text },
 *                      ["<list-key>"]     = { show, [questId] = { show, isComplete, ... } },
 *                      ["great-vault-raid"]    = { [1..3] = difficultyId,  unlocked },
 *                      ["great-vault-dungeon"] = { [1..3] = keystoneLevel, unlocked },
 *                      ["great-vault-world"]   = { [1..3] = activityTier,  unlocked } },
 *     Quests       = { [questId] = { Title, isDaily, ... } },
 *     XP, MaxXP, RestXP, Zone, lastboss, lastbosstime,
 *   }
 *   SavedInstancesDB.Quests = { [questId] = { Title, Expires } }   -- account-wide weeklies
 *   SavedInstancesDB.Instances["Instance Name"] = {
 *     Raid = true, Expansion, LFDID, ...,
 *     ["Name - Realm Name"] = { [difficultyID] = { ID, Expires, Locked, Extended,
 *                                                  Link = "|Hinstancelock:<guid>:<instance>:<difficulty>:<killed bitmask>|h" } }
 *   }
 *
 * The other `Progress` entries are the addon's activity tracker: a zone weekly
 * at 40%, three of four hunts done. What each key stands for is not in the
 * file - see `progressCatalog.ts`, which reads it out of the addon's code.
 *
 * The Great Vault is read from the `great-vault-*` entries in `Progress`: one
 * value per unlocked slot, the client's own state, and it covers all three
 * rows. Where an entry is missing the row is derived instead - the raid row
 * from this week's boss kills, the dungeon row from `MythicKeyBest`. That
 * fallback only ever sees keystone runs, while the real dungeon row also counts
 * Heroic, Mythic and Timewalking dungeons, so a derived dungeon row can
 * undercount.
 *
 * Everything is read defensively: SavedInstances changes its schema between
 * expansions, and a missing field must degrade to "unknown", never to a crash.
 */

import { VAULT_THRESHOLDS, buildVaultRow } from '../../shared/vault'
import type {
  CurrencyAmount,
  InstanceLockout,
  LevelProgress,
  MythicRun,
  TaskProgress,
  VaultRow,
  WeeklyActivity,
  WeeklyQuestDef,
  WeeklyTask
} from '../../shared/types'
import { isTable, tBool, tGet, tNum, tNumOrNull, tStr, type LuaTable, type LuaValue } from '../lua'
import { catalogExpansion, readProgressCatalog, type ProgressCatalog, type ProgressEntry } from './progressCatalog'
import { characterKey, findInAccounts, parsedFile, slugifyRealm } from './shared'
import { fromPool, questIdsOf } from '../../shared/questPool'
import type { ReadOptions, SourceAccountData, SourceAdapter, SourceCharacter, SourceFile } from './types'
import { VaultCategory } from '../../shared/enums/vaultCategory'

const SAVED_VARIABLES_FILE = 'SavedInstances.lua'

/**
 * Raid difficulty id -> Great Vault reward tier (1 = LFR ... 4 = Mythic).
 * Only modern raid difficulties are listed; anything else is ignored so that
 * legacy content cannot inflate the derived vault row.
 */
const RAID_VAULT_TIER: Record<number, number> = {
  7: 1,
  17: 1,
  3: 2,
  4: 2,
  14: 2,
  5: 3,
  6: 3,
  15: 3,
  9: 4,
  16: 4
}

/** Splits SavedInstances' "Name - Realm Name" toon key. */
function splitToonKey(toonKey: string): { name: string; realm: string } | null {
  const index = toonKey.lastIndexOf(' - ')
  if (index <= 0) return null
  const name = toonKey.slice(0, index).trim()
  const realm = toonKey.slice(index + 3).trim()
  if (!name || !realm) return null
  return { name, realm }
}

function readCurrencies(toon: LuaValue, options: ReadOptions): CurrencyAmount[] {
  const names = options.currencyNames
  const currency = tGet(toon, 'currency')
  if (!isTable(currency)) return []

  const out: CurrencyAmount[] = []
  for (const [idText, value] of Object.entries(currency.map)) {
    const id = Number(idText)
    if (!Number.isInteger(id) || !isTable(value)) continue
    const quantity = tNum(value, 'amount')
    if (quantity <= 0) continue
    out.push({
      id,
      // SavedInstances stores ids only. An empty name means "unknown"; the UI
      // renders a localized placeholder rather than freezing one into the data.
      name: names[id] ?? '',
      quantity,
      max: tNumOrNull(value, 'totalMax'),
      earnedThisWeek: tNumOrNull(value, 'earnedThisWeek'),
      weeklyMax: tNumOrNull(value, 'weeklyMax')
    })
  }
  return out.sort((a, b) => options.translator.compare(a.name, b.name))
}

/**
 * SavedInstances keeps every weekly value until the character logs in again, so
 * a stored reset stamp that has already passed means the whole weekly block
 * describes a previous week. Absent stamps are treated as current; the
 * character-level staleness check still covers those.
 */
function weeklyDataIsCurrent(toon: LuaValue, now: number): boolean {
  const weeklyReset = tNum(toon, 'WeeklyResetTime') * 1000
  return !(weeklyReset > 0 && weeklyReset <= now)
}

/**
 * Whether the client left a Great Vault reward uncollected. SavedInstances
 * stores `rewardWaiting` per vault row, and unlike the rest of the weekly data
 * it stays true across the reset - which is the whole point: the reward is
 * still in there until someone logs in and takes it.
 */
function vaultRewardWaiting(toon: LuaValue): boolean {
  const waiting = (value: LuaValue | undefined): boolean => isTable(value) && value.map['rewardWaiting'] === true

  const progress = tGet(toon, 'Progress')
  if (isTable(progress)) {
    for (const key of ['great-vault-raid', 'great-vault-dungeon', 'great-vault-world']) {
      if (waiting(progress.map[key])) return true
    }
  }
  return waiting(tGet(toon, 'MythicKeyBest'))
}

/** `MythicKeyBest` as stored, whatever week it describes. */
function mythicKeyBest(toon: LuaValue): LuaTable | null {
  const best = tGet(toon, 'MythicKeyBest')
  return isTable(best) ? best : null
}

/**
 * Whether that record is this week's. The run list is only true of the week it
 * was recorded in, while the vault row it also feeds outlives the reset.
 */
function mythicKeyBestIsCurrent(best: LuaTable, toon: LuaValue, now: number): boolean {
  // This one carries its own stamp, which is more precise than the toon's.
  const resetTime = tNum(best, 'ResetTime') * 1000
  if (resetTime > 0) return resetTime > now
  return weeklyDataIsCurrent(toon, now)
}

/**
 * When a run finished. The addon stores the client's calendar table - local
 * time, month 1-12 - rather than a timestamp, so it is put back together here.
 */
function completionTime(run: LuaTable): number | null {
  const date = tGet(run, 'completionDate')
  if (!isTable(date)) return null
  const year = tNum(date, 'year')
  const month = tNum(date, 'month')
  const day = tNum(date, 'monthDay')
  if (year <= 0 || month <= 0 || day <= 0) return null
  return new Date(year, month - 1, day, tNum(date, 'hour'), tNum(date, 'minute')).getTime()
}

/** This week's Mythic+ runs, newest first as SavedInstances records them. */
function readRuns(best: LuaTable | null): MythicRun[] {
  if (!best) return []
  const history = tGet(best, 'runHistory')
  if (!isTable(history)) return []

  const entries = history.array.length > 0 ? history.array : Object.values(history.map)
  return entries
    .filter(isTable)
    .filter((run) => tBool(run, 'thisWeek', true))
    .map((run) => ({
      dungeon: tStr(run, 'name'),
      mapChallengeModeId: tNum(run, 'mapChallengeModeID'),
      level: tNum(run, 'level'),
      // In run history `completed` means the timer was beaten; every finished
      // run counts towards the vault either way.
      completed: tBool(run, 'completed'),
      durationSec: tNumOrNull(run, 'durationSec'),
      score: tNumOrNull(run, 'runScore'),
      completedAt: completionTime(run)
    }))
    .filter((run) => run.level > 0)
    .sort((a, b) => b.level - a.level)
}

/**
 * Rebuilds the dungeon vault row from `MythicKeyBest`.
 * The array part holds the level the client reports per slot; when it is
 * missing the same numbers fall out of sorting this week's runs. Either way
 * this only knows about keystone runs, so it is the fallback for clients whose
 * `Progress` carries no `great-vault-dungeon` entry.
 */
function deriveDungeonVault(best: LuaTable | null, runs: MythicRun[]): VaultRow | null {
  if (!best) return null

  const thresholds = tGet(best, 'threshold')
  const thresholdList = isTable(thresholds) ? thresholds.array.filter((v): v is number => typeof v === 'number') : [1, 4, 8]

  const reported = best.array.filter((v): v is number => typeof v === 'number')
  const runLevels = runs.map((r) => r.level).sort((a, b) => b - a)
  if (reported.length === 0 && runLevels.length === 0) return null

  const slots = thresholdList.map((threshold, index) => {
    // Prefer what the client reported; fall back to the n-th best run.
    const level = reported[index] ?? (runLevels.length >= threshold ? runLevels[threshold - 1] : 0)
    return {
      threshold,
      progress: Math.min(Math.max(runLevels.length, reported.length > index ? threshold : 0), threshold),
      level,
      rewardItemLevel: null,
      unlocked: level > 0
    }
  })

  // Only a row rebuilt from the run list is "derived"; the reported array is
  // the client's own per-slot value.
  return reported.length > 0
    ? buildVaultRow(VaultCategory.Dungeon, slots)
    : { ...buildVaultRow(VaultCategory.Dungeon, slots), derived: true }
}

/**
 * One quest's objective store, as the addon's tracker writes it: `show` while
 * the quest is on the log or done, then the first unfinished objective's
 * numbers and the client's own summary text.
 */
interface QuestStore {
  done: boolean
  ready: boolean
  progress: TaskProgress | null
}

function readQuestStore(store: LuaValue | undefined): QuestStore | null {
  if (!isTable(store) || store.map['show'] !== true) return null
  const done = store.map['isComplete'] === true
  const fulfilled = tNumOrNull(store, 'numFulfilled')
  const required = tNumOrNull(store, 'numRequired')
  const text = tStr(store, 'text')
  return {
    done,
    ready: !done && store.map['isFinish'] === true,
    progress:
      !done && required !== null && required > 0
        ? {
            fulfilled: fulfilled ?? 0,
            required,
            text: text || `${fulfilled ?? 0}/${required}`
          }
        : null
  }
}

/**
 * Where a configured quest stands, read off the tracker. A quest of its own
 * has its own store; one that is part of a list has a store under the list.
 * A quest in an "any" group cannot be told apart from its siblings - the group
 * keeps one store for whichever of them it found first - so it stays unread.
 */
function questProgress(progress: LuaValue | undefined, catalog: ProgressCatalog, questId: number): QuestStore | null {
  if (!isTable(progress)) return null
  for (const entry of catalog.values()) {
    if (!entry.questIds.includes(questId)) continue
    const store = progress.map[entry.key]
    if (entry.type === 'single') return readQuestStore(store)
    if (entry.type === 'list' && isTable(store)) return readQuestStore(store.map[String(questId)])
  }
  return null
}

function readWeeklies(toon: LuaValue, options: ReadOptions, catalog: ProgressCatalog, now: number): WeeklyTask[] | undefined {
  if (options.weeklyQuests.length === 0) return undefined
  // Completed-quest records go stale with everything else.
  if (!weeklyDataIsCurrent(toon, now)) return undefined
  // `Quests` is the only completion record. The quest ids under a `Progress`
  // group are the campaign's steps with a `show` flag each - tracked, not done -
  // so reading them as completions marks quests off that nobody has turned in.
  const quests = tGet(toon, 'Quests')
  if (!isTable(quests)) return undefined

  const done = new Set<number>()
  for (const [id, entry] of Object.entries(quests.map)) {
    const numeric = Number(id)
    if (!Number.isInteger(numeric)) continue
    // Entries survive their reset until the character logs in again.
    const expires = isTable(entry) ? tNum(entry, 'Expires') * 1000 : 0
    if (expires > 0 && expires <= now) continue
    done.add(numeric)
  }

  const progress = tGet(toon, 'Progress')
  // A pool's line is whichever of its quests the week offers: the one this
  // character finished, or the one the tracker follows.
  return options.weeklyQuests.map((def) => {
    const finished = fromPool(def, (id) => (done.has(id) ? id : undefined))
    const store = fromPool(def, (id) => questProgress(progress, catalog, id) ?? undefined)
    return {
      id: def.id,
      // The client wrote the title in its own language; the configured label is
      // only a fallback for a quest nobody has completed yet.
      label: (finished !== undefined ? titleOf(quests, finished) : null) ?? def.label,
      ...(def.pool ? { pool: def.pool } : {}),
      done: finished !== undefined || store?.done === true,
      ready: store?.ready ?? false,
      progress: store?.progress ?? null
    }
  })
}

/**
 * The tracker's weekly activities for this character: the current expansion's
 * and the evergreen ones, each with its objectives. What the user already
 * watches by quest id is left out - it has a chip of its own, and a group
 * holding one of those quests keeps a store that may describe a sibling.
 */
function readActivities(toon: LuaValue, catalog: ProgressCatalog, configured: Set<number>, now: number): WeeklyActivity[] {
  if (catalog.size === 0 || !weeklyDataIsCurrent(toon, now)) return []
  const progress = tGet(toon, 'Progress')
  if (!isTable(progress)) return []
  const expansion = catalogExpansion(catalog)

  const out: WeeklyActivity[] = []
  for (const entry of catalog.values()) {
    if (entry.reset !== 'weekly' || entry.type === 'custom') continue
    if (entry.expansion !== null && entry.expansion !== expansion) continue
    if (entry.questIds.some((id) => configured.has(id))) continue
    const store = progress.map[entry.key]
    if (!isTable(store) || store.map['show'] !== true) continue

    const activity = entry.type === 'list' ? readList(entry, store) : readQuestStore(store)
    if (!activity) continue
    out.push({
      key: entry.key,
      label: entry.name,
      done: activity.done,
      ready: activity.ready,
      progress: activity.progress,
      questIds: entry.questIds
    })
  }
  return out
}

/** A list counts its quests done against a threshold - "2/4 hunts". */
function readList(entry: ProgressEntry, store: LuaTable): QuestStore | null {
  let completed = 0
  for (const id of entry.questIds) {
    const quest = store.map[String(id)]
    if (isTable(quest) && quest.map['isComplete'] === true) completed++
  }
  const required = entry.threshold ?? entry.questIds.length
  if (required <= 0) return null
  const done = completed >= required
  return {
    done,
    ready: false,
    progress: done ? null : { fulfilled: completed, required, text: `${completed}/${required}` }
  }
}

/** Experience towards the next level; absent at the cap, where the addon stops writing it. */
function readXp(toon: LuaValue): LevelProgress | null {
  const xp = tNumOrNull(toon, 'XP')
  const xpMax = tNum(toon, 'MaxXP')
  if (xp === null || xpMax <= 0) return null
  return { xp, xpMax, rested: tNum(toon, 'RestXP') }
}

/** The last boss the character killed, kept as the addon writes it: "Name: Difficulty". */
function readLastActivity(toon: LuaValue): { name: string; at: number } | null {
  const name = tStr(toon, 'lastboss') || tStr(toon, 'lastbossyell')
  const at = tNum(toon, 'lastbosstime') * 1000
  if (!name || at <= 0) return null
  return { name, at }
}

/**
 * Weekly quests that complete once for the whole account. The addon keeps
 * them at the top of the file, beside no character, with the same expiry the
 * per-character ones carry.
 */
function readAccountQuests(db: LuaValue, now: number): WeeklyQuestDef[] {
  const quests = tGet(db, 'Quests')
  if (!isTable(quests)) return []
  const out: WeeklyQuestDef[] = []
  for (const [id, entry] of Object.entries(quests.map)) {
    const numeric = Number(id)
    if (!Number.isInteger(numeric) || !isTable(entry)) continue
    if (tGet(entry, 'isDaily') === true) continue
    const expires = tNum(entry, 'Expires') * 1000
    if (expires > 0 && expires <= now) continue
    const title = tStr(entry, 'Title')
    if (title) out.push({ id: numeric, label: title })
  }
  return out
}

/** The title the client stored for a quest, if this character completed it. */
function titleOf(quests: LuaValue, id: number): string | null {
  const entry = tGet(quests, String(id))
  if (!isTable(entry)) return null
  const title = tStr(entry, 'Title')
  return title.length > 0 ? title : null
}

/**
 * Every weekly quest this character finished this week, whether the user
 * watches it or not.
 *
 * This is where the settings screen's suggestions come from: the ids of the
 * current season, with the titles the client itself uses, without anyone having
 * to look them up. Dailies are left out - they reset before the week does,
 * and so is a loot tracker: SavedInstances keeps an item's weekly drop as a
 * quest whose title is the item's link, which is no quest a player names.
 */
function readSeenWeeklies(toon: LuaValue, now: number): WeeklyQuestDef[] {
  const quests = tGet(toon, 'Quests')
  if (!isTable(quests)) return []

  const out: WeeklyQuestDef[] = []
  for (const [id, entry] of Object.entries(quests.map)) {
    const numeric = Number(id)
    if (!Number.isInteger(numeric) || !isTable(entry)) continue
    if (tGet(entry, 'isDaily') === true) continue
    // An entry that has already expired describes a week that is over.
    const expires = tNum(entry, 'Expires') * 1000
    if (expires <= now) continue
    const title = tStr(entry, 'Title')
    if (title.length === 0 || isLink(title)) continue
    out.push({ id: numeric, label: title })
  }
  return out
}

/** True for the client's link markup (`|Hitem:…|h[…]|h`) in a text. */
function isLink(text: string): boolean {
  return text.includes('|H')
}

/** Highest expansion id any instance is tagged with - i.e. the current one. */
function currentExpansion(db: LuaValue): number {
  const instances = tGet(db, 'Instances')
  if (!isTable(instances)) return 0
  let max = 0
  for (const instance of Object.values(instances.map)) {
    if (!isTable(instance)) continue
    max = Math.max(max, tNum(instance, 'Expansion'))
  }
  return max
}

/** Whether a table under an instance looks like one saved lockout. */
function isLockoutEntry(value: LuaValue | undefined): value is LuaTable {
  if (!isTable(value)) return false
  return 'Expires' in value.map || 'Locked' in value.map || 'ID' in value.map
}

/**
 * Yields every saved lockout of one instance as (character, difficulty, entry).
 *
 * SavedInstances nests these character-major - `Instances[name][toon][diff]` -
 * while older files used to be difficulty-major. Both shapes are walked, told
 * apart by whether the first key is a difficulty id or a "Name - Realm" key,
 * so the instance's own fields (Raid, Expansion, ...) are stepped over either
 * way.
 */
function* lockoutEntries(instance: LuaTable): Generator<{ toonKey: string; difficultyId: number; entry: LuaTable }> {
  for (const [key, child] of Object.entries(instance.map)) {
    if (!isTable(child)) continue

    const asDifficulty = Number(key)
    if (Number.isInteger(asDifficulty)) {
      for (const [toonKey, entry] of Object.entries(child.map)) {
        if (isLockoutEntry(entry)) yield { toonKey, difficultyId: asDifficulty, entry }
      }
      continue
    }

    for (const [difficultyText, entry] of Object.entries(child.map)) {
      const difficultyId = Number(difficultyText)
      if (Number.isInteger(difficultyId) && isLockoutEntry(entry)) {
        yield { toonKey: key, difficultyId, entry }
      }
    }
  }
}

/**
 * Boss kills of one lockout. Current files no longer store a flag per boss;
 * what is left is Blizzard's own instance-lock link, whose last field is a
 * bitmask of the defeated encounters:
 *
 *   |Hinstancelock:<player guid>:<instance id>:<difficulty id>:<bitmask>|h
 *
 * The mask says which bosses are down but not how many the instance has, so
 * the total stays unknown (0) unless the entry spells it out.
 */
function readKills(entry: LuaTable): { defeated: number; total: number } {
  // Encounter results used to sit in the array part / numeric keys as booleans.
  const encounters = [
    ...entry.array,
    ...Object.entries(entry.map)
      .filter(([k]) => /^\d+$/.test(k))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, v]) => v)
  ]
  const killed = encounters.filter((v) => v === true || (isTable(v) && tBool(v, 'killed'))).length

  let fromLink = 0
  const mask = Number(/Hinstancelock:[^:]*:\d+:\d+:(\d+)/i.exec(tStr(entry, 'Link'))?.[1])
  if (Number.isInteger(mask) && mask > 0) {
    for (let bits = mask; bits > 0; bits >>>= 1) fromLink += bits & 1
  }

  return {
    defeated: tNumOrNull(entry, 'Killed') ?? (killed > 0 ? killed : fromLink),
    total: tNumOrNull(entry, 'Total') ?? encounters.length
  }
}

/**
 * Walks `Instances` once and collects every lockout, grouped by character.
 * The table is instance-major, so this is far cheaper than scanning per toon.
 *
 * `vaultKills` collects the reward tier of every current-expansion raid boss
 * killed this week, which is what the Great Vault's raid row is built from.
 */
function readLockoutsByToon(
  db: LuaValue,
  now: number,
  options: ReadOptions
): { byToon: Map<string, InstanceLockout[]>; vaultKills: Map<string, number[]> } {
  const byToon = new Map<string, InstanceLockout[]>()
  const vaultKills = new Map<string, number[]>()
  const instances = tGet(db, 'Instances')
  if (!isTable(instances)) return { byToon, vaultKills }

  const expansion = currentExpansion(db)

  for (const [instanceName, instance] of Object.entries(instances.map)) {
    if (!isTable(instance)) continue
    const isRaid = tBool(instance, 'Raid')
    const isCurrent = tNum(instance, 'Expansion') === expansion

    for (const { toonKey, difficultyId, entry } of lockoutEntries(instance)) {
      const expires = tNum(entry, 'Expires') * 1000
      // Expired lockouts linger in the file until the addon prunes them.
      if (expires > 0 && expires <= now) continue
      if (!tBool(entry, 'Locked', true) && !tBool(entry, 'Extended')) continue

      const kills = readKills(entry)
      const lockout: InstanceLockout = {
        name: instanceName,
        difficultyId,
        // The id carries the meaning; the UI turns it into a localized label.
        difficulty: '',
        isRaid,
        maxPlayers: null,
        defeated: kills.defeated,
        total: kills.total,
        bosses: [],
        resetsAt: expires || null
      }

      const list = byToon.get(toonKey) ?? []
      list.push(lockout)
      byToon.set(toonKey, list)

      // Only the current raid tier feeds the vault; older raids do not.
      const tier = RAID_VAULT_TIER[difficultyId]
      if (isRaid && isCurrent && tier && lockout.defeated > 0) {
        const tiers = vaultKills.get(toonKey) ?? []
        for (let i = 0; i < lockout.defeated; i++) tiers.push(tier)
        vaultKills.set(toonKey, tiers)
      }
    }
  }

  for (const list of byToon.values()) {
    list.sort((a, b) => Number(b.isRaid) - Number(a.isRaid) || b.defeated - a.defeated || options.translator.compare(a.name, b.name))
  }
  return { byToon, vaultKills }
}

/**
 * Great Vault row straight from `Progress`: the array holds one entry per
 * unlocked slot - a difficulty id for the raid row, a keystone level for the
 * dungeon row, an activity tier for the world row.
 *
 * Unlike the rest of the weekly data these rows are deliberately read whatever
 * week they belong to: the vault holds what was earned until the following
 * reset, so after the reset they are the reward still waiting to be picked up.
 * How old they are is on the record's own timestamp; the merger and the
 * staleness check downstream decide what to make of that.
 */
function readVaultRowFromProgress(toon: LuaValue, key: string, category: VaultCategory): VaultRow | null {
  const progress = tGet(toon, 'Progress')
  if (!isTable(progress)) return null
  const entry = progress.map[key]
  if (!isTable(entry)) return null

  const values = entry.array.filter((v): v is number => typeof v === 'number')
  const slots = VAULT_THRESHOLDS[category].map((threshold, index) => {
    const value = values[index] ?? 0
    return {
      threshold,
      progress: value > 0 ? threshold : Math.min(values.length, threshold),
      level: value,
      // The raid row's numbers are difficulty ids, not levels.
      difficultyId: category === VaultCategory.Raid && value > 0 ? value : null,
      rewardItemLevel: null,
      unlocked: value > 0
    }
  })

  return buildVaultRow(category, slots)
}

/**
 * Fallback raid row for clients whose `Progress` has no `great-vault-raid`:
 * the slots unlock at 2/4/6 boss kills and each rewards at the difficulty of
 * the n-th best kill.
 */
function deriveRaidVault(kills: number[]): VaultRow | null {
  if (kills.length === 0) return null
  const sorted = [...kills].sort((a, b) => b - a)
  const slots = VAULT_THRESHOLDS.raid.map((threshold) => {
    const unlocked = sorted.length >= threshold
    return {
      threshold,
      progress: Math.min(sorted.length, threshold),
      // Tiers here, not difficulty ids - the UI labels them positionally.
      level: unlocked ? sorted[threshold - 1] : 0,
      difficultyId: null,
      rewardItemLevel: null,
      unlocked
    }
  })
  return { ...buildVaultRow(VaultCategory.Raid, slots), derived: true }
}

/**
 * The dungeon out of a keystone link, whose bracket text reads
 * "Keystone: Kings' Rest (12)" - localized, so only the shape is relied on:
 * everything up to the first colon is the item's own name, the trailing
 * parenthesis repeats the level the UI already shows.
 */
function keystoneName(link: string): string {
  const label = link.match(/\[(.+?)\]/)?.[1] ?? ''
  return label
    .replace(/^[^:]*:\s*/, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
}

export const savedInstancesAdapter: SourceAdapter = {
  id: 'savedinstances',
  labelKey: 'source.savedinstances.label',
  descriptionKey: 'source.savedinstances.description',
  areas: ['identity', 'runs', 'lockouts', 'currencies', 'weeklies', 'activities', 'vault'],
  priority: {
    identity: 50,
    vault: 50,
    runs: 50,
    lockouts: 50,
    currencies: 40,
    weeklies: 40,
    activities: 50
  },
  addonFolder: 'SavedInstances',
  fileNames: [SAVED_VARIABLES_FILE],

  findFiles: (wowPath) => findInAccounts(wowPath, SAVED_VARIABLES_FILE),

  async read(file: SourceFile, options: ReadOptions): Promise<SourceCharacter[]> {
    const db = (await parsedFile(file))['SavedInstancesDB']
    const toons = tGet(db, 'Toons')
    if (!isTable(toons)) return []

    const now = Date.now()
    const { byToon: lockoutsByToon, vaultKills } = readLockoutsByToon(db, now, options)
    const catalog = await readProgressCatalog(options.wowPath)
    const configured = new Set(options.weeklyQuests.flatMap((quest) => questIdsOf(quest)))

    const out: SourceCharacter[] = []
    for (const [toonKey, toon] of Object.entries(toons.map)) {
      if (!isTable(toon)) continue
      const split = splitToonKey(toonKey)
      if (!split) continue

      const realmSlug = slugifyRealm(split.realm)
      const keystoneMap = tGet(toon, 'MythicKey')
      const keystoneLevel = isTable(keystoneMap) ? tNum(keystoneMap, 'level') : 0
      const best = mythicKeyBest(toon)
      // Last week's runs are not this week's; its vault row still is one.
      const runs = best && mythicKeyBestIsCurrent(best, toon, now) ? readRuns(best) : []
      // The client's own vault state beats anything reconstructed from lockouts.
      const raidVault =
        readVaultRowFromProgress(toon, 'great-vault-raid', VaultCategory.Raid) ?? deriveRaidVault(vaultKills.get(toonKey) ?? [])
      const dungeonVault = readVaultRowFromProgress(toon, 'great-vault-dungeon', VaultCategory.Dungeon) ?? deriveDungeonVault(best, runs)
      const worldVault = readVaultRowFromProgress(toon, 'great-vault-world', VaultCategory.World)
      // The order the Great Vault itself lists the rows in.
      const vault = [raidVault, dungeonVault, worldVault].filter((row): row is VaultRow => row !== null)

      out.push({
        key: characterKey(split.name, realmSlug),
        name: split.name,
        realm: split.realm,
        realmSlug,
        className: tStr(toon, 'LClass') || tStr(toon, 'Class') || null,
        classToken: tStr(toon, 'Class') || null,
        level: tNumOrNull(toon, 'Level'),
        // ILe is the equipped level; IL includes bags.
        itemLevel: tNumOrNull(toon, 'ILe') ?? tNumOrNull(toon, 'IL'),
        faction: tStr(toon, 'Faction') || null,
        money: tNumOrNull(toon, 'Money'),
        mythicRating: tNumOrNull(toon, 'MythicPlusScore'),
        // Seconds, as /played reports them; only written when the character logs in.
        vaultRewardWaiting: vaultRewardWaiting(toon),
        playedTotal: tNumOrNull(toon, 'PlayedTotal'),
        playedLevel: tNumOrNull(toon, 'PlayedLevel'),
        keystone:
          keystoneLevel > 0
            ? {
                // Empty when the link carries no readable name; the UI localizes.
                name: keystoneName(tStr(keystoneMap, 'link')),
                level: keystoneLevel
              }
            : null,
        vault,
        mythicRuns: runs,
        lockouts: lockoutsByToon.get(toonKey) ?? [],
        currencies: readCurrencies(toon, options),
        weeklies: readWeeklies(toon, options, catalog, now),
        activities: readActivities(toon, catalog, configured, now),
        seenWeeklies: readSeenWeeklies(toon, now),
        xp: readXp(toon),
        zone: tStr(toon, 'Zone') || null,
        lastActivity: readLastActivity(toon),
        updatedAt: tNum(toon, 'LastSeen') * 1000,
        accountName: file.accountName
      })
    }
    return out
  },

  async readAccount(file: SourceFile): Promise<SourceAccountData> {
    const db = (await parsedFile(file))['SavedInstancesDB']
    return { accountQuests: readAccountQuests(db, Date.now()) }
  }
}
