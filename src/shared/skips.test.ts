/**
 * The chores a player took off a week: the store of skips by subject and
 * the stamp on the roster.
 */

import { describe, expect, it } from 'vitest'
import { activityChoreId, isSkipped, skippedOf, vaultChoreId, wantsChore, weeklyChoreId, withSkip, withSkips, withoutSkips } from './skips'
import type { CharacterSnapshot } from './types'
import { VaultCategory } from './enums/vaultCategory'

const one = withSkip(undefined, 'a', 'vault:raid', true)

describe('the store of skips', () => {
  it('no skips, nothing skipped', () => {
    expect(isSkipped(undefined, 'a', 'vault:raid')).toBe(false)
  })
  it('a chore taken off is under its subject', () => {
    expect(one).toEqual({ a: ['vault:raid'] })
    expect(isSkipped(one, 'a', 'vault:raid')).toBe(true)
  })
  it('another subject is not touched', () => {
    expect(isSkipped(one, 'b', 'vault:raid')).toBe(false)
  })
  it('taken off twice is once', () => {
    expect(withSkip(one, 'a', 'vault:raid', true)).toEqual({ a: ['vault:raid'] })
  })
  it('put back leaves no empty entry', () => {
    expect(withSkip(one, 'a', 'vault:raid', false)).toEqual({})
  })
  it('put back keeps the rest', () => {
    expect(withSkip(withSkip(one, 'a', 'weekly:2', true), 'a', 'vault:raid', false)).toEqual({ a: ['weekly:2'] })
  })
  it('the warband is a subject like any', () => {
    expect(skippedOf(withSkip(one, 'warband', 'paragon:7', true), 'warband')).toEqual(['paragon:7'])
  })
  it("the ids are the list's words", () => {
    expect([vaultChoreId(VaultCategory.Raid), weeklyChoreId({ id: 2 }), activityChoreId({ key: 'zone-weekly' })]).toEqual([
      'vault:raid',
      'weekly:2',
      'activity:zone-weekly'
    ])
  })
})

describe('the stamp on the roster', () => {
  const roster = [
    { key: 'a', name: 'A' },
    { key: 'b', name: 'B' }
  ] as CharacterSnapshot[]
  const stamped = withSkips(roster, { a: ['vault:raid'] })

  it('puts the skips on the character that has them', () => {
    expect(stamped.map((c) => c.skipped)).toEqual([['vault:raid'], undefined])
  })
  it('a character without skips is the same object', () => {
    expect(stamped[1]).toBe(roster[1])
  })
  it('no skips at all: the roster as it was', () => {
    expect(withSkips(roster, undefined).every((c, i) => c === roster[i])).toBe(true)
  })
  it('unstamped again, every chore is wanted', () => {
    expect(withoutSkips(stamped).map((c) => wantsChore(c, 'vault:raid'))).toEqual([true, true])
  })
  it('wants what is not taken off', () => {
    expect([wantsChore(stamped[0], 'vault:raid'), wantsChore(stamped[0], 'vault:dungeon'), wantsChore(roster[0], 'vault:raid')]).toEqual([
      false,
      true,
      true
    ])
  })
})
