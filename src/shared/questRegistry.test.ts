/**
 * Tests for the season weeklies learned from the game: which registered
 * quest is a weekly, which is the season's, and how two registers merge.
 *
 */

import { expect, it } from 'vitest'
import { isWeekly, seasonWeeklies, isOffered, seenThisWeek, mergeRegistries, questProfession } from './questRegistry'
import type { RegisteredQuest } from './questRegistry'
import { QuestReset } from './enums/questReset'

const quest = (id: number, patch: Partial<RegisteredQuest> = {}): RegisteredQuest => ({
  id,
  title: `Quest ${id}`,
  frequency: 'Default',
  classification: 'Normal',
  expansion: 11,
  profession: null,
  account: false,
  hidden: false,
  resets: null,
  seenAt: 1_000,
  doneAt: null,
  ...patch
})

/* ---- what is a weekly ---- */

it('the weekly flag makes a weekly', () => {
  expect(isWeekly(quest(1, { frequency: 'Weekly' }))).toEqual(true)
})
it('a quest a schedule resets is a weekly', () => {
  expect(isWeekly(quest(2, { frequency: 'ResetByScheduler', classification: 'Meta' }))).toEqual(true)
})
it('a meta quest with no reset is not', () => {
  expect(isWeekly(quest(6, { classification: 'Meta' }))).toEqual(false)
})
it('a quest seen to clear across a reset is a weekly', () => {
  expect(isWeekly(quest(3, { resets: QuestReset.Weekly }))).toEqual(true)
})
it('a daily is not', () => {
  expect(isWeekly(quest(4, { frequency: 'Daily', classification: 'Recurring' }))).toEqual(false)
})
it('a level quest is not', () => {
  expect(isWeekly(quest(5))).toEqual(false)
})

/* ---- the season's weeklies ---- */

const registry = {
  expansion: 11,
  quests: [
    quest(10, { frequency: 'Weekly', title: 'Midnight: Delves', doneAt: 5_000 }),
    quest(11, { frequency: 'ResetByScheduler', classification: 'Meta', title: 'Midnight: Dungeons', seenAt: 3_000 }),
    quest(12, { frequency: 'Weekly', title: 'Alchemy Services', profession: 171, seenAt: 2_000 }),
    quest(13, { frequency: 'Weekly', title: 'Last Season', expansion: 10 }),
    quest(14, { frequency: 'Weekly', title: '', hidden: true }),
    quest(15, { frequency: 'Weekly', title: 'Ohne Ausdehnung', expansion: null }),
    quest(16, { title: 'Levelquest' })
  ]
}
const weeklies = seasonWeeklies(registry)
it('the season weeklies are the current weeklies a player can see', () => {
  expect(weeklies.map((q) => q.id)).toEqual([10, 11, 12])
})
it('the last turn-in first, then the last log, then the id', () => {
  expect(weeklies.map((q) => q.label)).toEqual(['Midnight: Delves', 'Midnight: Dungeons', 'Alchemy Services'])
})
it('the profession comes from the tag, for a quest or a pool', () => {
  expect([questProfession(registry, [12]), questProfession(registry, [10, 12]), questProfession(registry, [10]), questProfession(registry, [99])]).toEqual([
    171, 171, null, null
  ])
})
it('without the expansion nothing is the season', () => {
  expect(seasonWeeklies({ ...registry, expansion: null })).toEqual([])
})

/* ---- what a source saw that the settings can offer ---- */

it('a seen weekly of the season is offered', () => {
  expect(isOffered(registry, 10)).toEqual(true)
})
it("last season's weekly is not", () => {
  expect(isOffered(registry, 13)).toEqual(false)
})
it('a hidden tracking quest is not', () => {
  expect(isOffered(registry, 14)).toEqual(false)
})
it('a quest without an expansion is', () => {
  expect(isOffered(registry, 15)).toEqual(true)
})
it('a quest the register does not know is', () => {
  expect(isOffered(registry, 99)).toEqual(true)
})

/* ---- what the board holds this week ---- */

it('a quest a log showed since the reset is offered', () => {
  expect(seenThisWeek(registry, 11, 2_500)).toEqual(true)
})
it('a quest turned in since the reset is offered, whatever the log', () => {
  expect(seenThisWeek({ ...registry, quests: [quest(20, { seenAt: 100, doneAt: 3_000 })] }, 20, 2_500)).toEqual(true)
})
it('a quest last seen before the reset is not', () => {
  expect(seenThisWeek(registry, 12, 2_500)).toEqual(false)
})
it('a quest the register does not know: nobody looked', () => {
  expect(seenThisWeek(registry, 99, 2_500)).toEqual(null)
})
it('without the expansion the register cannot tell seasons apart', () => {
  expect(isOffered({ ...registry, expansion: null }, 13)).toEqual(true)
})

/* ---- merging ---- */

const merged = mergeRegistries([
  { expansion: 10, quests: [quest(20, { title: 'Alt', seenAt: 1_000, resets: QuestReset.Weekly }), quest(21, { doneAt: 7_000 })] },
  { expansion: 11, quests: [quest(20, { title: 'Neu', seenAt: 2_000 }), quest(21, { seenAt: 500 })] }
])
it("the newest expansion is the register's", () => {
  expect(merged.expansion).toEqual(11)
})
it('the record seen last wins', () => {
  expect(merged.quests.find((q) => q.id === 20)!.title).toEqual('Neu')
})
it('a learned reset survives the older record', () => {
  expect(merged.quests.find((q) => q.id === 20)!.resets).toEqual(QuestReset.Weekly)
})
it('the last turn-in survives from either side', () => {
  expect(merged.quests.find((q) => q.id === 21)!.doneAt).toEqual(7_000)
})
it('the empty list merges to nothing', () => {
  expect(mergeRegistries([])).toEqual({ expansion: null, quests: [] })
})

/* ---- report ---- */
