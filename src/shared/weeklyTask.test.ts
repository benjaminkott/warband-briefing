/**
 * Tests for what a weekly asks of a character: a line whose account-wide
 * reward another character took is neither owed nor counted.
 */

import { expect, it } from 'vitest'
import { isAsked, isOwed } from './weeklyTask'

it('an open weekly is owed and counted', () => {
  expect([isOwed({ done: false }), isAsked({ done: false })]).toEqual([true, true])
})
it('a done weekly is counted, not owed', () => {
  expect([isOwed({ done: true }), isAsked({ done: true })]).toEqual([false, true])
})
it("a weekly whose reward another character took is neither, and stays counted once it is done anyway", () => {
  expect([isOwed({ done: false, rewardTaken: { by: 'Nyx' } }), isAsked({ done: false, rewardTaken: { by: null } })]).toEqual([false, false])
  expect(isAsked({ done: true, rewardTaken: { by: 'Nyx' } })).toEqual(true)
})
