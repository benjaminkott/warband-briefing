/**
 * Tests for the task list's own maths: which chores a character gets, in
 * what order, what the sources settle as done, and how the same lines read
 * turned round by chore.
 */

import { expect, it } from 'vitest'
import {
  accountTasks,
  effectiveGrouping,
  filterTasks,
  groupingsFor,
  keepTask,
  pickAccount,
  pickList,
  skipSubject,
  splitShared,
  taskRow,
  taskSections,
  tasksByCharacter,
  tasksByChore,
  taskTotals
} from './tasks'
import { keysTranslator } from '../../../shared/i18n/testing'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { snapshot, vaultRow } from '../../../shared/testing'
import type { BagItem, CharacterSnapshot, Container, Goal } from '../../../shared/types'
import type { CustomTaskState } from '../../../shared/customTasks'
import { GoalKind } from '../../../shared/enums/goalKind'
import { CustomTaskScope } from '../../../shared/enums/customTaskScope'
import { TaskFilter } from '../enums/taskFilter'
import { TaskGrouping } from '../enums/taskGrouping'
import { TaskKind } from '../enums/taskKind'
import { TaskState } from '../enums/taskState'
import { DISPLAY_DEFAULTS } from '../../../shared/display'
import type { ListTip } from './listTip'

const tr = keysTranslator()

const MAX = 90
const RESET_AT = new Date(2026, 2, 11, 6, 0, 0).getTime()

/** A snapshot with the vault rows from their counts, read an hour after the reset. */
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

const list = (characters: CharacterSnapshot[], goals: Goal[] = [], custom: CustomTaskState | null = null) =>
  tasksByCharacter(tr, characters, goals, MAX, RESET_AT, undefined, custom)

/* ---- what a character gets ---- */

const main = character('Nyxaria', {
  dungeon: 8,
  raid: 1,
  weeklies: [
    { id: 1, label: 'Delves', done: true },
    { id: 2, label: 'Dungeons', done: false, ready: true, progress: { fulfilled: 4, required: 4, text: '4/4' } }
  ],
  worldBosses: [{ name: 'Boss', defeated: false }],
  professions: [
    { name: 'Alchemy', skillLineId: 171, skill: 100, maxSkill: 100, concentration: { current: 1000, max: 1000 }, knowledge: null },
    { name: 'Mining', skillLineId: 186, skill: 100, maxSkill: 100, concentration: null, knowledge: null }
  ],
  gear: [{ slot: 11, itemId: 1, name: 'Ring', itemLevel: 600, enchantId: 0, sockets: null, gems: 0, track: null, quality: 4 }]
})
const [entry] = list([main])
it('every chore, in the order it is worked through', () => {
  expect(entry.tasks.map((task) => task.id)).toEqual([
    'vault:raid',
    'vault:dungeon',
    'vault:world',
    'weekly:1',
    'weekly:2',
    'boss:Boss',
    'profession:171',
    'gear:enchant'
  ])
})
it('a full row is done', () => {
  expect(entry.tasks.find((task) => task.id === 'vault:dungeon')!.state).toEqual(TaskState.Done)
})
it('an open row says how many more, and which slot', () => {
  expect([entry.tasks[0].label, entry.tasks[0].note]).toEqual(['vault.gap.raid(1)', 'tasks.vaultSlot(1,3)'])
})
it('a quest with its objectives met is ready', () => {
  expect(entry.tasks.find((task) => task.id === 'weekly:2')!.state).toEqual(TaskState.Ready)
})
it('only a full concentration bar is a chore', () => {
  expect(entry.tasks.filter((task) => task.kind === TaskKind.Profession).length).toEqual(1)
})
it('the count is what the sources call done', () => {
  expect([entry.done, entry.total]).toEqual([2, 8])
})
it('every line names its character', () => {
  expect(new Set(entry.tasks.map((task) => task.characterKey)).size).toEqual(1)
})

/* ---- a reward waiting, and a character below the cap ---- */

const owed = list([character('Levelt', { level: 70, vaultRewardWaiting: true })])[0]
it('below the cap only the reward is a chore', () => {
  expect(owed.tasks.map((task) => task.id)).toEqual(['claim'])
})
it('a character with nothing to do has no panel', () => {
  expect(list([character('Frisch', { level: 70 })]).length).toEqual(0)
})
it('the reward comes first', () => {
  expect(list([character('Alt', { vaultRewardWaiting: true, dungeon: 8 })])[0].tasks[0].kind).toEqual('claim')
})

/* ---- the filter ---- */

it('the open filter drops what is done', () => {
  expect(filterTasks(entry.tasks, TaskFilter.Open).map((task) => task.id)).toEqual([
    'vault:raid',
    'vault:world',
    'weekly:2',
    'boss:Boss',
    'profession:171',
    'gear:enchant'
  ])
})
it('the all filter keeps everything', () => {
  expect(filterTasks(entry.tasks, TaskFilter.All).length).toEqual(8)
})

/* ---- the gear check switched off ---- */

const noGear = tasksByCharacter(tr, [main], [], MAX, RESET_AT, { ...DISPLAY_DEFAULTS, gear: false })[0]
it('a bare slot is only a chore where the gear check is on', () => {
  expect(noGear.tasks.some((task) => task.kind === TaskKind.Gear)).toEqual(false)
})

/* ---- goals ---- */

const withGoal = list([main], [{ id: 'slots-3', kind: GoalKind.VaultSlots, target: 3 }])[0]
it('a goal is no line: its figure is the sum of the vault rows, and the panel head carries it', () => {
  expect([withGoal.tasks.some((task) => task.id.startsWith('goal:')), withGoal.row.progress.goals.length]).toEqual([false, 1])
})

/* ---- a reward another character took ---- */

const paidTo = list([
  character('Dritt', {
    weeklies: [
      { id: 7, label: 'Lost Animals', done: false, rewardTaken: { by: 'Nyx' } },
      { id: 8, label: 'Housewarming', done: false, rewardTaken: { by: null } },
      { id: 9, label: 'Own', done: false }
    ]
  })
])[0]!
const paidLines = paidTo.tasks.filter((task) => task.kind === TaskKind.Weekly)
it('a weekly whose account reward went to another character is paid: the note names the character, the line asks no time', () => {
  expect(paidLines.map((task) => [task.state, task.note, task.minutes])).toEqual([
    [TaskState.Paid, 'task.rewardTaken(Nyx)', null],
    [TaskState.Paid, 'task.rewardTakenAccount', null],
    [TaskState.Open, null, 15]
  ])
})
it('a paid line is drawn, but no count holds it', () => {
  expect([paidTo.tasks.some((task) => task.state === TaskState.Paid), paidTo.total]).toEqual([true, paidTo.tasks.length - 2])
})
it('the row of a paid line is unchecked, with the hint', () => {
  expect(taskRow(tr, paidLines[0]!, false)).toMatchObject({ done: false, paid: true, checked: false, tip: 'task.rewardTakenHint' })
})

/* ---- turned round by chore ---- */

const roster = [main, character('Zweit', { dungeon: 3, weeklies: [{ id: 2, label: 'Dungeons', done: false }] })]
const chores = tasksByChore(list(roster))
it('one panel per chore, vault rows first, then the quests', () => {
  expect(chores.map((chore) => chore.id)).toEqual([
    'vault:raid',
    'vault:dungeon',
    'vault:world',
    'weekly:1',
    'weekly:2',
    'boss:Boss',
    'profession:171',
    'gear:enchant'
  ])
})
it('a chore both have holds both', () => {
  expect(chores.find((chore) => chore.id === 'weekly:2')!.tasks.map((task) => task.characterKey)).toEqual([main.key, 'realm-zweit'])
})
it('a chore panel is named after the chore, not the line', () => {
  expect(chores[1].label).toEqual('goal.vaultDungeon')
})
it('a chore panel counts its lines', () => {
  expect([chores[1].done, chores[1].total]).toEqual([1, 2])
})
it('the vault rows keep the order of the vault', () => {
  expect(chores.slice(0, 3).map((chore) => chore.label)).toEqual(['goal.vaultRaid', 'goal.vaultDungeon', 'goal.vaultWorld'])
})
const split = splitShared(chores)
it('a chore two share keeps its panel; one alone goes to the gathered lines, named by its character', () => {
  expect([split.shared.map((chore) => chore.id), split.singles.map((task) => task.key)]).toEqual([
    ['vault:raid', 'vault:dungeon', 'vault:world', 'weekly:2'],
    [`${main.key}/weekly:1`, `${main.key}/boss:Boss`, `${main.key}/profession:171`, `${main.key}/gear:enchant`]
  ])
})

/* ---- sections ---- */

const sections = taskSections(entry.tasks)
it('the lines fall into sections, empty ones left out', () => {
  expect(sections.map((s) => [s.id, s.total])).toEqual([
    ['vault', 3],
    ['quests', 3],
    ['professions', 1],
    ['errands', 1]
  ])
})
it('a section counts its own', () => {
  expect(sections[1].done).toEqual(1)
})

/* ---- the grouping follows the roster's size ---- */

it('one character has only the panel; from two on both groupings', () => {
  expect([groupingsFor(1), groupingsFor(2).length]).toEqual([[TaskGrouping.Character], 2])
})
it('no choice: by character, whatever the roster', () => {
  expect([effectiveGrouping(null, 1), effectiveGrouping(null, 4)]).toEqual([TaskGrouping.Character, TaskGrouping.Character])
})
it('a choice holds where the roster can use it', () => {
  expect([effectiveGrouping(TaskGrouping.Chore, 5), effectiveGrouping(TaskGrouping.Character, 8)]).toEqual([
    TaskGrouping.Chore,
    TaskGrouping.Character
  ])
})
it('by chore chosen for a roster now of one falls back to the panel', () => {
  expect(effectiveGrouping(TaskGrouping.Chore, 1)).toEqual(TaskGrouping.Character)
})

/* ---- the warband ---- */

const paragon = {
  factionId: 1,
  name: 'Court',
  level: 25,
  current: 10,
  max: 2500,
  maxed: true,
  paragon: { current: 2400, max: 2500, rewardPending: true }
}
const account = accountTasks(tr, [character('A', { renown: [paragon] })])
it('a paragon reward is an open chore of the warband', () => {
  expect(account.tasks.map((task) => [task.kind, task.state])).toEqual([[TaskKind.Paragon, TaskState.Open]])
})
it('totals sum the panels', () => {
  expect(taskTotals([entry, account])).toEqual({ done: 2, total: 9 })
})

/* ---- every chore is the character's own; the list takes lines off ---- */

const fullConcentration = {
  name: 'Alchemie',
  skillLineId: 2871,
  skill: 100,
  maxSkill: 100,
  concentration: { current: 1000, max: 1000 },
  knowledge: null
}
const whole = (skipped?: string[]) =>
  character('Ganz', {
    ...(skipped ? { skipped } : {}),
    weeklies: [
      { id: 1, label: 'Wochenquest', done: false },
      { id: 2, label: 'Alchemie-Dienste', profession: 2871, done: false },
      { id: 3, label: 'Dritte Quest', done: false }
    ],
    worldBosses: [{ name: 'Weltboss', defeated: false }],
    professions: [fullConcentration],
    gear: [{ slot: 5, itemId: 1, name: 'Brust', itemLevel: 700, enchantId: null, sockets: 1, gems: 0, track: null, quality: 4 }]
  })
const choresOf = (skipped?: string[]) => {
  const rows = list([whole(skipped)])
  return rows.length === 0 ? [] : rows[0].tasks.map((task) => task.id)
}
it("every chore is the character's own", () => {
  expect(choresOf().filter((id) => !id.startsWith('gear'))).toEqual([
    'vault:raid',
    'vault:dungeon',
    'vault:world',
    'weekly:1',
    'weekly:2',
    'weekly:3',
    'boss:Weltboss',
    'profession:2871'
  ])
})
it('a line taken off the list is not a chore', () => {
  expect(choresOf(['vault:raid', 'boss:Weltboss']).filter((id) => id === 'vault:raid' || id.startsWith('boss'))).toEqual([])
})
const crafter = whole(['vault:raid', 'vault:dungeon', 'vault:world', 'weekly:1', 'weekly:3', 'boss:Weltboss', 'gear:enchant', 'gear:socket'])
const crafterSections = taskSections(list([crafter])[0].tasks)
it('the profession quest and the concentration are one section, the professions', () => {
  expect(crafterSections.map((section) => [section.id, section.tasks.map((task) => task.kind)])).toEqual([
    ['professions', ['professionQuest', 'profession']]
  ])
})
it('a profession quest names its profession where it has no figure', () => {
  expect(list([crafter])[0].tasks.find((task) => task.id === 'weekly:2')!.note).toEqual('Alchemie')
})
/** Every vault row taken off: a character with no vault to fill. */
const NO_VAULT = ['vault:raid', 'vault:dungeon', 'vault:world']
const unspent = character('Wissen', {
  skipped: NO_VAULT,
  professions: [{ ...fullConcentration, concentration: { current: 10, max: 1000 }, knowledge: 12 }]
})
it('unspent knowledge is a line of the professions, a bar below the cap is not', () => {
  expect(list([unspent])[0].tasks.map((task) => task.id)).toEqual(['knowledge:2871'])
})
const NOW = RESET_AT + 86400000
const crafts = character('Cooldowns', {
  skipped: NO_VAULT,
  professions: [],
  cooldowns: [
    { recipeId: 1, name: 'Transmutation', readyAt: 0, charges: null, maxCharges: null, seenAt: NOW - 3600000 },
    { recipeId: 2, name: 'Läuft noch', readyAt: NOW + 3600000, charges: null, maxCharges: null, seenAt: NOW - 3600000 },
    { recipeId: 3, name: 'Abgelaufen', readyAt: NOW - 60000, charges: null, maxCharges: null, seenAt: NOW - 3600000 },
    { recipeId: 4, name: 'Ohne Ladung', readyAt: 0, charges: 0, maxCharges: 1, seenAt: NOW - 3600000 }
  ]
})
const craftTasks = tasksByCharacter(tr, [crafts], [], MAX, RESET_AT, undefined, null, null, NOW)[0].tasks
it('a cooldown that ran out is a craft owed; one that runs or has no charge left is not', () => {
  expect(craftTasks.map((task) => task.id)).toEqual(['craft:1', 'craft:3'])
})
it('a craft line names the recipe and sits with the professions', () => {
  expect([craftTasks[0].label, taskSections(craftTasks).map((section) => section.id)]).toEqual([
    'tasks.craft(Transmutation)',
    ['professions']
  ])
})
const crafterGoals = tasksByCharacter(
  tr,
  [crafter],
  [
    { id: 'slots', kind: GoalKind.VaultSlots, target: 3 },
    { id: 'runs', kind: GoalKind.MythicRuns, target: 4 }
  ],
  MAX,
  RESET_AT
)[0]
it('a vault or runs goal is not the goal of a character that took the rows off', () => {
  expect(crafterGoals.row.progress.goals.length).toEqual(0)
})
it('a character that took the raid row off keeps the runs goal, not the raid goal', () => {
  expect([
    tasksByCharacter(tr, [whole(['vault:raid'])], [{ id: 'runs', kind: GoalKind.MythicRuns, target: 4 }], MAX, RESET_AT)[0].row.progress.goals
      .length,
    tasksByCharacter(tr, [whole(['vault:raid'])], [{ id: 'raid', kind: GoalKind.VaultRaid, target: 1 }], MAX, RESET_AT)[0].row.progress.goals
      .length
  ]).toEqual([1, 0])
})

/* ---- the user's own chores ---- */

const custom: CustomTaskState = {
  defs: [
    { id: 'mail', label: 'Post leeren', scope: CustomTaskScope.Character },
    { id: 'ah', label: 'Auktionen', scope: CustomTaskScope.Warband }
  ],
  ticks: { mail: { [main.key]: RESET_AT + 1000, 'realm-zweit': RESET_AT - 1000 }, ah: { warband: RESET_AT + 5 } },
  resetAt: RESET_AT
}
const own = list(roster, [], custom)
const mailOf = (name: string) => own.find((e) => e.character.name === name)!.tasks.find((task) => task.id === 'custom:mail')
it('an own chore is a line of every character, last, with a live box', () => {
  expect([own[0].tasks.at(-1)!.id, own[0].tasks.at(-1)!.manual]).toEqual(['custom:mail', { subject: main.key }])
})
it('a tick this week is done, a tick before the reset is not', () => {
  expect([mailOf('Nyxaria')!.state, mailOf('Zweit')!.state]).toEqual([TaskState.Done, TaskState.Open])
})
it('the own chores are their own section', () => {
  expect(taskSections(own[0].tasks).at(-1)!.id).toEqual('custom')
})
const warband = accountTasks(tr, [], custom)
it('a warband chore is one line of the warband, ticked once', () => {
  expect(warband.tasks.map((task) => [task.id, task.state, task.manual])).toEqual([['custom:ah', TaskState.Done, { subject: 'warband' }]])
})

/* ---- a currency with a weekly cap ---- */

const crest = (earned: number, id = 3008) => ({ id, name: 'Crest', quantity: 40, max: 90, earnedThisWeek: earned, weeklyMax: 20 })
const capped = list([
  character('Cap', {
    currencies: [crest(12), crest(20, 3009), { id: 1, name: 'Gold', quantity: 5, max: null, earnedThisWeek: null, weeklyMax: null }]
  })
])[0]
it('a capped currency is a line with what the week earned of the cap', () => {
  expect(capped.tasks.find((task) => task.id === 'currency:3008')!.note).toEqual('12/20')
})
it('a full cap is done, a currency without a cap is no line', () => {
  expect([capped.tasks.find((task) => task.id === 'currency:3009')!.state, capped.tasks.some((task) => task.id === 'currency:1')]).toEqual([
    TaskState.Done,
    false
  ])
})
it('the caps are a section of their own', () => {
  expect(taskSections(capped.tasks).map((section) => section.id)).toEqual(['vault', 'caps'])
})
it('a cap taken off the list is not a line', () => {
  expect(
    list([character('Craft', { skipped: ['currency:3008'], currencies: [crest(12)] })])[0]?.tasks.some(
      (task) => task.kind === TaskKind.Currency
    ) ?? false
  ).toEqual(false)
})

/* ---- what a vault line pays ---- */

// The client prices a slot once it is unlocked; the next slot of the row
// pays at least that, so the line names it - over the character's level.
const priced = character('Preis', { dungeon: 4, itemLevel: 670 })
priced.itemLevel = 670
priced.vault[1].slots[0].rewardItemLevel = 675
priced.vault[1].slots[1].rewardItemLevel = 678
const [pricedEntry] = list([priced])
it('a vault line says what the slot pays and the gain over the character', () => {
  expect(pricedEntry.tasks.find((task) => task.id === 'vault:dungeon')!.reward).toEqual({ level: 678, gain: 8 })
})
it('a row nobody priced pays nothing the line can name', () => {
  expect(pricedEntry.tasks.find((task) => task.id === 'vault:raid')!.reward).toEqual(null)
})
it('a full row has no slot to pay for', () => {
  expect(list([character('Voll', { dungeon: 8 })])[0].tasks.find((task) => task.id === 'vault:dungeon')!.reward).toEqual(null)
})
it('only a vault line carries a reward', () => {
  expect(pricedEntry.tasks.filter((task) => task.kind !== 'vault').every((task) => task.reward === null)).toEqual(true)
})

/* ---- the minutes, and the quick filter ---- */

const timed = list([
  character('Abend', {
    dungeon: 3,
    vaultRewardWaiting: true,
    weeklies: [
      { id: 1, label: 'Weltboss', done: false },
      { id: 2, label: 'Fertig', done: true }
    ],
    worldBosses: [{ name: 'Boss', defeated: false }],
    professions: [
      { name: 'Alchemie', skillLineId: 2871, skill: 100, maxSkill: 100, concentration: { current: 1000, max: 1000 }, knowledge: null }
    ]
  })
])[0]
const minutesOn = (id: string) => timed.tasks.find((task) => task.id === id)!.minutes
it('the vault reward takes two minutes', () => {
  expect(minutesOn('claim')).toEqual(2)
})
it('a dungeon slot takes its missing dungeons at forty', () => {
  expect(minutesOn('vault:dungeon')).toEqual(40)
})
it('a raid slot takes its missing bosses at fifteen', () => {
  expect(minutesOn('vault:raid')).toEqual(30)
})
it('a weekly quest takes fifteen', () => {
  expect(minutesOn('weekly:1')).toEqual(15)
})
it('a world boss takes ten', () => {
  expect(minutesOn('boss:Boss')).toEqual(10)
})
it('the concentration takes three', () => {
  expect(minutesOn('profession:2871')).toEqual(3)
})
it('the open filter drops the done lines and keeps the rest', () => {
  expect(keepTask({ state: TaskState.Done }, TaskFilter.Open)).toEqual(false)
  expect(keepTask({ state: TaskState.Open }, TaskFilter.Open)).toEqual(true)
  expect(keepTask({ state: TaskState.Done }, TaskFilter.All)).toEqual(true)
})
it('the open filter keeps the open lines of a character', () => {
  const [entry] = list([character('Offen', { dungeon: 3 })])
  expect(filterTasks(entry.tasks, TaskFilter.Open).every((task) => task.state !== TaskState.Done)).toBe(true)
})

/* ---- the supplies ---- */

const bagsWith = (items: BagItem[]): Container => ({ name: null, slots: 100, free: 50, items })
const stocked = list([
  character('Voll', {
    bags: bagsWith([
      { itemId: 241322, name: 'Flask', count: 4, quality: 2 },
      { itemId: 241309, name: 'Potion', count: 40, quality: 2 },
      { itemId: 242275, name: 'Roast', count: 40, quality: 3 },
      { itemId: 241305, name: 'Health', count: 20, quality: 2 },
      { itemId: 241301, name: 'Mana', count: 20, quality: 2 },
      { itemId: 259085, name: 'Rune', count: 5, quality: 2 }
    ])
  })
])[0]
it('a character with everything has no supply errand', () => {
  expect(stocked.tasks.filter((task) => task.kind === TaskKind.Supply)).toEqual([])
})
const shortOf = list([
  character('Leer', {
    bags: bagsWith([
      { itemId: 241309, name: 'Potion', count: 2, quality: 2 },
      { itemId: 242275, name: 'Roast', count: 40, quality: 3 },
      { itemId: 241301, name: 'Mana', count: 20, quality: 2 }
    ]),
    bank: [bagsWith([{ itemId: 241322, name: 'Flask', count: 20, quality: 2 }])]
  })
])[0]
const trip = shortOf.tasks.filter((task) => task.kind === TaskKind.Supply)
it('what runs short is one errand - the trip - with the minutes of a shopping trip', () => {
  expect(trip.map((task) => [task.id, task.note, task.minutes])).toEqual([
    ['supplies', 'supply.flask, supply.potion, supply.healthPotion, supply.rune', 5]
  ])
})
it('the tip is rows under the errand, a group with its figure on each, the bank where it holds some, and the hint as the note', () => {
  const tip = trip[0].tip as ListTip
  expect([tip.heading, tip.rows.map((row) => [row.label, row.value, row.tone]), tip.note]).toEqual([
    'tasks.supplies',
    [
      ['supply.flask', '0/4 · tasks.supplyBank(20)', 'warn'],
      ['supply.potion', '2/40', 'warn'],
      ['supply.healthPotion', '0/20', 'warn'],
      ['supply.rune', '0/5', 'warn']
    ],
    'tasks.suppliesHint'
  ])
})
it('without bags there is no errand: unknown is not none', () => {
  expect(list([character('Blind', {})])[0].tasks.filter((task) => task.kind === TaskKind.Supply)).toEqual([])
})
it('every character wants the same; the errand taken off is no line', () => {
  expect([
    list([character('Keys', { bags: bagsWith([]) })])[0]
      .tasks.filter((task) => task.kind === TaskKind.Supply)
      .map((task) => (task.tip as ListTip).rows.map((row) => `${row.label} ${row.value}`)),
    list([character('Bank', { skipped: ['supplies'], bags: bagsWith([]) })])[0].tasks.filter((task) => task.kind === TaskKind.Supply)
  ]).toEqual([
    [
      [
        'supply.flask 0/4',
        'supply.potion 0/40',
        'supply.food 0/40',
        'supply.healthPotion 0/20',
        'supply.manaPotion 0/20',
        'supply.rune 0/5'
      ]
    ],
    []
  ])
})
it('the own figure wins, and zero takes the line off', () => {
  expect(
    tasksByCharacter(tr, [character('Eigen', { bags: bagsWith([]) })], [], MAX, RESET_AT, undefined, null, {
      flask: 5,
      potion: 0,
      food: 0,
      healthPotion: 0,
      manaPotion: 0,
      rune: 0
    })[0]
      .tasks.filter((task) => task.kind === TaskKind.Supply)
      .map((task) => task.note)
  ).toEqual(['supply.flask'])
})
it('nearly full bags are an errand for a character that plays content, not for a crafter', () => {
  expect([
    list([character('Voll', { bagSpace: { free: 3, total: 132 } })])[0]
      .tasks.filter((task) => task.id === 'bags')
      .map((task) => task.note),
    list([character('Luft', { bagSpace: { free: 40, total: 132 } })])[0].tasks.filter((task) => task.id === 'bags'),
    list([character('Craft', { skipped: ['bags'], bagSpace: { free: 3, total: 132 } })]).flatMap((entry) =>
      entry.tasks.filter((task) => task.id === 'bags')
    )
  ]).toEqual([['tasks.bagsFree(3)'], [], []])
})
it('a supply errand sits in the errands section', () => {
  expect(
    taskSections(shortOf.tasks)
      .find((section) => section.id === 'errands')!
      .tasks.some((task) => task.kind === TaskKind.Supply)
  ).toEqual(true)
})

/* ---- what the player took off (skips.ts) ---- */

const picky = (skipped: string[] | undefined) =>
  character('Nyxaria', {
    dungeon: 8,
    raid: 1,
    weeklies: main.weeklies,
    worldBosses: main.worldBosses,
    professions: main.professions,
    gear: main.gear,
    skipped
  })
const [offRaid] = list([picky(['vault:raid', 'weekly:2', 'gear:enchant'])])
it('a chore taken off is not a line: the vault row, the quest, the gear errand', () => {
  expect(offRaid.tasks.map((task) => task.id)).toEqual(['vault:dungeon', 'vault:world', 'weekly:1', 'boss:Boss', 'profession:171'])
})
it('the count is over the lines left', () => {
  expect([offRaid.done, offRaid.total]).toEqual([2, 5])
})
it('a character with every chore taken off has no panel', () => {
  expect(
    list([picky(['vault:raid', 'vault:dungeon', 'vault:world', 'weekly:1', 'weekly:2', 'boss:Boss', 'profession:171', 'gear:enchant'])])
      .length
  ).toEqual(0)
})

const skips = { 'realm-nyxaria': ['vault:raid', 'weekly:2'] }
const [picked] = pickList(list([picky(undefined)]), skips)
it('the pick list has every line, the ones taken off marked', () => {
  expect(picked.tasks.filter((task) => task.skipped).map((task) => task.id)).toEqual(['vault:raid', 'weekly:2'])
})
it('its count stays the count of the lines kept', () => {
  expect([picked.done, picked.total]).toEqual([2, 6])
})
it('a section counts the lines kept too, and stays for a line taken off alone', () => {
  expect(taskSections(picked.tasks).map((section) => [section.id, section.done, section.total])).toEqual([
    ['vault', 1, 2],
    ['quests', 1, 2],
    ['professions', 0, 1],
    ['errands', 0, 1]
  ])
})
it('a chore across the roster counts the lines kept', () => {
  expect(tasksByChore([picked]).find((chore) => chore.id === 'vault:raid')!.total).toEqual(0)
})
it('a line of a character writes the character, one of the warband the warband', () => {
  expect([skipSubject(picked.tasks[0]), skipSubject({ characterKey: null })]).toEqual(['realm-nyxaria', 'warband'])
})

const pickRow = taskRow(tr, picked.tasks[0], false, true)
it('in the pick mode the box is the choice: unticked for a line taken off, and it takes a hand', () => {
  expect([pickRow.checked, pickRow.takesHand, pickRow.tip]).toEqual([false, true, 'tasks.pick.offHint'])
})
it('a kept line is ticked, whatever its state', () => {
  expect(taskRow(tr, picked.tasks[1], false, true).checked).toEqual(true)
})
it('outside the pick mode the box is the word of the sources', () => {
  expect([taskRow(tr, picked.tasks[1], false).checked, taskRow(tr, picked.tasks[1], false).takesHand]).toEqual([true, false])
})

const warbandOwed = accountTasks(
  tr,
  [
    character('Amt', {
      renown: [
        {
          factionId: 7,
          name: 'Council',
          level: 1,
          maxLevel: 1,
          current: 0,
          max: 0,
          maxed: true,
          paragon: { current: 0, max: 2500, rewardPending: true }
        }
      ]
    })
  ],
  null,
  { warband: ['paragon:7'] }
)
it('a chore of the warband taken off is not a line either', () => {
  expect(warbandOwed.tasks.length).toEqual(0)
})
const warbandPicked = pickAccount(
  accountTasks(
    tr,
    [
      character('Amt', {
        renown: [
          {
            factionId: 7,
            name: 'Council',
            level: 1,
            maxLevel: 1,
            current: 0,
            max: 0,
            maxed: true,
            paragon: { current: 0, max: 2500, rewardPending: true }
          }
        ]
      })
    ],
    null
  ),
  { warband: ['paragon:7'] }
)
it('and stands marked in the pick list, with the count over what is kept', () => {
  expect([warbandPicked.tasks.map((task) => task.skipped), warbandPicked.total]).toEqual([[true], 0])
})
