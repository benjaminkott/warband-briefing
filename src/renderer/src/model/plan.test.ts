/**
 * Tests for the plan: how a vault slot is priced, which slot the plan picks,
 * and in which order it puts two characters.
 */

import { expect, it } from 'vitest'
import { bestGap, compareValue, eveningPlan, gapDetail, nextStep, planMinutes, priceVaultRow, reasonText } from './plan'
import type { PlanRow } from './plan'
import type { GoalProgress, WeeklyProgress } from './overview'
import { keysTranslator } from '../../../shared/i18n/testing'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { GoalKind } from '../../../shared/enums/goalKind'
import { StepTone } from '../enums/stepTone'
import type { DungeonBest, VaultRow } from '../../../shared/types'
import { snapshot, vaultRow } from '../../../shared/testing'

const tr = keysTranslator()

/* ---- pricing one row ---- */

const dungeons = vaultRow(VaultCategory.Dungeon, [1, 4, 8], 3, [710])
const priced = priceVaultRow(dungeons, 698)!
it('the next slot and what it takes', () => {
  expect([priced.slot, priced.slots, priced.missing]).toEqual([2, 3, 1])
})
it('a locked slot inherits the reward the row already pays', () => {
  expect(priced.rewardItemLevel).toEqual(710)
})
it('the gain is the reward over the character', () => {
  expect(priced.gain).toEqual(12)
})
it('no item level, no gain', () => {
  expect(priceVaultRow(dungeons, null)!.gain).toEqual(null)
})
it('no priced slot, no reward', () => {
  expect(priceVaultRow(vaultRow(VaultCategory.Raid, [2, 4, 6], 0), 698)!.rewardItemLevel).toEqual(null)
})
it('a full row has no gap', () => {
  expect(priceVaultRow(vaultRow(VaultCategory.World, [2, 4, 8], 8), 698)).toEqual(null)
})

// A row already past its threshold but not flagged unlocked still needs one
// more of whatever it counts, never zero.
const stuck = vaultRow(VaultCategory.Dungeon, [1, 4, 8], 0)
stuck.slots[0] = { ...stuck.slots[0], progress: 5, unlocked: false }
it('a step is never zero away', () => {
  expect(priceVaultRow(stuck, null)!.missing).toEqual(1)
})

/* ---- the order of the plan ---- */

it('more gain first', () => {
  expect(compareValue({ gain: 12, cost: 4 }, { gain: 3, cost: 1 }) < 0).toEqual(true)
})
it('same gain: fewer actions first', () => {
  expect(compareValue({ gain: 3, cost: 1 }, { gain: 3, cost: 4 }) < 0).toEqual(true)
})
it('unpriced counts as nothing, below a known gain', () => {
  expect(compareValue({ gain: null, cost: 1 }, { gain: 1, cost: 8 }) > 0).toEqual(true)
})
it('unpriced counts as nothing, above a loss', () => {
  expect(compareValue({ gain: null, cost: 8 }, { gain: -5, cost: 1 }) < 0).toEqual(true)
})

/* ---- which slot the plan picks ---- */

// Without prices the cheapest slot wins: one dungeon beats two bosses.
const unpriced = [
  vaultRow(VaultCategory.Raid, [2, 4, 6], 0),
  vaultRow(VaultCategory.Dungeon, [1, 4, 8], 3),
  vaultRow(VaultCategory.World, [2, 4, 8], 0)
]
it('unpriced: the cheapest row', () => {
  expect(bestGap(unpriced, 698)!.category).toEqual(VaultCategory.Dungeon)
})

// With prices the pay-out wins: two bosses for +25 beat one dungeon for +12.
const priced2 = [
  vaultRow(VaultCategory.Raid, [2, 4, 6], 2, [723]),
  vaultRow(VaultCategory.Dungeon, [1, 4, 8], 3, [710]),
  vaultRow(VaultCategory.World, [2, 4, 8], 0)
]
it('priced: the biggest gain', () => {
  expect(bestGap(priced2, 698)!.category).toEqual(VaultCategory.Raid)
})
it('a full vault has no gap', () => {
  expect(bestGap([vaultRow(VaultCategory.Raid, [2, 4, 6], 6), vaultRow(VaultCategory.Dungeon, [1, 4, 8], 8)], 698)).toEqual(null)
})

/* ---- the key to run: `keyToRun` itself is under dungeons.test.ts ---- */

const best = (name: string, level: number, inTime: boolean): DungeonBest => ({
  mapChallengeModeId: name.length,
  name,
  level,
  inTime,
  score: 0,
  durationSec: null
})

/* ---- the reason line ---- */

it('the detail names the row, the slot and the pay-out', () => {
  expect(gapDetail(priced, tr)).toEqual('vault.dungeon · tasks.vaultSlot(2,3) · dash.steps.gain(710,12)')
})
it('a reward below the character is named, without a gain', () => {
  expect(gapDetail(priceVaultRow(vaultRow(VaultCategory.World, [2, 4, 8], 0, [680]), 698)!, tr)).toEqual(
    'vault.world · tasks.vaultSlot(1,3) · dash.steps.reward(680)'
  )
})
it('a reward equal to the character is named as the reward', () => {
  expect(gapDetail(priceVaultRow(vaultRow(VaultCategory.World, [2, 4, 8], 2, [698]), 698)!, tr)).toEqual(
    'vault.world · tasks.vaultSlot(2,3) · dash.steps.reward(698)'
  )
})

/* ---- the step's reason ---- */

// A character on the dungeon row with two bests: the step names the weaker key.
/** The fields of the week the step reads. */
const week = (fields: Partial<WeeklyProgress>) => fields as WeeklyProgress

const runner = snapshot('Runner', {
  level: 90,
  itemLevel: 698,
  stale: false,
  vaultRewardWaiting: false,
  vault: [dungeons],
  dungeonBests: [best('Ara-Kara', 12, true), best('Grim Batol', 9, true)]
})
const runnerStep = nextStep(runner, week({ vaultRows: [dungeons], openWeeklies: 0, gearIssues: 0, goals: [] }), false, tr)
it('the reason carries the slot, its note, the reward and the key in parts', () => {
  expect([runnerStep.reason!.slot, runnerStep.reason!.note, runnerStep.reason!.reward, runnerStep.reason!.key!.dungeon.name]).toEqual([
    'vault.dungeon · tasks.vaultSlot(2,3)',
    'tasks.vaultSlot(2,3)',
    { level: 710, gain: 12 },
    'Grim Batol'
  ])
})
// With the season's list the step names the dungeon never run before the weaker key.
const rookery = { mapChallengeModeId: 3, name: 'The Rookery' }
const unrunStep = nextStep(runner, week({ vaultRows: [dungeons], openWeeklies: 0, gearIssues: 0, goals: [] }), false, tr, undefined, [
  rookery
])
it('a dungeon of the season never run is the key to run', () => {
  expect(unrunStep.reason!.key).toEqual({ dungeon: rookery, best: null })
})
it('the detail says the dungeon is not run yet', () => {
  expect(unrunStep.detail).toEqual('vault.dungeon · tasks.vaultSlot(2,3) · dash.steps.gain(710,12) · dash.steps.unrun(The Rookery)')
})
it('the detail is the reason in one sentence', () => {
  expect(runnerStep.detail).toEqual('vault.dungeon · tasks.vaultSlot(2,3) · dash.steps.gain(710,12) · dash.steps.key(Grim Batol,9)')
})
it('the sentence is made of the parts', () => {
  expect(reasonText(runnerStep.reason!, tr)).toEqual(runnerStep.detail)
})
it('a step without a vault slot has no reason', () => {
  expect(
    nextStep({ ...runner, dungeonBests: [] }, week({ vaultRows: [], openWeeklies: 1, gearIssues: 0, goals: [] }), false, tr).reason
  ).toEqual(null)
})

/* ---- the evening ---- */

// A roster row as the plan reads it: the character, its week, whether it levels.
const planRow = (
  name: string,
  options: {
    levelling?: boolean
    stale?: boolean
    unclaimed?: boolean
    vault?: VaultRow[]
    weeklies?: number
    goals?: GoalProgress[]
  } = {}
): PlanRow => ({
  levelling: options.levelling ?? false,
  dungeons: [],
  character: snapshot(name, {
    level: 90,
    itemLevel: 698,
    stale: options.stale ?? false,
    vaultRewardWaiting: options.unclaimed ?? false,
    vault: options.vault ?? [],
    dungeonBests: []
  }),
  progress: week({
    vaultRows: options.vault ?? [],
    openWeeklies: options.weeklies ?? 0,
    gearIssues: 0,
    goals: options.goals ?? []
  })
})
const open = [vaultRow(VaultCategory.Dungeon, [1, 4, 8], 3, [710])]
const evening = eveningPlan(
  [
    planRow('Owed', { unclaimed: true }),
    planRow('Levels', { levelling: true, vault: open }),
    planRow('Old', { stale: true, vault: open }),
    planRow('Keys', { vault: open }),
    planRow('Quests', { weeklies: 2 }),
    planRow('Done', {}),
    planRow('More', { vault: open })
  ],
  tr
)
it('what fits into the default evening, in the order given; levelling, stale and done skipped', () => {
  expect(evening.map((entry) => [entry.character.name, entry.step.tone])).toEqual([
    ['Owed', StepTone.Claim],
    ['Keys', StepTone.Open],
    ['Quests', StepTone.Open]
  ])
})
it('each step has its minutes: the vault, a dungeon, two quests', () => {
  expect(evening.map((entry) => entry.step.minutes)).toEqual([2, 40, 30])
})
it('the plan takes the sum', () => {
  expect(planMinutes(evening)).toEqual(72)
})
it('a shorter evening passes a key over for the quests that fit, then names the key as what comes after', () => {
  expect(
    eveningPlan([planRow('Keys', { vault: open }), planRow('Quests', { weeklies: 2 })], tr, undefined, 35).map((entry) => [
      entry.character.name,
      entry.fits
    ])
  ).toEqual([
    ['Quests', true],
    ['Keys', false]
  ])
})
it('a character whose best slot is too long is asked for the slot that fits', () => {
  expect(
    eveningPlan(
      [
        planRow('Both', {
          vault: [vaultRow(VaultCategory.Dungeon, [1, 4, 8], 4, [720]), vaultRow(VaultCategory.Raid, [2, 4, 6], 0, [700])]
        })
      ],
      tr,
      undefined,
      60
    ).map((entry) => [entry.step.reason!.slot, entry.step.minutes, entry.fits])
  ).toEqual([['vault.raid · tasks.vaultSlot(1,3)', 30, true]])
})
it('when nothing fits, the steps stand as what comes after, three at most', () => {
  expect(
    eveningPlan(
      ['A', 'B', 'C', 'D'].map((name) => planRow(name, { vault: open })),
      tr,
      undefined,
      10
    ).map((entry) => [entry.character.name, entry.fits])
  ).toEqual([
    ['A', false],
    ['B', false],
    ['C', false]
  ])
})
/* ---- the goals are the finish line ---- */

const met: GoalProgress[] = [{ goal: { id: 'vaultSlots-3', kind: GoalKind.VaultSlots, target: 3 }, current: 3, done: true }]
it('a character whose goals are met is not asked for another slot: the week is done', () => {
  expect(
    nextStep(planRow('Met', { vault: open, goals: met }).character, planRow('Met', { vault: open, goals: met }).progress, false, tr).tone
  ).toEqual(StepTone.Done)
})
it('with the goals met an open weekly is still the step', () => {
  expect(
    nextStep(
      planRow('Met', { vault: open, goals: met, weeklies: 1 }).character,
      planRow('Met', { vault: open, goals: met, weeklies: 1 }).progress,
      false,
      tr
    ).text
  ).toEqual('dash.steps.weekly(1)')
})
it('a goal still open keeps the slot on the plan', () => {
  expect(
    eveningPlan(
      [planRow('Met', { vault: open, goals: met }), planRow('Short', { vault: open, goals: [{ ...met[0], current: 2, done: false }] })],
      tr
    ).map((entry) => entry.character.name)
  ).toEqual(['Short'])
})
it('the sum counts only what fits', () => {
  expect(planMinutes(eveningPlan([planRow('Keys', { vault: open }), planRow('Quests', { weeklies: 2 })], tr, undefined, 35))).toEqual(30)
})
it('a long evening lists at most five', () => {
  expect(
    eveningPlan(
      ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => planRow(name, { weeklies: 1 })),
      tr,
      undefined,
      600
    ).length
  ).toEqual(5)
})
it('an empty roster is an empty evening', () => {
  expect(eveningPlan([], tr)).toEqual([])
})
