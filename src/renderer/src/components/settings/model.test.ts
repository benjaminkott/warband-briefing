/**
 * Tests for the settings' quest rows: the catalog's pool is one row that
 * absorbs the quests of it the game gave, and keeps the catalog's name.
 */

import { expect, it } from 'vitest'
import { questChoices } from './model'
import { seasonCatalog } from '../../../../shared/seasonCatalog'
import { questIdsOf } from '../../../../shared/questPool'

const compare = (a: string, b: string): number => a.localeCompare(b)
const pool = seasonCatalog().quests.find((quest) => quest.pool !== undefined)!
const member = pool.pool![pool.pool!.length - 1]

it("the bundled catalog has the season's meta weekly as a pool", () => {
  expect(pool.pool!.length > 1).toBeTruthy()
})

it("a pool's quest the game gave is no row of its own, and names the pool's latest", () => {
  const rows = questChoices([], [], [{ id: member, label: 'Vaults of the week' }], [], compare)
  expect(rows.season.some((row) => row.id === member)).toBe(false)
  expect(rows.others.some((row) => row.id === member)).toBe(false)
  const row = rows.season.find((row) => row.id === pool.id)!
  expect([row.label, row.latest, row.def.pool]).toEqual([pool.label, 'Vaults of the week', pool.pool])
})

it("a pool keeps the catalog's name where the game gave its own id", () => {
  const rows = questChoices([], [{ id: pool.id, label: 'One week of it' }], [], [], compare)
  const row = rows.season.find((row) => row.id === pool.id)!
  expect([row.label, row.latest]).toEqual([pool.label, 'One week of it'])
})

it("a learned weekly with a known member's prefix is the pool's row, not one of its own", () => {
  const learned = [
    { id: member, label: 'Midnight: Vaults of the week' },
    { id: 999_001, label: 'Midnight: Something new' }
  ]
  const rows = questChoices([], [], learned, [], compare)
  expect(rows.season.some((row) => row.id === 999_001)).toBe(false)
  expect(questIdsOf(rows.season.find((row) => row.id === pool.id)!.def)).toContain(999_001)
})

it('a plain quest takes the client title, and nothing is latest', () => {
  const plain = seasonCatalog().quests.find((quest) => quest.pool === undefined)!
  const rows = questChoices([], [{ id: plain.id, label: 'Client title' }], [], [], compare)
  const row = rows.season.find((row) => row.id === plain.id)!
  expect([row.label, row.latest]).toEqual(['Client title', null])
})
