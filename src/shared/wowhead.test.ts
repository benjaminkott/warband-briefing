/**
 * Tests for the Wowhead parameters of an item link: the id, the enchant,
 * the gems, the level and the bonus ids come out of the link in the form
 * Wowhead's tooltip script reads; an id alone stands in for a link that
 * is not there.
 */

import { expect, it } from 'vitest'
import { wowheadItemParams } from './wowhead'

it('a worn piece: enchant, gems, level and bonus ids', () => {
  const link =
    '|cffa335ee|Hitem:212000:7402:213743:213746:::::90:70::13:5:1234:5678:9012:3456:7890:1:28:2756|h[Crown of Consuming Radiance]|h|r'
  expect(wowheadItemParams(link)).toBe('item=212000&ench=7402&gems=213743:213746&lvl=90&spec=70&bonus=1234:5678:9012:3456:7890')
})

it('a plain stack: the id, the level and the spec', () => {
  expect(wowheadItemParams('|cnIQ3:|Hitem:7001::::::::90:70|h[Fläschchen]|h|r')).toBe('item=7001&lvl=90&spec=70')
})

it('no link, an id: the id alone; no id: nothing', () => {
  expect(wowheadItemParams(null, 274374)).toBe('item=274374')
  expect(wowheadItemParams('', 274374)).toBe('item=274374')
  expect(wowheadItemParams(null)).toBe(null)
  expect(wowheadItemParams('|Hcurrency:3008|h[Valorstones]|h')).toBe(null)
})
