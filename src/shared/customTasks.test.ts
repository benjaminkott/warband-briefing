/**
 * Tests for the user's own chores: a tick is a time, the reset moves past
 * it, and pruning keeps only what still counts.
 */

import { expect, it } from 'vitest'
import { isTicked, pruneTicks, withTick, customTaskId } from './customTasks'
import { CustomTaskScope } from './enums/customTaskScope'

const RESET = 1_000_000
const defs = [{ id: 'a', label: 'A', scope: CustomTaskScope.Character }]

it('no ticks, not ticked', () => {
  expect(isTicked(undefined, 'a', 'x', RESET)).toEqual(false)
})
const ticked = withTick(undefined, 'a', 'x', true, RESET + 10)
it('a tick this week counts', () => {
  expect(isTicked(ticked, 'a', 'x', RESET)).toEqual(true)
})
it('the same tick after the next reset does not', () => {
  expect(isTicked(ticked, 'a', 'x', RESET + 100)).toEqual(false)
})
it('a cleared box is a removed time', () => {
  expect(withTick(ticked, 'a', 'x', false)).toEqual({})
})
it('another subject keeps its own tick', () => {
  expect(Object.keys(withTick(ticked, 'a', 'y', true, RESET + 20).a).sort()).toEqual(['x', 'y'])
})

const stale = { a: { x: RESET - 1, y: RESET + 1 }, gone: { x: RESET + 1 } }
it('pruning drops old ticks and ticks of removed chores', () => {
  expect(pruneTicks(stale, defs, RESET)).toEqual({ a: { y: RESET + 1 } })
})
it('ids differ', () => {
  expect(customTaskId() !== customTaskId()).toEqual(true)
})
