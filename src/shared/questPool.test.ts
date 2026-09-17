/**
 * Tests for the quest pool: a definition stands for every id of its pool,
 * and a lookup answers with the first of them it knows.
 */

import { expect, it } from 'vitest'
import { foldIntoPools, fromPool, inPool, poolDefFor, questIdsOf } from './questPool'

const meta = { id: 93909, label: 'Midnight: Weekly', pool: [93766, 93909, 98232] }
const single = { id: 95520, label: 'Purging the Vaults' }

it('a plain definition stands for its id alone', () => {
  expect(questIdsOf(single)).toEqual([95520])
  expect(inPool(single, 95520)).toBe(true)
  expect(inPool(single, 93909)).toBe(false)
})

it('a pool stands for every id in it, in its order', () => {
  expect(questIdsOf(meta)).toEqual([93766, 93909, 98232])
  expect(inPool(meta, 98232)).toBe(true)
  expect(inPool(meta, 95520)).toBe(false)
})

it("a pool without its own id gets it first: the id is the line's name", () => {
  expect(questIdsOf({ id: 1, pool: [2, 3] })).toEqual([1, 2, 3])
})

it('a lookup answers with the first of the pool it knows, and nothing where it knows none', () => {
  const log = new Map([[98232, "Midnight: Vaults of Atal'Utek"]])
  expect(fromPool(meta, (id) => log.get(id))).toBe("Midnight: Vaults of Atal'Utek")
  expect(fromPool(single, (id) => log.get(id))).toBe(undefined)
})

it('a stored list names the pool that holds an id, and none for a plain quest', () => {
  expect(poolDefFor([single, meta], 93766)).toBe(meta)
  expect(poolDefFor([single, meta], 95520)).toBe(undefined)
})

it("a list of the pool's quests one by one folds into the pool's line, in the first one's place", () => {
  const watched = [
    { id: 93909, label: 'Midnight: Delves' },
    { id: 95520, label: 'Purging the Vaults' },
    { id: 93766, label: 'Midnight: World Quests' }
  ]
  expect(foldIntoPools(watched, [meta])).toEqual([meta, single])
})

it('a list with the pool already, or with none of its quests, is left as it is', () => {
  expect(foldIntoPools([meta, single], [meta])).toEqual([meta, single])
  expect(foldIntoPools([single], [meta])).toEqual([single])
})
