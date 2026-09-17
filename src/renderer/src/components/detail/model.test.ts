/**
 * Tests for the raid rows of the character page: one row per raid, newest
 * first, a cell per difficulty with the bosses down on it.
 *
 */

import { expect, it } from 'vitest'
import { RAID_DIFFICULTIES, raidCellTip, raidRows } from './model'
import { keysTranslator } from '../../../../shared/i18n/testing'
import type { RaidBoss } from '../../../../shared/types'

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
