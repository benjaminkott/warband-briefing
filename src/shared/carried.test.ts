/**
 * Tests for the carried chores: a map in the bags is a delve owed, a
 * threshold of shards a key to restore; the bank counts, no bags count as
 * unknown.
 */

import { expect, it } from 'vitest'
import { carriedStock, owedCarried, seasonCarried } from './carried'
import type { BagItem, Container } from './types'

const map = { id: 'map', name: 'Bounty', itemIds: [274374] }
const shards = { id: 'shards', name: 'Shards', itemIds: [245653], atLeast: 100, minutes: 2 }
const container = (name: string | null, items: BagItem[]): Container => ({ name, slots: 10, free: 5, items })
const item = (itemId: number, count: number, name = ''): BagItem => ({ itemId, name, count, quality: null })

it('the bundled catalog names at least the map', () => {
  const groups = seasonCarried()
  expect(groups.length >= 1).toBeTruthy()
  expect(groups.every((group) => group.itemIds.length > 0)).toBeTruthy()
})

it('no bags read as unknown, not as nothing owed', () => {
  expect(carriedStock({ bags: null, bank: [] }, [map])).toBe(null)
  expect(owedCarried({ bags: null, bank: [] }, [map])).toEqual([])
})

it('one map in the bags is a chore, none is no line', () => {
  const owed = owedCarried({ bags: container(null, [item(274374, 1)]), bank: [] }, [map])
  expect(owed.length).toBe(1)
  expect(owed[0].inBags).toBe(1)
  expect(owedCarried({ bags: container(null, []), bank: [] }, [map])).toEqual([])
})

it('the bank counts too, and the stock says where', () => {
  const stock = carriedStock({ bags: container(null, []), bank: [container('Tab 1', [item(274374, 1)])] }, [map])!
  expect(stock[0].inBags).toBe(0)
  expect(stock[0].inBank).toBe(1)
  expect(stock[0].owed).toBe(true)
})

it('a threshold group is owed only from its count on', () => {
  const some = carriedStock({ bags: container(null, [item(245653, 60)]), bank: [container('Tab 1', [item(245653, 30)])] }, [shards])!
  expect(some[0].owed).toBe(false)
  const enough = carriedStock({ bags: container(null, [item(245653, 60)]), bank: [container('Tab 1', [item(245653, 40)])] }, [shards])!
  expect(enough[0].owed).toBe(true)
})

it("the line takes the name the bag gives the item, else the catalog's", () => {
  const named = carriedStock({ bags: container(null, [item(274374, 1, 'Kopfgeld des Schatzjägers')]), bank: [] }, [map])!
  expect(named[0].name).toBe('Kopfgeld des Schatzjägers')
  const unnamed = carriedStock({ bags: container(null, [item(274374, 1)]), bank: [] }, [map])!
  expect(unnamed[0].name).toBe('Bounty')
})
