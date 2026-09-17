/**
 * Tests for the assignment of quests and goals to characters: a definition
 * that names characters is theirs alone, one that names none is everyone's,
 * and a character's own goal beats the common one of the same kind.
 *
 */

import { expect, it } from 'vitest'
import { assignedTo, goalsFor, isLimited } from './assign'
import { GoalKind } from './enums/goalKind'

/* ---- who a definition is for ---- */

it("a definition without characters is everyone's", () => {
  expect(assignedTo({}, 'a')).toBe(true)
  expect(isLimited({})).toBe(false)
})

it('a definition with characters is theirs alone', () => {
  expect(assignedTo({ characters: ['a'] }, 'a')).toBe(true)
  expect(assignedTo({ characters: ['a'] }, 'b')).toBe(false)
  expect(isLimited({ characters: [] })).toBe(true)
})

/* ---- the goals of a character ---- */

const forAll = { id: 'vaultSlots-3', kind: GoalKind.VaultSlots, target: 3 }
const forB = { id: 'vaultSlots-1-b', kind: GoalKind.VaultSlots, target: 1, characters: ['b'] }
const runs = { id: 'mythicRuns-4', kind: GoalKind.MythicRuns, target: 4 }

it("a goal for everyone is every character's", () => {
  expect(goalsFor([forAll, runs], 'a')).toEqual([forAll, runs])
})

it("a character's own goal beats the common one of its kind", () => {
  expect(goalsFor([forAll, forB, runs], 'b')).toEqual([forB, runs])
  expect(goalsFor([forAll, forB, runs], 'a')).toEqual([forAll, runs])
})

it("a goal for other characters is not the character's at all", () => {
  expect(goalsFor([forB], 'a')).toEqual([])
})
