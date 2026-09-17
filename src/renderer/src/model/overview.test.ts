/**
 * Tests for the overview's maths and the small modules beside it: what the
 * week of a character is, which characters a filter keeps, how a roster
 * sorts, and the formatters and the preferences every view shares.
 */

import { expect, it } from 'vitest'
import {
  weeklyProgress,
  sortCharacters,
  keystoneShort,
  matches,
  rosterMaxLevel,
  LEVEL_CAP,
  playedParts,
  formatPlayed,
  multiRealm,
  raidKills,
  concentrationFull,
  tokenAmount
} from './overview'
import { checkGear, takesEnchant, gearHint } from './gear'
import { whole, signed, untilReset, percentOf } from './format'
import { goldSeries, niceTicks, formatGoldShort, spanDays } from './gold'
import { normalizePrefs } from '../prefs'
import { splitDuration, DAY_MS } from '../../../shared/time'
import { appendReading, compactByDay } from '../../../shared/series'
import { keysTranslator } from '../../../shared/i18n/testing'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { snapshot, vaultRow } from '../../../shared/testing'
import type { CharacterSnapshot, GearItem, GoldPoint } from '../../../shared/types'
import type { ViewPrefs } from '../prefs'
import { DISPLAY_DEFAULTS } from '../../../shared/display'
import { GoalKind } from '../../../shared/enums/goalKind'
import { Severity } from '../enums/severity'
import { SortKey } from '../enums/sortKey'
import { SortDirection } from '../enums/sortDirection'
import { GoldRange } from '../enums/goldRange'
import { ViewMode } from '../enums/viewMode'
import { TaskGrouping } from '../enums/taskGrouping'

const tr = keysTranslator()

const MAX = 90
const NOW = new Date(2026, 2, 13, 12, 0, 0).getTime()

/** A snapshot with the vault rows from their counts, read an hour ago. */
const character = (name: string, options: Partial<CharacterSnapshot> & { raid?: number; dungeon?: number; world?: number } = {}) =>
  snapshot(name, {
    className: 'Magier',
    vault: [
      vaultRow(VaultCategory.Raid, [2, 4, 6], options.raid ?? 0),
      vaultRow(VaultCategory.Dungeon, [1, 4, 8], options.dungeon ?? 0),
      vaultRow(VaultCategory.World, [2, 4, 8], options.world ?? 0)
    ],
    weeklyUpdatedAt: NOW - 3_600_000,
    ...options
  })

/* ---- the season's token ---- */

const voidcore = { id: 3418, name: 'Nebulöser Leerenkern', quantity: 2, max: null, earnedThisWeek: null, weeklyMax: null }
const crest = { ...voidcore, id: 3446, name: 'Myth', quantity: 40 }
it('the count of the token is what the character holds', () => {
  expect(tokenAmount({ currencies: [crest, voidcore] })).toEqual(2)
})
it('none among other currencies is 0: a source lists only what is held', () => {
  expect(tokenAmount({ currencies: [crest] })).toEqual(0)
})
it('no currencies at all is a source that reads none: unknown', () => {
  expect(tokenAmount({ currencies: [] })).toEqual(null)
})

/* ---- the week of one character ---- */

const open = weeklyProgress(
  character('Offen', {
    dungeon: 4,
    weeklies: [
      { id: 1, label: 'A', done: false },
      { id: 2, label: 'B', done: true }
    ]
  })
)
it('the vault is counted over the rows kept', () => {
  expect([open.vaultUnlocked, open.vaultTotal]).toEqual([2, 9])
})
it('the ratio follows', () => {
  expect(open.ratio).toEqual(2 / 9)
})
it('the gaps are the next slot of each row, closest first, priced', () => {
  expect(open.gaps.map((gap) => [gap.category, gap.missing, gap.slot])).toEqual([
    ['raid', 2, 1],
    ['world', 2, 1],
    ['dungeon', 4, 3]
  ])
})
it('an open quest keeps the week open', () => {
  expect([open.openWeeklies, open.done]).toEqual([1, false])
})
it('with quests done and the vault full the week is done', () => {
  expect(
    weeklyProgress(character('Quests', { raid: 6, dungeon: 8, world: 8, weeklies: [{ id: 1, label: 'A', done: true }] })).done
  ).toEqual(true)
})
it('without quests the vault has to be full', () => {
  expect([
    weeklyProgress(character('Voll', { raid: 6, dungeon: 8, world: 8 })).done,
    weeklyProgress(character('Halb', { raid: 6 })).done
  ]).toEqual([true, false])
})
it('with goals, every goal', () => {
  expect(weeklyProgress(character('Ziel', { dungeon: 4 }), [{ id: 'g', kind: GoalKind.VaultDungeon, target: 2 }]).done).toEqual(true)
})
it('a stale snapshot is never done', () => {
  expect(weeklyProgress(character('Alt', { raid: 6, dungeon: 8, world: 8, stale: true })).done).toEqual(false)
})
it('a capped currency without a name is not one of the week', () => {
  expect(
    weeklyProgress(
      character('Namenlos', {
        currencies: [
          { id: 1, name: '', quantity: 1, max: null, earnedThisWeek: 1, weeklyMax: 20 },
          { id: 2, name: 'Crest', quantity: 1, max: null, earnedThisWeek: 1, weeklyMax: 20 }
        ]
      })
    ).weeklyCurrencies.map((c) => c.id)
  ).toEqual([2])
})
it('a character with every row taken off has no vault to count', () => {
  expect(weeklyProgress(character('Bank', { skipped: ['vault:raid', 'vault:dungeon', 'vault:world'], dungeon: 8 })).vaultTotal).toEqual(0)
})
it('a character that kept the dungeon row alone counts that row only', () => {
  expect(weeklyProgress(character('Keys', { skipped: ['vault:raid', 'vault:world'], raid: 6, dungeon: 4 })).vaultUnlocked).toEqual(2)
})
// The skips reach the progress through the rows and the counts, so the
// board and the plan follow the list without a parameter of their own.
it('a vault row taken off the week is not counted', () => {
  expect(weeklyProgress(character('Ohne', { skipped: ['vault:raid'], raid: 6, dungeon: 4 })).vaultRows.map((row) => row.category)).toEqual([
    'dungeon',
    'world'
  ])
})
it('a quest taken off is not open', () => {
  expect(
    weeklyProgress(
      character('Ohne', {
        skipped: ['weekly:1'],
        weeklies: [
          { id: 1, label: 'A', done: false },
          { id: 2, label: 'B', done: false }
        ]
      })
    ).openWeeklies
  ).toEqual(1)
})
it('a gear errand taken off is not an issue', () => {
  expect(
    weeklyProgress(
      character('Ohne', {
        skipped: ['gear:enchant'],
        gear: [{ slot: 11, itemId: 1, name: 'Ring', itemLevel: 600, enchantId: 0, sockets: null, gems: 0, track: null, quality: 4 }]
      })
    ).gearIssues
  ).toEqual(0)
})
it('the raid kills are read off the raid lockouts', () => {
  expect(
    raidKills(
      character('Kills', {
        lockouts: [
          {
            name: 'R',
            isRaid: true,
            defeated: 4,
            total: 8,
            difficultyId: 15,
            difficulty: '',
            maxPlayers: null,
            bosses: [],
            resetsAt: null
          },
          {
            name: 'D',
            isRaid: false,
            defeated: 3,
            total: 3,
            difficultyId: 23,
            difficulty: '',
            maxPlayers: null,
            bosses: [],
            resetsAt: null
          }
        ]
      })
    )
  ).toEqual({ defeated: 4, total: 8 })
})
it('a full concentration bar is a guard', () => {
  expect(
    concentrationFull({
      name: 'A',
      skillLineId: 1,
      skill: 100,
      maxSkill: 100,
      knowledge: null,
      concentration: { current: 1000, max: 1000 }
    })
  ).toEqual(true)
})

/* ---- which characters the filter keeps ---- */

it('the roster raises the cap', () => {
  expect(rosterMaxLevel([character('Hoch', { level: LEVEL_CAP + 5 })])).toEqual(LEVEL_CAP + 5)
})
it('a roster on one realm is one word too many', () => {
  expect([multiRealm([character('A'), character('B')]), multiRealm([character('A'), character('B', { realm: 'Thrall' })])]).toEqual([
    false,
    true
  ])
})

/* ---- the search ---- */

const hunter = character('Jäger', {
  spec: 'Beast',
  weeklies: [
    { id: 1, label: 'Prey: Hunt', done: false },
    { id: 2, label: 'Done quest', done: true }
  ],
  accounts: ['WOW2']
})
it('every term has to match', () => {
  expect([matches(hunter, 'jäger beast'), matches(hunter, 'jäger druid')]).toEqual([true, false])
})
it('an open quest is searchable, a done one is not', () => {
  expect([matches(hunter, 'prey'), matches(hunter, 'done quest')]).toEqual([true, false])
})
it('the account is searchable', () => {
  expect(matches(hunter, 'wow2')).toEqual(true)
})
it('an empty query matches', () => {
  expect(matches(hunter, '  ')).toEqual(true)
})

/* ---- the sort ---- */

const roster = [
  character('Zeta', { itemLevel: 680 }),
  character('Alpha', { itemLevel: 690 }),
  character('Lowbie', { level: 60, itemLevel: 700 }),
  character('Stale', { stale: true, itemLevel: 700 }),
  character('Owed', { stale: true, itemLevel: 600, vaultRewardWaiting: true })
]
const names = (list: CharacterSnapshot[]) => list.map((c) => c.name)
it('by item level down: the reward first, then this week, then stale, then levelling', () => {
  expect(names(sortCharacters(roster, SortKey.Ilvl, SortDirection.Desc, tr, MAX))).toEqual(['Owed', 'Alpha', 'Zeta', 'Stale', 'Lowbie'])
})
it('up only turns the key, not the tiers', () => {
  expect(names(sortCharacters(roster, SortKey.Ilvl, SortDirection.Asc, tr, MAX))).toEqual(['Owed', 'Zeta', 'Alpha', 'Stale', 'Lowbie'])
})
it('by name', () => {
  expect(names(sortCharacters(roster.slice(0, 2), SortKey.Name, SortDirection.Asc, tr, MAX))).toEqual(['Alpha', 'Zeta'])
})
it('equal figures fall back to the name', () => {
  expect(
    names(sortCharacters([character('B', { itemLevel: 1 }), character('A', { itemLevel: 1 })], SortKey.Ilvl, SortDirection.Desc, tr, MAX))
  ).toEqual(['A', 'B'])
})

/* ---- the words ---- */

it('a key reads by its capitals', () => {
  expect([
    keystoneShort("Kings' Rest"),
    keystoneShort('Ara-Kara, City of Echoes'),
    keystoneShort('Dawnbreaker'),
    keystoneShort('abc')
  ]).toEqual(['KR', 'AKCE', 'Dawn', 'abc'])
})
it('played time in days and hours, then hours and minutes', () => {
  expect([playedParts(tr, 90_000).map((p) => p.value), playedParts(tr, 4_000).map((p) => p.value), playedParts(tr, 0)]).toEqual([
    [1, 1],
    [1, 6],
    []
  ])
})
it('played time as words', () => {
  expect(formatPlayed(tr, 90_000)).toEqual('played.days(1,1)')
})
it('a span splits into days, hours and minutes; a negative one is nothing', () => {
  expect([splitDuration(DAY_MS + 3_600_000 + 60_000), splitDuration(-5)]).toEqual([
    { days: 1, hours: 1, minutes: 1 },
    { days: 0, hours: 0, minutes: 0 }
  ])
})
it('a whole figure is rounded and a zero is a dash', () => {
  expect([whole(tr, 627.6), whole(tr, 0), whole(tr, null)]).toEqual(['628', '—', '—'])
})
it('a change carries its sign, a zero none', () => {
  expect([signed(tr, 3), signed(tr, -3), signed(tr, 0)]).toEqual(['+3', '-3', '0'])
})
it('a percentage of nothing is nothing', () => {
  expect([percentOf(1, 4), percentOf(1, 0)]).toEqual([25, 0])
})
it('a lockout past its reset has expired', () => {
  expect(untilReset(tr, NOW - 1, NOW)).toEqual('lockout.expired')
})
it('a lockout in days names the days and hours', () => {
  expect(untilReset(tr, NOW + DAY_MS + 3_600_000, NOW)).toEqual('lockout.resetInDays(1,1)')
})

/* ---- the gear check ---- */

const item = (slot: number, extra: Partial<GearItem> = {}): GearItem => ({
  slot,
  itemId: 1,
  name: 'Item',
  itemLevel: 650,
  enchantId: 0,
  sockets: null,
  gems: 0,
  track: null,
  quality: 4,
  ...extra
})
const FLAGS = { ...DISPLAY_DEFAULTS }
const bare = checkGear(character('Nackt', { gear: [item(11), item(5)] }), FLAGS)
it('the roster teaches which slots take an enchant; without one the fallback slots do', () => {
  expect(bare.missingEnchants.map((i) => i.slot)).toEqual([11, 5])
})
it('the check knows it saw gear', () => {
  expect(bare.known).toEqual(true)
})
it('an empty socket is an issue only where the source reports sockets', () => {
  expect(
    checkGear(character('Sockel', { gear: [item(2, { sockets: 1, gems: 0, enchantId: 5 })] }), FLAGS).emptySockets.map((i) => i.slot)
  ).toEqual([2])
})
it('the enchant half can be switched off', () => {
  expect(checkGear(character('Aus', { gear: [item(11)] }), { ...FLAGS, gear: false }).missingEnchants).toEqual([])
})
it('the merge marks a slot the roster enchants; without a mark the fallback decides', () => {
  expect([takesEnchant(item(9, { enchantable: true })), takesEnchant(item(9)), takesEnchant(item(5))]).toEqual([true, false, true])
})
it('the hint is rows: the count as the heading, the bare slots on a row, and the note where the source does not report sockets', () => {
  expect([
    gearHint(tr, bare).heading,
    gearHint(tr, bare).rows.map((row) => [row.label, row.value, row.tone]),
    gearHint(tr, bare).note
  ]).toEqual(['dash.steps.gear(2)', [['gear.row.enchant', 'slot.ring1, slot.chest', Severity.Warn]], 'gear.socketsUnknown'])
})

/* ---- the gold series ---- */

const point = (daysAgo: number, total: number): GoldPoint => ({
  at: NOW - daysAgo * DAY_MS,
  characters: total,
  warband: 0,
  guilds: 0,
  total,
  accounts: { WOW1: total }
})
const history = [point(40, 100_0000), point(20, 200_0000), point(5, 300_0000)]
const month = goldSeries(history, 'all', GoldRange.Month, undefined, NOW)!
it('a range starts where the last reading before it stood', () => {
  expect([month.samples[0].at, month.samples[0].value]).toEqual([NOW - 30 * DAY_MS, 100])
})
it('and ends now, at the last reading', () => {
  expect([month.samples.at(-1)!.at, month.samples.at(-1)!.value]).toEqual([NOW, 300])
})
it('the readings are the points inside the range', () => {
  expect(month.readings).toEqual(2)
})
it('the change is over the range', () => {
  expect(month.change).toEqual(200)
})
it('all time starts at the first reading', () => {
  expect(goldSeries(history, 'all', GoldRange.All, undefined, NOW)!.from).toEqual(history[0].at)
})
it('an account scope reads that account', () => {
  expect(goldSeries(history, 'WOW2', GoldRange.Month, undefined, NOW)!.last).toEqual(0)
})
it('no history, no series', () => {
  expect(goldSeries([], 'all', GoldRange.Month, undefined, NOW)).toEqual(null)
})
it('the span in days', () => {
  expect(Math.round(spanDays(month))).toEqual(30)
})
it('the ticks cover the range in round steps', () => {
  expect(niceTicks(103, 197, 4)).toEqual({ lo: 100, hi: 200, ticks: [100, 125, 150, 175, 200] })
})
it('a flat band still gets a band', () => {
  expect(niceTicks(50, 50).ticks.length > 1).toEqual(true)
})
it('the step is never below one', () => {
  expect(niceTicks(0, 0.3).ticks).toEqual([0, 1])
})
it('gold short', () => {
  expect([formatGoldShort(tr, 999), formatGoldShort(tr, 1_500_000)]).toEqual(['999', '1500000'])
})

/* ---- the preferences ---- */

/** What an earlier build or a hand-edited file left in the store. */
const stored = (raw: Record<string, unknown>) => raw as Partial<ViewPrefs>

const prefs = normalizePrefs({})
it('the defaults hold', () => {
  expect([prefs.sort, prefs.view, prefs.tasksGrouping]).toEqual([SortKey.Plan, ViewMode.Tiles, null])
})
it('the cards of an earlier build are the rows', () => {
  expect([normalizePrefs(stored({ view: 'cards' })).view, normalizePrefs(stored({ view: 'x' })).view]).toEqual([
    ViewMode.Rows,
    ViewMode.Tiles
  ])
})
it('a grouping the build knows stays, one it does not falls back', () => {
  expect([
    normalizePrefs({ tasksGrouping: TaskGrouping.Chore }).tasksGrouping,
    normalizePrefs(stored({ tasksGrouping: 'grid' })).tasksGrouping
  ]).toEqual([TaskGrouping.Chore, null])
})

/* ---- a series of readings ---- */

const same = (a: { v: number }, b: { v: number }) => a.v === b.v
const series = [{ at: 1, v: 1 }]
it('a new reading is kept', () => {
  expect(appendReading(series, { at: 2, v: 2 }, same).length).toEqual(2)
})
it('an unchanged stretch is its two ends', () => {
  expect(appendReading(appendReading(series, { at: 2, v: 1 }, same), { at: 3, v: 1 }, same).map((p) => p.at)).toEqual([1, 3])
})
it('a reading from the past is dropped', () => {
  expect(appendReading(series, { at: 0, v: 5 }, same).length).toEqual(1)
})
const old = [
  { at: NOW - 40 * DAY_MS, v: 1 },
  { at: NOW - 40 * DAY_MS + 3_600_000, v: 2 },
  { at: NOW - 1, v: 3 }
]
it('old readings thin to the last of each day; recent ones stay', () => {
  expect(compactByDay(old, NOW, 100).map((p) => p.v)).toEqual([2, 3])
})
it('the cap keeps the newest', () => {
  expect(compactByDay(old, NOW, 1).map((p) => p.v)).toEqual([3])
})
