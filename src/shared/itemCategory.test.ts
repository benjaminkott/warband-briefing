/**
 * Tests for the item groups: a class code becomes the game's class, an
 * unknown code stays unknown, and containers get their items' groups
 * from the lexicon.
 */

import { expect, it } from 'vitest'
import { categoryOf, itemClassCode, withCategories } from './itemCategory'
import { ItemCategory } from './enums/itemCategory'
import type { Container } from './types'

it('the code is the class in the hundreds and the subclass under it', () => {
  expect(itemClassCode(0, 1)).toBe(1)
  expect(itemClassCode(4, 3)).toBe(403)
  expect(itemClassCode(15, 0)).toBe(1500)
})

it('the code names the game’s class; the subclass does not change the group', () => {
  expect(categoryOf(itemClassCode(0, 1))).toBe(ItemCategory.Consumable)
  expect(categoryOf(itemClassCode(0, 5))).toBe(ItemCategory.Consumable)
  expect(categoryOf(itemClassCode(2, 7))).toBe(ItemCategory.Weapon)
  expect(categoryOf(itemClassCode(4, 3))).toBe(ItemCategory.Armor)
  expect(categoryOf(itemClassCode(7, 0))).toBe(ItemCategory.Tradeskill)
  expect(categoryOf(itemClassCode(5, 0))).toBe(ItemCategory.Reagent)
  expect(categoryOf(itemClassCode(9, 1))).toBe(ItemCategory.Recipe)
  expect(categoryOf(itemClassCode(19, 0))).toBe(ItemCategory.Profession)
  expect(categoryOf(itemClassCode(3, 0))).toBe('gem')
  expect(categoryOf(itemClassCode(8, 0))).toBe('enhancement')
  expect(categoryOf(itemClassCode(1, 0))).toBe('container')
  expect(categoryOf(itemClassCode(12, 0))).toBe('quest')
  expect(categoryOf(itemClassCode(13, 0))).toBe('key')
  expect(categoryOf(itemClassCode(15, 5))).toBe('misc')
  expect(categoryOf(itemClassCode(17, 0))).toBe('battlepet')
})

it('a class the app has no word for is other; an unknown code is no group', () => {
  expect(categoryOf(itemClassCode(99, 0))).toBe('other')
  expect(categoryOf(itemClassCode(6, 0))).toBe('other')
  expect(categoryOf(undefined)).toBe(null)
  expect(categoryOf(null)).toBe(null)
  expect(categoryOf(-1)).toBe(null)
})

it('containers get their items’ groups from the lexicon', () => {
  const lexicon = { item: {}, currency: {}, recipe: {}, profession: {}, portrait: {}, itemClass: { 241323: 3, 212000: 401 } }
  const containers: Container[] = [
    {
      name: null,
      slots: 10,
      free: 2,
      items: [
        { itemId: 241323, name: 'Flask', count: 3, quality: 1 },
        { itemId: 212000, name: 'Crown', count: 1, quality: 4 },
        { itemId: 5, name: 'Unknown', count: 1, quality: null }
      ]
    }
  ]
  const out = withCategories(containers, lexicon)
  expect(out[0].items.map((item) => item.category)).toEqual([ItemCategory.Consumable, ItemCategory.Armor, null])
  // The input stays as it was.
  expect(containers[0].items[0].category).toBe(undefined)
})
