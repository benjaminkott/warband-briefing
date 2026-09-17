/**
 * Tests for the gear check: what it makes of a set of worn items.
 */

import { expect, it } from 'vitest'
import { checkGear, ENCHANT_SLOTS } from './gear'
import type { GearItem } from '../../../shared/types'

const item = (slot: number, extra: Partial<GearItem> = {}): GearItem => ({
  slot,
  itemId: 1000 + slot,
  name: `Item ${slot}`,
  itemLevel: null,
  enchantId: 0,
  sockets: null,
  gems: 0,
  track: null,
  quality: 4,
  ...extra
})

it('nothing reported means nothing known', () => {
  expect(checkGear({ gear: [] }).known).toEqual(false)
})
const linkOnly = checkGear({
  gear: [item(1), item(5, { enchantId: 7000 }), item(7), item(15, { enchantId: 7001 }), item(16)]
})
it('bare enchantable slots listed', () => {
  expect(linkOnly.missingEnchants.map((g) => g.slot)).toEqual([7, 16])
})
it('the head takes no enchant', () => {
  expect(ENCHANT_SLOTS.includes(1)).toEqual(false)
})
it('sockets unknown from links alone', () => {
  expect([linkOnly.socketsKnown, linkOnly.emptySockets.length]).toEqual([false, 0])
})
it('no weakest slot without item levels', () => {
  expect(linkOnly.weakest).toEqual(null)
})

const full = checkGear({
  gear: [1, 2, 3, 5, 6, 7, 8, 9, 10].map((slot) =>
    item(slot, {
      enchantId: 7000,
      itemLevel: slot === 6 ? 640 : 680,
      sockets: slot === 2 ? 2 : 0,
      gems: slot === 2 ? 1 : 0
    })
  )
})
it('an empty socket is found', () => {
  expect(full.emptySockets.map((g) => g.slot)).toEqual([2])
})
it('the weakest slot named once enough levels are known', () => {
  expect(full.weakest!.slot).toEqual(6)
})
it('issues counted', () => {
  expect(full.issues).toEqual(1)
})
