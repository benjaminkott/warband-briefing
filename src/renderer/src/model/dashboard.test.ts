/**
 * Tests for the dashboard's own maths: how the roster is ordered, how a
 * goal reads across the whole roster, and what the range strips make of a
 * handful of numbers.
 */

import { expect, it } from 'vitest'
import { activeRoster, classBreakdown, dungeonMatrix, goalRollups, playedRoster, renownGroups, rosterRows, spread } from './dashboard'
import { factionLists } from '../components/settings/model'
import { keysTranslator } from '../../../shared/i18n/testing'
import { snapshot, vaultRow } from '../../../shared/testing'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import type { CharacterSnapshot, DungeonBest, MythicRun, Renown } from '../../../shared/types'
import { GoalKind } from '../../../shared/enums/goalKind'
import { FactionGroup } from '../../../shared/enums/factionGroup'

const tr = keysTranslator()

const MAX = 90
const WEEK = 7 * 24 * 3_600_000
/** Start of the current week, which is what "played recently" is measured from. */
const RESET_AT = new Date(2026, 2, 11, 6, 0, 0).getTime()

/**
 * A snapshot with the vault rows from their counts, read an hour after the
 * reset. `raid`, `dungeon` and `world` are how far that row has got, counted
 * in the row's own unit.
 */
const character = (name: string, options: Partial<CharacterSnapshot> & { raid?: number; dungeon?: number; world?: number } = {}) =>
  snapshot(name, {
    className: 'Magier',
    vault: [
      vaultRow(VaultCategory.Raid, [2, 4, 6], options.raid ?? 0),
      vaultRow(VaultCategory.Dungeon, [1, 4, 8], options.dungeon ?? 0),
      vaultRow(VaultCategory.World, [2, 4, 8], options.world ?? 0)
    ],
    weeklyUpdatedAt: RESET_AT + 3_600_000,
    accountName: 'Main',
    accounts: ['Main'],
    ...options
  })

/** A run of the week; the count is all the board reads. */
const run = (): MythicRun => ({ dungeon: 'Ara-Kara', mapChallengeModeId: 1, level: 10, completed: true })

/* ---- who the dashboard reports a week for ---- */

const roster = [character('Nyxaria', { dungeon: 3 }), character('Thalor', { level: 70 }), character('Miravel', { stale: true })]
it('only max level and this week', () => {
  expect(activeRoster(roster, MAX).map((c) => c.name)).toEqual(['Nyxaria'])
})

/* ---- who is actually being played ---- */

// The wall of untouched max-level alts is what this filter exists to keep off
// the board, so a character at the cap earns no place by being at the cap.
const account = [
  character('Aktiv', { weeklyUpdatedAt: RESET_AT + 3_600_000 }),
  character('Letzte', { stale: true, weeklyUpdatedAt: RESET_AT - WEEK + 3_600_000 }),
  character('Karteileiche', { stale: true, weeklyUpdatedAt: RESET_AT - 30 * WEEK }),
  character('Levelt', { level: 70, weeklyUpdatedAt: RESET_AT + 3_600_000 })
]
it('this week and last week are played, months ago is not', () => {
  expect(playedRoster(account, RESET_AT).map((c) => c.name)).toEqual(['Aktiv', 'Letzte', 'Levelt'])
})

// A reward that expires at the reset outranks the rule: it is the one thing a
// character can be owed while sitting untouched.
it('an uncollected vault keeps a quiet character in', () => {
  expect(
    playedRoster(
      [
        character('Vergessen', {
          stale: true,
          weeklyUpdatedAt: RESET_AT - 30 * WEEK,
          vaultRewardWaiting: true
        })
      ],
      RESET_AT
    ).length
  ).toEqual(1)
})

/* ---- the roster matrix ---- */

const matrix = rosterRows(
  [
    character('Weit', { raid: 0, dungeon: 0, world: 0 }),
    character('Nah', { raid: 5, dungeon: 7, world: 7 }),
    character('Fertig', { raid: 6, dungeon: 8, world: 8 }),
    character('Alt', {
      dungeon: 3,
      stale: true,
      weeklyUpdatedAt: RESET_AT - 2 * WEEK
    }),
    character('Klein', { level: 70 }),
    character('Offen', { raid: 6, dungeon: 8, world: 8, vaultRewardWaiting: true })
  ],
  [],
  MAX,
  RESET_AT,
  tr
)
it('urgent first, levelling last', () => {
  expect(matrix.map((row) => row.character.name)).toEqual(['Offen', 'Nah', 'Weit', 'Fertig', 'Alt', 'Klein'])
})
it('nothing is dropped from the roster', () => {
  expect(matrix.length).toEqual(6)
})
it('a snapshot over a week old is marked inactive', () => {
  expect(matrix.find((row) => row.character.name === 'Alt')!.inactive).toEqual(true)
})

/* Not having been played since the reset is an ordinary Wednesday, not a
   character whose data has stopped saying anything. */
const quiet = rosterRows(
  [
    character('Ruhig', {
      raid: 4,
      stale: true,
      weeklyUpdatedAt: RESET_AT - 2 * 24 * 3_600_000
    })
  ],
  [],
  MAX,
  RESET_AT,
  tr
)[0]
it('quiet since the reset is not inactive', () => {
  expect(quiet.inactive).toEqual(false)
})
it('a levelling character is marked, not filtered', () => {
  expect(matrix.find((row) => row.character.name === 'Klein')!.levelling).toEqual(true)
})

// Everything the matrix draws in a row comes off that row.
const detail = rosterRows(
  [
    character('Detail', {
      dungeon: 3,
      itemLevel: 662,
      mythicRuns: [run(), run(), run()],
      weeklies: [
        { id: 1, label: 'Weltboss', done: true },
        { id: 2, label: 'Weltquest', done: false }
      ]
    })
  ],
  [],
  MAX,
  RESET_AT,
  tr
)[0]
it('the row carries the vault stand', () => {
  expect([detail.vaultUnlocked, detail.vaultTotal]).toEqual([1, 9])
})
it('the row carries the run count', () => {
  expect(detail.runs).toEqual(3)
})
it('the row carries the quests', () => {
  expect([detail.openWeeklies, detail.totalWeeklies]).toEqual([1, 2])
})
it('the row carries the cheapest gap', () => {
  expect([detail.gap!.category, detail.gap!.missing]).toEqual([VaultCategory.Dungeon, 1])
})

// A full vault with quests left is still a character with something to do.
const questOnly = rosterRows(
  [
    character('Quest', {
      raid: 6,
      dungeon: 8,
      world: 8,
      weeklies: [{ id: 1, label: 'Weltboss', done: false }]
    })
  ],
  [],
  MAX,
  RESET_AT,
  tr
)[0]
it('a full vault leaves the quest as the cost', () => {
  expect([questOnly.gap, questOnly.cost]).toEqual([null, 1])
})

/* ---- goals across the roster ---- */

const goal = { id: 'g1', kind: GoalKind.VaultSlots, target: 3 }
const rollup = goalRollups(
  [
    // Three slots: the goal is met.
    character('Voll', { raid: 6, dungeon: 0, world: 0 }),
    // One slot of three.
    character('Halb', { raid: 2, dungeon: 0, world: 0 })
  ],
  [goal]
)[0]
it('characters that met the goal', () => {
  expect([rollup.met, rollup.total]).toEqual([1, 2])
})
// 3 of 3 plus 1 of 3, over the 6 the two of them together would need.
it('roster progress towards the goal', () => {
  expect(Math.round(rollup.ratio * 100)).toEqual(67)
})
it('no goals, no rollups', () => {
  expect(goalRollups([character('Egal')], []).length).toEqual(0)
})

/* ---- the range strips ---- */

const levels = spread(
  [
    character('A', { itemLevel: 640 }),
    character('B', { itemLevel: 660 }),
    character('C', { itemLevel: 680 }),
    // No value reported: left out rather than counted as a zero that would
    // stretch the range down to nothing.
    character('D')
  ],
  (c) => c.itemLevel
)!
it('range spans the reported values', () => {
  expect([levels.min, levels.max]).toEqual([640, 680])
})
it('unreported values are left out', () => {
  expect(levels.points.length).toEqual(3)
})
it('the average is of what was reported', () => {
  expect(levels.average).toEqual(660)
})
it('position is the place on the range', () => {
  expect(levels.points.map((point) => point.position)).toEqual([0, 0.5, 1])
})

// A roster all on the same number has no range to spread over.
const flat = spread([character('A', { itemLevel: 660 }), character('B', { itemLevel: 660 })], (c) => c.itemLevel)!
it('one value, one place', () => {
  expect(flat.points[0].position).toEqual(0.5)
})
it('nothing reported, no strip', () => {
  expect(spread([character('A')], (c) => c.itemLevel)).toEqual(null)
})

/* ---- the roster breakdown ---- */

const classes = classBreakdown(
  [
    character('A', { classToken: 'MAGE', className: 'Magier' }),
    character('B', { classToken: 'MAGE', className: 'Magier' }),
    character('C', { classToken: 'ROGUE', className: 'Schurke' })
  ],
  tr
)
it('classes counted, biggest first', () => {
  expect(classes.map((entry) => [entry.label, entry.count])).toEqual([
    ['Magier', 2],
    ['Schurke', 1]
  ])
})
// A class the app has no colour for still needs a drawable one.
it('an unknown class still gets a colour', () => {
  expect(classBreakdown([character('X', { classToken: null, className: 'Neu' })], tr)[0].color).toEqual('var(--text-faint)')
})

/* ---- the season-best matrix ---- */

const best = (id: number, name: string, level: number, score: number, inTime = true): DungeonBest => ({
  mapChallengeModeId: id,
  name,
  level,
  inTime,
  score,
  durationSec: null
})
it('no bests, no matrix', () => {
  expect(dungeonMatrix([character('A')], tr)).toEqual(null)
})
const bests = dungeonMatrix(
  [
    character('Low', { dungeonBests: [best(1, 'Ara-Kara', 8, 200)] }),
    character('High', {
      dungeonBests: [best(1, 'Ara-Kara', 12, 300), best(2, 'Stadt der Fäden', 14, 350, false)]
    }),
    character('None')
  ],
  tr
)!
it('one column per dungeon anyone ran, by name', () => {
  expect(bests.dungeons.map((d) => d.name)).toEqual(['Ara-Kara', 'Stadt der Fäden'])
})
it('rows only for characters with bests, best total first', () => {
  expect(bests.rows.map((r) => r.character.name)).toEqual(['High', 'Low'])
})
it('the total is the sum of the bests', () => {
  expect(bests.rows[0].total).toEqual(650)
})
it('the board shades against its highest key', () => {
  expect(bests.maxLevel).toEqual(14)
})
it('and colours against its best-paying run', () => {
  expect(bests.maxScore).toEqual(350)
})
it('a dungeon never run is the weakest', () => {
  expect(bests.rows[1].weakest).toEqual(2)
})
it('otherwise the lowest key is', () => {
  expect(bests.rows[0].weakest).toEqual(1)
})
it('the highest key is the strongest', () => {
  expect(bests.rows[0].strongest).toEqual(2)
})
it('a timed run wins a tie', () => {
  expect(
    dungeonMatrix([character('T', { dungeonBests: [best(1, 'A', 10, 100, false), best(2, 'B', 10, 110)] })], tr)!.rows[0].strongest
  ).toEqual(2)
})
// The client's list adds the column nobody ran; the whole roster is weakest there.
const listed = dungeonMatrix([character('Low', { dungeonBests: [best(1, 'Ara-Kara', 8, 200)] })], tr, [
  { mapChallengeModeId: 3, name: 'Die Brauerei' }
])!
it('a listed dungeon nobody ran is a column', () => {
  expect(listed.dungeons.map((d) => d.mapChallengeModeId)).toEqual([1, 3])
})
it('and the weakest of every row', () => {
  expect(listed.rows[0].weakest).toEqual(3)
})
it('a list alone, without a best on the roster, is no board', () => {
  expect(dungeonMatrix([character('A')], tr, [{ mapChallengeModeId: 3, name: 'X' }])).toEqual(null)
})

/* ---- renown groups ---- */

const standing = (factionId: number, name: string, level: number): Renown => ({
  factionId,
  name,
  level,
  current: 100,
  max: 2500,
  maxed: false
})
const renownRoster = [
  character('R', {
    renown: [
      standing(2764, 'Prey: Season 1', 10),
      standing(2772, "Zul'jarra's Forces", 10),
      standing(2796, 'Delves: Season 2', 10),
      standing(2710, 'Silvermoon Court', 20),
      standing(2696, 'Amani Tribe', 20)
    ]
  })
]
const grouped = renownGroups(tr, renownRoster, [])
it('an empty selection shows the default set, in groups', () => {
  expect(grouped.map((g) => g.group)).toEqual([FactionGroup.Season, FactionGroup.Expansion])
})
it('the season group holds the factions of the season', () => {
  expect(grouped[0].figures.map((f) => f.name)).toEqual(["Zul'jarra's Forces", 'Delves: Season 2'])
})
it('a faction of a past season is not shown', () => {
  expect(grouped.flatMap((g) => g.figures.map((f) => f.factionId)).includes(2764)).toEqual(false)
})
const picked = renownGroups(tr, renownRoster, [2764, 2772])
it('a selected id outside the catalog is left out', () => {
  expect(picked.map((g) => g.group)).toEqual([FactionGroup.Season])
})
it('and the selection inside it stays', () => {
  expect(picked[0].figures.map((f) => f.factionId)).toEqual([2772])
})

/* ---- what the settings offer to pick ---- */
const lists = factionLists(renownRoster[0].renown.map((f) => ({ id: f.factionId, name: f.name })))
it('the settings list the catalog in its two groups', () => {
  expect(lists.map((l) => l.group)).toEqual([FactionGroup.Season, FactionGroup.Expansion])
})
it('a faction of a past season is not offered', () => {
  expect(lists.flatMap((l) => l.factions.map((f) => f.id)).includes(2764)).toEqual(false)
})
it('the client name wins over the catalog', () => {
  expect(lists[0].factions.find((f) => f.id === 2772)!.name).toEqual("Zul'jarra's Forces")
})
