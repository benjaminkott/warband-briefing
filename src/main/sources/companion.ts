/**
 * Adapter for the companion addon, the one source this project ships
 * itself. Everything else the app reads is an addon people already have; this
 * one exists because two things simply are not in any of them:
 *
 *   * what is actually in the Great Vault. The client only knows once it has
 *     asked the server, which is why no community addon records it - the
 *     companion asks at login and writes the reward item level and name per
 *     slot.
 *   * the weekly reset the realm runs on, straight from the client, so the app
 *     does not have to derive it from a timezone rule.
 *   * the season's best run per dungeon, the worn gear with its sockets and
 *     upgrade track, and the renown per faction - all of it client state no
 *     community addon writes down.
 *
 * Layout of `WarbandBriefing.lua`, as the addon writes it:
 *
 *   WarbandBriefingDB = {
 *     version = 11,
 *     events  = { list = { { title, startsAt, endsAt }, ... }, updatedAt },
 *     season  = { dungeons = { { mapId, name }, ... }, updatedAt },  -- the season's map table, run or not
 *     warbandBank = { tabs = { { name, slots, free, items = { { id, count, quality, link, ilvl? }, ... } }, ... }, updatedAt },
 *     warbandGold = { money, updatedAt },  -- copper, at every save
 *     guilds = { ["Guild-realm-slug"] = { name, realm, money, updatedAt } },  -- each guild bank at its last visit
 *     chars = {
 *       ["Name-realm-slug"] = {
 *         name, realm, realmSlug, region ("EU"), guid ("Player-1405-0992F5F0"), class ("MAGE"),
 *         classLocalized, spec, level, faction, guild, ilvl, money,
 *         updatedAt, nextResetAt,           -- both epoch seconds
 *         vaultRewardWaiting = false,
 *         vault = { raid | mythicPlus | world = { { threshold, progress,
 *                   level, unlocked, index, rewardIlvl, rewardItem }, ... } },
 *         runs      = { { mapId, name, level, completed, score, completedAt }, ... },
 *         dungeonBests = { { mapId, name, level, inTime, score, durationSec }, ... },
 *         raidProgress = { { id, name, bosses = { { id, name, kills = { ["difficultyId"] = count } }, ... } }, ... },
 *         raidKills = { ["encounterId"] = { ["difficultyId"] = count } },  -- the tally, the fallback for the statistics
 *         raidProgressNote,  -- which source the kills came from, for a look at the file
 *         errors = { ["collector"] = message },  -- a collector that failed on the last save
 *         gear      = { { slot, itemId, name, ilvl, enchantId, sockets, gems,
 *                        track, quality, link }, ... },
 *         renown    = { { factionId, name, level, current, max, maxed, paragon? }, ... },
 *         reputations = { { factionId, name, level, maxLevel, current, max, maxed, paragon? }, ... },
 *         xp        = { xp, xpMax, rested } | nil,
 *         bagSpace  = { free, total },
 *         bags      = { slots, free, items = { { id, count, quality, link, ilvl? }, ... } },  -- stacks summed, the reagent bag's items in
 *         bank      = { tabs = as the warband bank's, updatedAt },  -- as of the last visit
 *         auctions  = { count, nextExpiresAt, updatedAt },  -- at the last visit to the auction house
 *         mail      = { count, updatedAt },  -- the inbox at the last visit to the mailbox
 *         professions = { { name, skillLineId, skill, maxSkill,
 *                          concentration, concentrationMax, knowledge }, ... },
 *         cooldowns = { ["recipeId"] = { name, readyAt, charges, maxCharges, seenAt }, ... },
 *         zone,
 *         lockouts  = { { name, difficulty, difficultyId, isRaid, maxPlayers,
 *                        defeated, total, bosses, encounters = { { name, killed } }, resetsAt }, ... },
 *         worldBosses = { { name, defeated }, ... },
 *         questLog  = { { id, title, ready, fulfilled, required, frequency }, ... },
 *         questsDone = { ["questId"] = { title, at, frequency }, ... },  -- turn-ins since the reset
 *         questsFlagged = { ["questId"] = true, ... },  -- registered quests the client flags completed
 *         questsFlaggedOnAccount = { ["questId"] = true, ... },  -- ... completed on the account: paid once for the warband
 *         flaggedWeek,
 *         currencies  = { { id, name, quantity, max, earnedThisWeek,
 *                          weeklyMax }, ... },
 *         keystoneName, keystoneLevel, keystoneMapId, mythicRating,
 *       },
 *     },
 *     expansion,   -- the one the client is on
 *     quests = {   -- every quest any character had on its log; outlives the reset
 *       ["questId"] = { title, frequency, classification, expansion, tradeskill,
 *                       account, resets, seenAt, doneAt },
 *     },
 *     icons = {    -- the icon's file id by id, for everything any character had in view
 *       items = { ["itemId"] = fileId }, currencies = { ... }, recipes = { ... }, professions = { ... },
 *       classes = { ["itemId"] = classId * 100 + subclassId },  -- what an item is
 *     },
 *     tooltips = { -- the client's tooltip by item id, for every item in a bag, a bank tab or a worn slot
 *       items = { ["itemId"] = { { l, r?, lc?, rc? }, ... } },  -- left and right text, colours as hex where not white
 *     },
 *   }
 *
 * It only ever knows characters played since it was installed, so it outranks
 * the community addons per area but never replaces them: the merger falls back
 * to SavedInstances for everyone the companion has not seen yet.
 */

import { WEEK_MS } from '../../shared/time'
import type {
  AuctionSummary,
  BagItem,
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
  TooltipLine,
  VaultRow,
  WeeklyQuestDef,
  WeeklyTask,
  WeeklyEvents,
  WorldBossLockout
} from '../../shared/types'
import { seasonCatalog } from '../../shared/seasonCatalog'
import type { QuestRegistry, RegisteredQuest } from '../../shared/questRegistry'
import { fromPool, questIdsOf } from '../../shared/questPool'
import { characterIdOf, emptyLexicon, type Lexicon } from '../../shared/lexicon'
import { LexiconKind } from '../../shared/enums/lexiconKind'
import { wowheadItemParams } from '../../shared/wowhead'
import { buildVaultRow } from '../../shared/vault'
import { isTable, tBool, tGet, tList, tNum, tNumOrNull, tStr } from '../lua'
import type { LuaTable, LuaValue } from '../lua'
import { characterKey, cleanItemName, craftTierOf, findInAccounts, parseItemLink, parsedFile, slugifyRealm, stripMarkup } from './shared'
import type { ReadOptions, SourceAccountData, SourceAdapter, SourceCharacter, SourceFile } from './types'
import { Region } from '../../shared/enums/region'
import { VaultCategory } from '../../shared/enums/vaultCategory'
import { RenownKind } from '../../shared/enums/renownKind'
import { QuestReset } from '../../shared/enums/questReset'

const SAVED_VARIABLES_FILE = 'WarbandBriefing.lua'
/**
 * The file and the global from before the app was renamed. An account that
 * has no current file yet is read from the old one, so the roster does not
 * go blank between the app update and the first login with the new addon.
 */
const LEGACY_SAVED_VARIABLES_FILE = 'WowTodo.lua'
const DB_GLOBALS = ['WarbandBriefingDB', 'WowTodoDB']
/** The client's frequency for a weekly quest (Enum.QuestFrequency.Weekly). */
const WEEKLY_FREQUENCY = 2

/** The addon's table from the file, under its current or its old name. */
async function companionDb(file: SourceFile): Promise<LuaValue | undefined> {
  const globals = await parsedFile(file)
  for (const name of DB_GLOBALS) if (globals[name] !== undefined) return globals[name]
  return undefined
}

/** The current file of each account; the old file where an account has no current one. */
async function findCompanionFiles(wowPath: string): Promise<SourceFile[]> {
  const current = await findInAccounts(wowPath, SAVED_VARIABLES_FILE)
  const seen = new Set(current.map((file) => file.accountName))
  const legacy = await findInAccounts(wowPath, LEGACY_SAVED_VARIABLES_FILE)
  return [...current, ...legacy.filter((file) => !seen.has(file.accountName))]
}

/** The addon's own row names; `mythicPlus` is what the client calls the dungeon row. */
const ROW_CATEGORIES: Array<[string, VaultCategory]> = [
  ['raid', VaultCategory.Raid],
  ['mythicPlus', VaultCategory.Dungeon],
  ['world', VaultCategory.World]
]

const REGIONS: Region[] = [Region.Eu, Region.Us, Region.Kr, Region.Tw]

function readRegion(entry: LuaValue): Region | null {
  const region = tStr(entry, 'region').toLowerCase()
  return (REGIONS as string[]).includes(region) ? (region as Region) : null
}

/**
 * One vault row. The client reports every slot it knows, so nothing here is
 * reconstructed - the row is never marked `derived`.
 */
function readVaultRow(rows: LuaValue | undefined, category: VaultCategory): VaultRow | null {
  if (!isTable(rows)) return null
  const slots = rows.array.filter(isTable)
  if (slots.length === 0) return null

  return buildVaultRow(
    category,
    slots.map((slot) => {
      const level = tNum(slot, 'level')
      return {
        threshold: tNum(slot, 'threshold'),
        progress: tNum(slot, 'progress'),
        level,
        // The raid row's number is a difficulty id, not a level - same as the
        // client's own activity record.
        difficultyId: category === VaultCategory.Raid && level > 0 ? level : null,
        rewardItemLevel: tNumOrNull(slot, 'rewardIlvl'),
        rewardItem: tStr(slot, 'rewardItem') || null,
        unlocked: tBool(slot, 'unlocked')
      }
    })
  )
}

function readVault(entry: LuaValue): VaultRow[] {
  const vault = tGet(entry, 'vault')
  if (!isTable(vault)) return []
  const out: VaultRow[] = []
  for (const [key, category] of ROW_CATEGORIES) {
    const row = readVaultRow(vault.map[key], category)
    if (row) out.push(row)
  }
  return out
}

function readRuns(entry: LuaValue, options: ReadOptions): MythicRun[] {
  const runs = tGet(entry, 'runs')
  if (!isTable(runs)) return []

  return runs.array
    .filter(isTable)
    .map((run) => ({
      dungeon: tStr(run, 'name') || options.translator.t('keystone.generic'),
      mapChallengeModeId: tNum(run, 'mapId'),
      level: tNum(run, 'level'),
      completed: tBool(run, 'completed'),
      durationSec: null,
      score: tNumOrNull(run, 'score'),
      completedAt: (tNumOrNull(run, 'completedAt') ?? 0) * 1000 || null
    }))
    .filter((run) => run.level > 0)
    .sort((a, b) => b.level - a.level)
}

function readDungeonBests(entry: LuaValue, options: ReadOptions): DungeonBest[] {
  const bests = tGet(entry, 'dungeonBests')
  if (!isTable(bests)) return []
  return bests.array
    .filter(isTable)
    .map((best) => ({
      mapChallengeModeId: tNum(best, 'mapId'),
      name: tStr(best, 'name') || options.translator.t('keystone.generic'),
      level: tNum(best, 'level'),
      inTime: tBool(best, 'inTime'),
      score: tNum(best, 'score'),
      durationSec: tNumOrNull(best, 'durationSec')
    }))
    .filter((best) => best.mapChallengeModeId > 0 && best.level > 0)
    .sort((a, b) => options.translator.compare(a.name, b.name))
}

function readRaidProgress(entry: LuaValue): RaidProgress[] {
  const raids = tGet(entry, 'raidProgress')
  if (!isTable(raids)) return []
  return raids.array
    .filter(isTable)
    .map((raid) => ({
      id: tNum(raid, 'id'),
      name: tStr(raid, 'name'),
      bosses: (isTable(tGet(raid, 'bosses')) ? (tGet(raid, 'bosses') as LuaTable).array : [])
        .filter(isTable)
        .map((boss) => {
          const kills: Record<number, number> = {}
          const tally = tGet(boss, 'kills')
          if (isTable(tally)) {
            for (const [difficulty, count] of Object.entries(tally.map)) {
              const id = Number(difficulty)
              if (Number.isInteger(id) && typeof count === 'number' && count > 0) kills[id] = count
            }
          }
          return { id: tNum(boss, 'id'), name: tStr(boss, 'name'), kills }
        })
        .filter((boss) => boss.name.length > 0)
    }))
    .filter((raid) => raid.id > 0 && raid.name.length > 0 && raid.bosses.length > 0)
}

function readGear(entry: LuaValue, tooltips: Tooltips): GearItem[] {
  const gear = tGet(entry, 'gear')
  if (!isTable(gear)) return []
  return gear.array
    .filter(isTable)
    .map((item) => ({
      slot: tNum(item, 'slot'),
      itemId: tNum(item, 'itemId'),
      name: cleanItemName(tStr(item, 'name')),
      itemLevel: tNumOrNull(item, 'ilvl'),
      enchantId: tNumOrNull(item, 'enchantId') ?? 0,
      sockets: tNumOrNull(item, 'sockets'),
      gems: tNum(item, 'gems'),
      track: tStr(item, 'track') || null,
      quality: tNumOrNull(item, 'quality'),
      ...withTooltip(tooltips, tNum(item, 'itemId')),
      wowhead: wowheadItemParams(tStr(item, 'link'), tNum(item, 'itemId'))
    }))
    .filter((item) => item.slot > 0 && item.itemId > 0)
    .sort((a, b) => a.slot - b.slot)
}

function readFactions(list: LuaValue | undefined, kind: RenownKind): Renown[] {
  if (!isTable(list)) return []
  return list.array
    .filter(isTable)
    .map((faction) => {
      const paragon = tGet(faction, 'paragon')
      const maxLevel = tNum(faction, 'maxLevel')
      return {
        factionId: tNum(faction, 'factionId'),
        name: tStr(faction, 'name'),
        level: tNum(faction, 'level'),
        ...(kind === RenownKind.Reputation ? { maxLevel, kind } : {}),
        current: tNum(faction, 'current'),
        max: tNum(faction, 'max'),
        maxed: tBool(faction, 'maxed'),
        paragon:
          isTable(paragon) && tNum(paragon, 'max') > 0
            ? { current: tNum(paragon, 'current'), max: tNum(paragon, 'max'), rewardPending: tBool(paragon, 'rewardPending') }
            : null
      }
    })
    .filter((faction) => faction.factionId > 0 && faction.name.length > 0)
}

/**
 * The renown of the major factions, and the reputations of the season's
 * catalog. The addon writes every reputation of the character, hundreds on
 * an old account; only the catalog's are worth a place in the snapshot.
 */
function readRenown(entry: LuaValue): Renown[] {
  const wanted = new Set(seasonCatalog().factions.map((faction) => faction.id))
  return [
    ...readFactions(tGet(entry, 'renown'), RenownKind.Renown),
    ...readFactions(tGet(entry, 'reputations'), RenownKind.Reputation).filter((faction) => wanted.has(faction.factionId))
  ]
}

function readXp(entry: LuaValue): LevelProgress | null {
  const xp = tGet(entry, 'xp')
  if (!isTable(xp)) return null
  const xpMax = tNum(xp, 'xpMax')
  if (xpMax <= 0) return null
  return { xp: tNum(xp, 'xp'), xpMax, rested: tNum(xp, 'rested') }
}

function readBagSpace(entry: LuaValue): BagSpace | null {
  const bags = tGet(entry, 'bagSpace')
  if (!isTable(bags)) return null
  const total = tNum(bags, 'total')
  return total > 0 ? { free: tNum(bags, 'free'), total } : null
}

/** The auctions as counted at the last visit to the auction house; null before one. */
function readAuctions(entry: LuaValue): AuctionSummary | null {
  const auctions = tGet(entry, 'auctions')
  if (!isTable(auctions)) return null
  return { count: tNum(auctions, 'count'), nextExpiresAt: (tNumOrNull(auctions, 'nextExpiresAt') ?? 0) * 1000 || null }
}

/** The inbox as counted at the last visit to the mailbox; null before one. */
function readMailCount(entry: LuaValue): number | null {
  const mail = tGet(entry, 'mail')
  return isTable(mail) ? tNum(mail, 'count') : null
}

/** The guild banks any character opened, by name; an empty one is no entry, as the gold view lists them. */
function readGuilds(db: LuaValue | undefined): Array<{ name: string; money: number }> {
  const guilds = tGet(db, 'guilds')
  if (!isTable(guilds)) return []
  return Object.values(guilds.map)
    .filter(isTable)
    .map((guild) => ({ name: tStr(guild, 'name'), money: tNum(guild, 'money') }))
    .filter((guild) => guild.name !== '' && guild.money > 0)
}

/** The tooltips the addon registered, by item id. */
type Tooltips = Map<number, TooltipLine[]>

/** A six-digit hex colour as the addon writes it, else nothing. */
function readHex(line: LuaValue, key: string): string | null {
  const hex = tStr(line, key).toLowerCase()
  return /^[0-9a-f]{6}$/.test(hex) ? hex : null
}

/**
 * The register of tooltips: the client's lines by item id. A texture in
 * a line (the coins of the sell price, a quality icon) is markup the app
 * does not draw, so it comes out; a line that is only markup stays as a
 * blank, since the game's blank lines are the gaps between the parts.
 */
function readTooltips(db: LuaValue | undefined): Tooltips {
  const out: Tooltips = new Map()
  const items = tGet(tGet(db, 'tooltips'), 'items')
  if (!isTable(items)) return out
  for (const [id, lines] of Object.entries(items.map)) {
    const itemId = Number(id)
    if (!Number.isInteger(itemId) || itemId <= 0 || !isTable(lines)) continue
    const read = lines.array.filter(isTable).map((line) => ({
      left: stripMarkup(tStr(line, 'l')),
      right: stripMarkup(tStr(line, 'r')) || null,
      leftColor: readHex(line, 'lc'),
      rightColor: readHex(line, 'rc')
    }))
    if (read.some((line) => line.left || line.right)) out.set(itemId, read)
  }
  return out
}

/** The tooltip field for an item, or no field where the register has none: absent, not null. */
function withTooltip(tooltips: Tooltips, itemId: number): { tooltip?: TooltipLine[] } {
  const tooltip = tooltips.get(itemId)
  return tooltip ? { tooltip } : {}
}

/** One container as the addon writes it: the space, and the items with their stacks already summed. */
function readContainer(table: LuaValue | undefined, name: string | null, tooltips: Tooltips): Container | null {
  if (!isTable(table)) return null
  const items: BagItem[] = []
  for (const item of tList(table, 'items')) {
    const itemId = tNum(item, 'id')
    if (itemId <= 0) continue
    items.push({
      itemId,
      name: parseItemLink(tStr(item, 'link'))?.name ?? '',
      count: Math.max(1, tNum(item, 'count')),
      quality: tNumOrNull(item, 'quality'),
      itemLevel: tNumOrNull(item, 'ilvl'),
      ...withTooltip(tooltips, itemId),
      wowhead: wowheadItemParams(tStr(item, 'link'), itemId),
      craftTier: craftTierOf(tStr(item, 'link'))
    })
  }
  return { name, slots: tNum(table, 'slots'), free: tNum(table, 'free'), items }
}

/** A bank's tabs, in the client's order, each under the name the player gave it. */
function readBankTabs(bank: LuaValue | undefined, tooltips: Tooltips): Container[] {
  if (!isTable(bank)) return []
  return tList(bank, 'tabs')
    .map((tab) => readContainer(tab, tStr(tab, 'name') || null, tooltips))
    .filter((tab): tab is Container => tab !== null)
}

function readProfessions(entry: LuaValue): Profession[] {
  const professions = tGet(entry, 'professions')
  if (!isTable(professions)) return []
  return professions.array
    .filter(isTable)
    .map((profession) => {
      const max = tNum(profession, 'concentrationMax')
      return {
        name: tStr(profession, 'name'),
        skillLineId: tNum(profession, 'skillLineId'),
        skill: tNum(profession, 'skill'),
        maxSkill: tNum(profession, 'maxSkill'),
        concentration: max > 0 ? { current: tNum(profession, 'concentration'), max } : null,
        knowledge: tNumOrNull(profession, 'knowledge')
      }
    })
    .filter((profession) => profession.name.length > 0)
}

/** The recipe cooldowns the profession window showed, times in millis. */
function readCooldowns(entry: LuaValue): CraftCooldown[] {
  const cooldowns = tGet(entry, 'cooldowns')
  if (!isTable(cooldowns)) return []
  const out: CraftCooldown[] = []
  for (const [idText, value] of Object.entries(cooldowns.map)) {
    const recipeId = Number(idText)
    if (!Number.isInteger(recipeId) || !isTable(value)) continue
    const readyAt = tNum(value, 'readyAt')
    out.push({
      recipeId,
      name: tStr(value, 'name'),
      readyAt: readyAt > 0 ? readyAt * 1000 : 0,
      charges: tNumOrNull(value, 'charges'),
      maxCharges: tNumOrNull(value, 'maxCharges'),
      seenAt: tNum(value, 'seenAt') * 1000
    })
  }
  return out.sort((a, b) => a.recipeId - b.recipeId)
}

function readEvents(db: LuaValue | undefined): WeeklyEvents | null {
  const events = db === undefined ? undefined : tGet(db, 'events')
  if (!isTable(events)) return null
  const list = tGet(events, 'list')
  if (!isTable(list)) return null
  const entries = list.array.filter(isTable).map((event) => ({
    title: tStr(event, 'title'),
    startsAt: (tNumOrNull(event, 'startsAt') ?? 0) * 1000 || null,
    endsAt: (tNumOrNull(event, 'endsAt') ?? 0) * 1000 || null
  }))
  return { list: entries.filter((event) => event.title.length > 0), updatedAt: tNum(events, 'updatedAt') * 1000 }
}

function readSeasonDungeons(db: LuaValue | undefined): SeasonDungeons | null {
  const season = db === undefined ? undefined : tGet(db, 'season')
  if (!isTable(season)) return null
  const dungeons = tGet(season, 'dungeons')
  if (!isTable(dungeons)) return null
  const list = dungeons.array
    .filter(isTable)
    .map((dungeon) => ({ mapChallengeModeId: tNum(dungeon, 'mapId'), name: tStr(dungeon, 'name') }))
    .filter((dungeon) => dungeon.mapChallengeModeId > 0 && dungeon.name.length > 0)
  return list.length > 0 ? { list, updatedAt: tNum(season, 'updatedAt') * 1000 } : null
}

function readLockouts(entry: LuaValue): InstanceLockout[] {
  const lockouts = tGet(entry, 'lockouts')
  if (!isTable(lockouts)) return []

  return lockouts.array.filter(isTable).map((lock) => ({
    name: tStr(lock, 'name'),
    difficultyId: tNumOrNull(lock, 'difficultyId'),
    difficulty: tStr(lock, 'difficulty'),
    isRaid: tBool(lock, 'isRaid'),
    maxPlayers: tNumOrNull(lock, 'maxPlayers'),
    defeated: tNum(lock, 'defeated'),
    total: tNum(lock, 'total'),
    bosses: (isTable(tGet(lock, 'bosses')) ? (tGet(lock, 'bosses') as LuaTable).array : [])
      .filter((boss): boss is string => typeof boss === 'string')
      .filter((boss) => boss.length > 0),
    // Seconds in the file, millis everywhere in the app.
    resetsAt: (tNumOrNull(lock, 'resetsAt') ?? 0) * 1000 || null
  }))
}

function readWorldBosses(entry: LuaValue): WorldBossLockout[] {
  const bosses = tGet(entry, 'worldBosses')
  if (!isTable(bosses)) return []
  return bosses.array
    .filter(isTable)
    .map((boss) => ({ name: tStr(boss, 'name'), defeated: tBool(boss, 'defeated', true) }))
    .filter((boss) => boss.name.length > 0)
}

/** The quest log: every quest on it with its progress and whether it is ready to turn in. */
function readQuestLog(entry: LuaValue): QuestLogEntry[] {
  const log = tGet(entry, 'questLog')
  if (!isTable(log)) return []
  return log.array
    .filter(isTable)
    .map((quest) => {
      const fulfilled = tNum(quest, 'fulfilled')
      const required = tNum(quest, 'required')
      return {
        id: tNum(quest, 'id'),
        title: tStr(quest, 'title'),
        ready: tBool(quest, 'ready'),
        // The client sums progress-bar objectives in percent and the rest in
        // units; the text says which it was only where all of it is a bar.
        progress: required > 0 ? { fulfilled, required, text: `${fulfilled}/${required}` } : null
      }
    })
    .filter((quest) => quest.id > 0)
}

/** The weeklies on the log - the client's frequency 2 - as suggestions, with their titles. */
function readWeeklyLog(entry: LuaValue): WeeklyQuestDef[] {
  const log = tGet(entry, 'questLog')
  if (!isTable(log)) return []
  return log.array
    .filter(isTable)
    .filter((quest) => tNum(quest, 'frequency') === WEEKLY_FREQUENCY && tNum(quest, 'id') > 0)
    .map((quest) => ({ id: tNum(quest, 'id'), label: tStr(quest, 'title') }))
}

/** A turn-in since the reset, with the frequency the log had given the quest; -1 where the addon did not know. */
interface TurnIn extends WeeklyQuestDef {
  frequency: number
}

/** The quests turned in since the reset, with the client's titles. Older records are the addon's to prune. */
function readQuestsDone(entry: LuaValue, resetAt: number): TurnIn[] {
  const done = tGet(entry, 'questsDone')
  if (!isTable(done)) return []
  const out: TurnIn[] = []
  for (const [id, record] of Object.entries(done.map)) {
    const numeric = Number(id)
    if (!Number.isInteger(numeric) || !isTable(record)) continue
    if (tNum(record, 'at') * 1000 < resetAt) continue
    out.push({ id: numeric, label: tStr(record, 'title'), frequency: tNumOrNull(record, 'frequency') ?? -1 })
  }
  return out
}

/**
 * The registered quests the client flags completed - on this character, or
 * on the account where `key` names that list. Only the flags of the week
 * the addon stamped them for: a stale list from before the reset would
 * tick quests the character has not done again.
 */
function readFlagged(entry: LuaValue, key: 'questsFlagged' | 'questsFlaggedOnAccount', resetAt: number): Set<number> {
  const flagged = tGet(entry, key)
  const out = new Set<number>()
  if (!isTable(flagged) || tNum(entry, 'flaggedWeek') * 1000 <= resetAt) return out
  for (const [id, value] of Object.entries(flagged.map)) {
    const numeric = Number(id)
    if (Number.isInteger(numeric) && value === true) out.add(numeric)
  }
  return out
}

/**
 * The configured weeklies from the log, the turn-ins and the client's
 * completion flags alone. Below SavedInstances, which has the longer memory
 * of completions; on a roster without it this is what keeps the list alive.
 */
function readWeeklies(
  options: ReadOptions,
  log: QuestLogEntry[],
  done: WeeklyQuestDef[],
  flagged: Set<number>,
  onAccount: Set<number>
): WeeklyTask[] | undefined {
  if (options.weeklyQuests.length === 0) return undefined
  const onLog = new Map(log.map((quest) => [quest.id, quest]))
  const turnedIn = new Map(done.map((quest) => [quest.id, quest]))
  // A pool's line is whichever of its quests the week offers: the one on
  // the log, turned in or flagged - the others are not on the board.
  return options.weeklyQuests.map((def) => {
    const entry = fromPool(def, (id) => onLog.get(id))
    const finished = fromPool(def, (id) => turnedIn.get(id))
    return {
      id: def.id,
      label: finished?.label || entry?.title || def.label,
      ...(def.pool ? { pool: def.pool } : {}),
      done: finished !== undefined || questIdsOf(def).some((id) => flagged.has(id)),
      // The client's account flag: some character did it, and the warband's
      // one reward is gone. Written only where it says so.
      ...(questIdsOf(def).some((id) => onAccount.has(id)) ? { doneOnAccount: true } : {}),
      onLog: entry !== undefined,
      ready: entry?.ready ?? false,
      progress: entry?.progress ?? null
    }
  })
}

/** The register of quests, as the addon keeps it account-wide; the client's words for the flags. */
function readQuestRegistry(db: LuaValue | undefined): QuestRegistry {
  const quests = tGet(db, 'quests')
  const out: RegisteredQuest[] = []
  if (isTable(quests)) {
    for (const [id, record] of Object.entries(quests.map)) {
      const numeric = Number(id)
      if (!Number.isInteger(numeric) || numeric <= 0 || !isTable(record)) continue
      out.push({
        id: numeric,
        title: tStr(record, 'title'),
        frequency: tStr(record, 'frequency') || 'Default',
        classification: tStr(record, 'classification') || null,
        expansion: tNumOrNull(record, 'expansion'),
        profession: tNumOrNull(record, 'tradeskill'),
        account: tBool(record, 'account'),
        hidden: tBool(record, 'hidden'),
        resets: tStr(record, 'resets') === QuestReset.Weekly ? QuestReset.Weekly : null,
        seenAt: tNum(record, 'seenAt') * 1000,
        doneAt: (tNumOrNull(record, 'doneAt') ?? 0) * 1000 || null
      })
    }
  }
  return { expansion: tNumOrNull(db, 'expansion'), quests: out }
}

/** The addon's table for each kind of icon the lexicon holds. */
const ICON_TABLES: Record<Exclude<LexiconKind, LexiconKind.Portrait>, string> = {
  [LexiconKind.Item]: 'items',
  [LexiconKind.Currency]: 'currencies',
  [LexiconKind.Recipe]: 'recipes',
  [LexiconKind.Profession]: 'professions',
  [LexiconKind.ItemClass]: 'classes'
}

/**
 * The register, as the addon keeps it account-wide: a file id by id for
 * each kind of picture, the class code by item id - and the character id
 * of every character the addon saw, out of the GUID it wrote with the
 * character.
 */
function readLexicon(db: LuaValue | undefined): Lexicon {
  const out = emptyLexicon()
  const icons = tGet(db, 'icons')
  if (isTable(icons)) {
    for (const [kind, table] of Object.entries(ICON_TABLES) as [Exclude<LexiconKind, LexiconKind.Portrait>, string][]) {
      const list = tGet(icons, table)
      if (!isTable(list)) continue
      for (const [id, fileId] of Object.entries(list.map)) {
        // A class code of zero is a real one (a potion is 0 01): only a picture needs a positive number.
        if (
          Number.isInteger(Number(id)) &&
          Number(id) > 0 &&
          typeof fileId === 'number' &&
          fileId >= (kind === LexiconKind.ItemClass ? 0 : 1)
        )
          out[kind][id] = fileId
      }
    }
  }
  const chars = tGet(db, 'chars')
  if (isTable(chars)) {
    for (const entry of Object.values(chars.map)) {
      if (!isTable(entry)) continue
      const characterId = characterIdOf(tStr(entry, 'guid'))
      const name = tStr(entry, 'name')
      const realmSlug = tStr(entry, 'realmSlug') || slugifyRealm(tStr(entry, 'realm'))
      if (characterId && name && realmSlug) out[LexiconKind.Portrait][characterKey(name, realmSlug)] = characterId
    }
  }
  return out
}

/** Currencies with the client's own names, which is more than the other sources have. */
function readCurrencies(entry: LuaValue, options: ReadOptions): CurrencyAmount[] {
  const currencies = tGet(entry, 'currencies')
  if (!isTable(currencies)) return []

  return currencies.array
    .filter(isTable)
    .map((currency) => {
      const id = tNum(currency, 'id')
      return {
        id,
        name: tStr(currency, 'name') || options.currencyNames[id] || '',
        quantity: tNum(currency, 'quantity'),
        max: tNumOrNull(currency, 'max'),
        earnedThisWeek: tNumOrNull(currency, 'earnedThisWeek'),
        weeklyMax: tNumOrNull(currency, 'weeklyMax')
      }
    })
    .filter((currency) => currency.id > 0)
    .sort((a, b) => options.translator.compare(a.name, b.name))
}

export const companionAdapter: SourceAdapter = {
  id: 'companion',
  labelKey: 'source.companion.label',
  descriptionKey: 'source.companion.description',
  areas: [
    'identity',
    'vault',
    'runs',
    'lockouts',
    'worldBosses',
    'currencies',
    'weeklies',
    'dungeonBests',
    'raidProgress',
    'gear',
    'renown',
    'bags'
  ],
  // Above the community addons wherever it speaks at all: this is the client's
  // own account of the week, not a reconstruction from what an addon happened
  // to store. Identity stays below SavedInstances, which knows characters this
  // one has never seen and has the longer memory of item level and score.
  priority: {
    identity: 45,
    vault: 90,
    runs: 90,
    lockouts: 90,
    worldBosses: 90,
    currencies: 60,
    // Below SavedInstances: it remembers completions from before the addon.
    weeklies: 30,
    dungeonBests: 90,
    raidProgress: 90,
    gear: 90,
    renown: 90,
    // Read off the client at the bank, not off what an addon happened to
    // store on the way; the app's own source for what the bags and the
    // banks hold.
    bags: 90
  },
  addonFolder: 'WarbandBriefing',
  fileNames: [SAVED_VARIABLES_FILE, LEGACY_SAVED_VARIABLES_FILE],

  findFiles: findCompanionFiles,

  async read(file: SourceFile, options: ReadOptions): Promise<SourceCharacter[]> {
    const db = await companionDb(file)
    const chars = tGet(db, 'chars')
    if (!isTable(chars)) return []
    const tooltips = readTooltips(db)

    const out: SourceCharacter[] = []
    for (const entry of Object.values(chars.map)) {
      if (!isTable(entry)) continue
      const name = tStr(entry, 'name')
      const realm = tStr(entry, 'realm')
      if (!name || !realm) continue

      // The addon slugifies the realm itself, but a file written by an older
      // version may not have; the app's own rules decide either way.
      const realmSlug = tStr(entry, 'realmSlug') || slugifyRealm(realm)
      const keystoneLevel = tNum(entry, 'keystoneLevel')
      // The week the record describes: from the reset the client named, a
      // week back. Turn-ins from before it are last week's.
      const nextResetAt = (tNumOrNull(entry, 'nextResetAt') ?? 0) * 1000
      const questLog = readQuestLog(entry)
      const resetAt = nextResetAt > 0 ? nextResetAt - WEEK_MS : 0
      const questsDone = readQuestsDone(entry, resetAt)
      const flagged = readFlagged(entry, 'questsFlagged', resetAt)
      const flaggedOnAccount = readFlagged(entry, 'questsFlaggedOnAccount', resetAt)

      out.push({
        key: characterKey(name, realmSlug),
        name,
        realm,
        realmSlug,
        region: readRegion(entry),
        className: tStr(entry, 'classLocalized') || null,
        classToken: tStr(entry, 'class') || null,
        spec: tStr(entry, 'spec') || null,
        level: tNumOrNull(entry, 'level'),
        itemLevel: tNumOrNull(entry, 'ilvl'),
        faction: tStr(entry, 'faction') || null,
        guild: tStr(entry, 'guild') || null,
        money: tNumOrNull(entry, 'money'),
        mythicRating: tNumOrNull(entry, 'mythicRating'),
        // The client says outright whether a reward is still in there, so this
        // one is read rather than inferred from an old snapshot.
        vaultRewardWaiting: isTable(entry) && 'vaultRewardWaiting' in entry.map ? tBool(entry, 'vaultRewardWaiting') : null,
        keystone:
          keystoneLevel > 0
            ? {
                name: tStr(entry, 'keystoneName'),
                level: keystoneLevel
              }
            : null,
        vault: readVault(entry),
        mythicRuns: readRuns(entry, options),
        lockouts: readLockouts(entry),
        weeklies: readWeeklies(options, questLog, questsDone, flagged, flaggedOnAccount),
        questLog,
        questsDone: questsDone.map(({ id, label }) => ({ id, label })),
        // A weekly on the log is a suggestion before anyone turns it in: the
        // log says its frequency, which the turn-in record cannot.
        seenWeeklies: [
          ...questsDone.filter((quest) => quest.frequency === WEEKLY_FREQUENCY).map(({ id, label }) => ({ id, label })),
          ...readWeeklyLog(entry)
        ],
        worldBosses: readWorldBosses(entry),
        currencies: readCurrencies(entry, options),
        dungeonBests: readDungeonBests(entry, options),
        raidProgress: readRaidProgress(entry),
        gear: readGear(entry, tooltips),
        renown: readRenown(entry),
        xp: readXp(entry),
        zone: tStr(entry, 'zone') || null,
        auctions: readAuctions(entry),
        mailCount: readMailCount(entry),
        bagSpace: readBagSpace(entry),
        bags: readContainer(tGet(entry, 'bags'), null, tooltips),
        bank: readBankTabs(tGet(entry, 'bank'), tooltips),
        professions: readProfessions(entry),
        cooldowns: readCooldowns(entry),
        // The reset this character's realm actually runs on, as the client
        // reported it at the last save.
        weeklyResetAt: (tNumOrNull(entry, 'nextResetAt') ?? 0) * 1000 || null,
        updatedAt: tNum(entry, 'updatedAt') * 1000,
        accountName: file.accountName
      })
    }
    return out
  },

  async readAccount(file: SourceFile): Promise<SourceAccountData> {
    const db = await companionDb(file)
    return {
      events: readEvents(db),
      seasonDungeons: readSeasonDungeons(db),
      questRegistry: readQuestRegistry(db),
      lexicon: readLexicon(db),
      warbandBank: readBankTabs(tGet(db, 'warbandBank'), readTooltips(db)),
      warbandBankAt: tNum(tGet(db, 'warbandBank'), 'updatedAt') * 1000 || null,
      warbandGold: tNumOrNull(tGet(db, 'warbandGold'), 'money') ?? undefined,
      warbandGoldAt: tNum(tGet(db, 'warbandGold'), 'updatedAt') * 1000 || null,
      guilds: readGuilds(db)
    }
  }
}
