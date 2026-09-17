/**
 * Tests for the character table's cells: the tooltips a cell folds its
 * lines into, worked out without a DOM.
 */

import { expect, it } from 'vitest'
import { raidTip } from './model'
import { keysTranslator } from '../../../../shared/i18n/testing'
import type { InstanceLockout } from '../../../../shared/types'
const tr = keysTranslator()

const lockout = (name: string, isRaid: boolean, defeated: number, total: number, difficultyId = 15): InstanceLockout => ({
  name,
  isRaid,
  defeated,
  total,
  difficultyId,
  difficulty: '',
  maxPlayers: null,
  bosses: [],
  resetsAt: null
})

it("the raid cell lists the week's raid lockouts with their kills, the cleared one green, the dungeon left out", () => {
  const tip = raidTip(tr, {
    lockouts: [lockout('Undermine', true, 8, 8), lockout('Nerub-ar', true, 2, 8, 14), lockout('Theater', false, 4, 4)]
  })!
  expect(tip.heading).toBe('table.raidsHint(10,16)')
  expect(tip.rows.map((row) => [row.label, row.value, row.tone])).toEqual([
    ['Undermine · difficulty.short.heroic', '8/8', 'ok'],
    ['Nerub-ar · difficulty.short.normal', '2/8', 'warn']
  ])
})

it('an unknown total shows the kills alone, in the heading and on the row', () => {
  const tip = raidTip(tr, { lockouts: [lockout('Undermine', true, 4, 0)] })!
  expect(tip.heading).toBe('table.raids')
  expect(tip.rows.map((row) => row.value)).toEqual(['4'])
})

it('without a raid lockout there is no tip', () => {
  expect(raidTip(tr, { lockouts: [lockout('Theater', false, 4, 4)] })).toBe(null)
})
