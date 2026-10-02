/**
 * Tests for the raid rows of the character page: one row per raid, newest
 * first, a cell per difficulty with the bosses down on it. Then the lines
 * of the overview's panels.
 *
 */

import { expect, it } from 'vitest'
import {
  RAID_DIFFICULTIES,
  SUMMARY_TASKS,
  gearLines,
  keyLines,
  nextUpgrade,
  raidCellTip,
  raidRows,
  resourceLines,
  taskLines,
  trackStep
} from './model'
import { keysTranslator } from '../../../../shared/i18n/testing'
import type { GearItem, RaidBoss } from '../../../../shared/types'
import { snapshot } from '../../../../shared/testing'
import { DISPLAY_DEFAULTS } from '../../../../shared/display'
import type { Task } from '../../model/tasks'
import { TaskKind } from '../../enums/taskKind'
import { TaskState } from '../../enums/taskState'
import { Severity } from '../../enums/severity'

const boss = (id: number, name: string, kills: Record<number, number> = {}): RaidBoss => ({ id, name, kills })
const old = { id: 1, name: 'Old', bosses: [boss(1, 'A'), boss(2, 'B')] }
const current = {
  id: 2,
  name: 'Current',
  bosses: [boss(3, 'C', { 14: 2, 15: 1 }), boss(4, 'D', { 14: 1 }), boss(5, 'E')]
}

it('the difficulties run easiest first: LFR, normal, heroic, mythic', () => {
  expect(RAID_DIFFICULTIES).toEqual([17, 14, 15, 16])
})

it('the newest raid of the tier comes first', () => {
  expect(raidRows([old, current]).map((row) => row.raid.name)).toEqual(['Current', 'Old'])
})

it('a cell counts the bosses with a kill on its difficulty, out of all bosses', () => {
  const [row] = raidRows([current])
  expect(row.cells.map((cell) => [cell.difficultyId, cell.killed, cell.total])).toEqual([
    [17, 0, 3],
    [14, 2, 3],
    [15, 1, 3],
    [16, 0, 3]
  ])
  expect(row.started).toBe(true)
})

it('the cell names every boss with its kills, the open ones with zero', () => {
  const [row] = raidRows([current])
  const heroic = row.cells.find((cell) => cell.difficultyId === 15)!
  expect(heroic.bosses).toEqual([
    { name: 'C', kills: 1 },
    { name: 'D', kills: 0 },
    { name: 'E', kills: 0 }
  ])
})

it('a raid nobody entered is there, quiet', () => {
  const [, row] = raidRows([old, current])
  expect(row.started).toBe(false)
  expect(row.cells.every((cell) => cell.killed === 0 && cell.total === 2)).toBeTruthy()
})

it('the tip of a cell heads with the difficulty and the count, a boss on each row, its kills green and open amber', () => {
  const tr = keysTranslator()
  const [row] = raidRows([current])
  const tip = raidCellTip(
    tr,
    row.cells.find((cell) => cell.difficultyId === 15)!
  )
  expect(tip.heading).toBe('detail.raids.tipHeading(difficulty.heroic,1,3)')
  expect(tip.rows.map((each) => [each.label, each.value, each.tone])).toEqual([
    ['C', 'detail.raids.kills(1)', 'ok'],
    ['D', 'detail.raids.open', 'warn'],
    ['E', 'detail.raids.open', 'warn']
  ])
})

it('no raids, no rows', () => {
  expect(raidRows([])).toEqual([])
})

const item = (slot: number, fields: Partial<GearItem> = {}): GearItem => ({
  slot,
  itemId: slot,
  name: `Item ${slot}`,
  itemLevel: 640,
  enchantId: null,
  sockets: null,
  gems: 0,
  track: null,
  quality: 4,
  ...fields
})

/** A task with the fields the overview reads; the rest does not matter to it. */
const task = (label: string, state: TaskState, kind: TaskKind = TaskKind.Weekly): Task =>
  ({ key: label, id: label, kind, icon: 'tasks', label, note: null, state, tip: null, skipped: false }) as unknown as Task

it('the step of a track is read from the end of the tooltip text', () => {
  expect(trackStep('Champion 4/8')).toEqual({ step: 4, max: 8 })
  expect(trackStep('Mythic 6 / 6')).toEqual({ step: 6, max: 6 })
  expect(trackStep(null)).toBeNull()
  expect(trackStep('Crafted')).toBeNull()
})

it('the next upgrade is the lowest item with steps left, a full track is no upgrade', () => {
  const gear = [
    item(1, { itemLevel: 630, track: 'Hero 6/6' }),
    item(5, { itemLevel: 636, track: 'Hero 2/6' }),
    item(7, { itemLevel: 642, track: 'Hero 4/6' })
  ]
  expect(nextUpgrade(gear)?.slot).toBe(5)
  expect(nextUpgrade([item(1, { track: 'Hero 6/6' })])).toBeNull()
})

it('the gear lines name the bare slots in the warning tone and say so when nothing is open', () => {
  const tr = keysTranslator()
  const bare = snapshot('Nyx', { gear: [item(5, { enchantId: 0 }), item(1, { enchantId: null })] })
  expect(gearLines(tr, bare, DISPLAY_DEFAULTS)[0]).toMatchObject({ label: 'gear.row.enchant', tone: Severity.Warn })
  const fine = snapshot('Nyx', { gear: [item(5, { enchantId: 7 })] })
  expect(gearLines(tr, fine, DISPLAY_DEFAULTS).map((line) => line.label)).toEqual(['detail.overview.gearDone'])
  expect(gearLines(tr, snapshot('Nyx'), DISPLAY_DEFAULTS)).toEqual([])
})

it('the key lines name the dungeon never run, then a line for each raid difficulty with a kill', () => {
  const tr = keysTranslator()
  const character = snapshot('Nyx', { raidProgress: [current] })
  const lines = keyLines(tr, character, [{ mapChallengeModeId: 9, name: 'Dawnbreaker' }])
  expect(lines.map((line) => line.value)).toEqual(['Dawnbreaker · detail.overview.unrun', '2/3', '1/3'])
})

it('a raid nobody entered is one quiet line', () => {
  const lines = keyLines(keysTranslator(), snapshot('Nyx', { raidProgress: [old] }), [])
  expect(lines).toEqual([{ icon: 'raid', label: 'Old', value: 'detail.overview.raidNone', tone: Severity.Info }])
})

it('the resources list only the watched currencies, and a reached weekly cap in the done tone', () => {
  const tr = keysTranslator()
  const character = snapshot('Nyx', {
    currencies: [
      { id: 1, name: 'Crest', quantity: 90, max: null, earnedThisWeek: 90, weeklyMax: 90 },
      { id: 2, name: 'Other', quantity: 5, max: null, earnedThisWeek: null, weeklyMax: null }
    ]
  })
  expect(resourceLines(tr, character, new Set([1]), {})).toEqual([
    { icon: 'coins', label: 'Crest', value: '90 · detail.overview.week(90,90)', tone: Severity.Ok }
  ])
})

it('a profession with full concentration or open knowledge is in the warning tone', () => {
  const character = snapshot('Nyx', {
    professions: [
      { name: 'Alchemy', skillLineId: 1, skill: 100, maxSkill: 100, concentration: { current: 1000, max: 1000 }, knowledge: null },
      { name: 'Herbalism', skillLineId: 2, skill: 100, maxSkill: 100, concentration: null, knowledge: null }
    ]
  })
  const lines = resourceLines(keysTranslator(), character, new Set(), {})
  expect(lines.map((line) => [line.label, line.tone])).toEqual([['Alchemy', Severity.Warn]])
})

it('the week lists the first open tasks without the vault rows, and counts the rest', () => {
  const tasks = [
    task('vault', TaskState.Open, TaskKind.Vault),
    task('done', TaskState.Done),
    ...Array.from({ length: SUMMARY_TASKS + 2 }, (_, index) => task(`open ${index}`, TaskState.Open))
  ]
  const lines = taskLines(keysTranslator(), tasks)
  expect(lines).toHaveLength(SUMMARY_TASKS + 1)
  expect(lines[0]!.label).toBe('open 0')
  expect(lines.at(-1)!.label).toBe('detail.overview.moreTasks(2)')
})
