/**
 * Tests for the lexicon: registers merge into one, a later one wins, the
 * reference is the file id or the class icon's name, and an unknown id
 * gives nothing.
 */

import { expect, it } from 'vitest'
import { emptyLexicon, iconRef, lexiconSize, mergeLexicons, characterIdOf, LEXICON_KINDS } from './lexicon'
import { IconKind } from './enums/iconKind'

it('an empty lexicon has every kind and no id', () => {
  const lexicon = emptyLexicon()
  expect(Object.keys(lexicon).sort()).toEqual([...LEXICON_KINDS].sort())
  expect(lexiconSize(lexicon)).toBe(0)
})

it('registers merge, a later one wins an id both name', () => {
  const stored = { item: { 274374: 1 }, currency: { 3008: 5 }, recipe: {}, profession: {}, portrait: {} }
  const read = { item: { 274374: 2, 245653: 3 }, currency: {}, recipe: { 9: 4 }, profession: {}, portrait: {} }
  const merged = mergeLexicons(stored, null, read)
  expect(merged.item['274374']).toBe(2)
  expect(merged.item['245653']).toBe(3)
  expect(merged.currency['3008']).toBe(5)
  expect(merged.recipe['9']).toBe(4)
  expect(lexiconSize(merged)).toBe(4)
  // The inputs stay as they were.
  expect(stored.item['274374']).toBe(1)
})

it('a register missing a kind still merges', () => {
  const merged = mergeLexicons({ item: { 1: 7 } })
  expect(merged.item['1']).toBe(7)
  expect(merged.currency).toEqual({})
})

it('the reference is the host path of the file id, by string or number', () => {
  const lexicon = mergeLexicons({ item: { 274374: 4622270 } })
  expect(iconRef(lexicon, IconKind.Item, 274374)).toBe('icons/56/4622270')
  expect(iconRef(lexicon, IconKind.Item, '274374')).toBe('icons/56/4622270')
  expect(iconRef(lexicon, IconKind.Item, 1)).toBe(null)
  expect(iconRef(lexicon, IconKind.Currency, 274374)).toBe(null)
})

it('a class is named by its token', () => {
  const lexicon = emptyLexicon()
  expect(iconRef(lexicon, IconKind.Class, 'WARRIOR')).toBe('icons/56/classicon_warrior')
  expect(iconRef(lexicon, IconKind.Class, 'DEATHKNIGHT')).toBe('icons/56/classicon_deathknight')
  expect(iconRef(lexicon, IconKind.Class, 'no such')).toBe(null)
  expect(iconRef(lexicon, IconKind.Class, '')).toBe(null)
})

it('a file id that is not a positive number is unknown', () => {
  const lexicon = mergeLexicons({ item: { 1: 0, 2: -3 } })
  expect(iconRef(lexicon, IconKind.Item, 1)).toBe(null)
  expect(iconRef(lexicon, IconKind.Item, 2)).toBe(null)
})

it('the character id is the tail of the GUID, in hex', () => {
  expect(characterIdOf('Player-1405-0992F5F0')).toBe(0x0992f5f0)
  expect(characterIdOf('Player-580-08E0BA61')).toBe(0x08e0ba61)
  expect(characterIdOf('Creature-0-1-2-3-4-5')).toBe(null)
  expect(characterIdOf('')).toBe(null)
  expect(characterIdOf(null)).toBe(null)
})

it('a portrait and an inset are shelved by the realm of the key and the last byte of the id', () => {
  const lexicon = mergeLexicons({ portrait: { 'zirkel-des-cenarius-kael': 160626160 } })
  expect(iconRef(lexicon, IconKind.Portrait, 'zirkel-des-cenarius-kael')).toBe('character/zirkel-des-cenarius/240/160626160-avatar')
  expect(iconRef(lexicon, IconKind.Inset, 'zirkel-des-cenarius-kael')).toBe('character/zirkel-des-cenarius/240/160626160-inset')
  expect(iconRef(lexicon, IconKind.Portrait, 'zirkel-des-cenarius-mira')).toBe(null)
  expect(iconRef(lexicon, IconKind.Portrait, 'nokey')).toBe(null)
})
