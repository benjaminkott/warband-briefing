/**
 * Tests for the trail the shell walks: a visit, a step back, a step forward,
 * and what a new visit does to the steps ahead.
 */

import { expect, it } from 'vitest'
import { START, MAX_PLACES, back, canBack, canForward, forward, here, lastTab, lookFor, visit } from './navigation'
import { Tab } from '../enums/tab'
const tasks = { tab: Tab.Tasks, character: null, query: '' }
const board = { tab: Tab.Roster, character: null, query: '' }
const kael = { tab: Tab.Roster, character: 'kael', query: '' }
const lyra = { tab: Tab.Roster, character: 'lyra', query: '' }

/* ---- the start ---- */

it('the app opens on the roster', () => {
  expect(here(START)).toEqual(board)
})
it('nothing behind the start', () => {
  expect(canBack(START)).toEqual(false)
})
it('nothing ahead of the start', () => {
  expect(canForward(START)).toEqual(false)
})

/* ---- a visit ---- */

const opened = visit(START, kael)
it('a visit is the place the shell stands in', () => {
  expect(here(opened)).toEqual(kael)
})
it('a visit can be stepped back from', () => {
  expect(canBack(opened)).toEqual(true)
})
it('a visit to the same place is no step', () => {
  expect(visit(opened, { ...kael })).toEqual(opened)
})
it('a visit to the same tab with no page is a step', () => {
  expect(here(visit(opened, board))).toEqual(board)
})

/* ---- back and forward ---- */

const walked = visit(visit(opened, lyra), tasks)
const stepped = back(walked)
it('back is the place before', () => {
  expect(here(stepped)).toEqual(lyra)
})
it('back keeps the places', () => {
  expect(stepped.places.length).toEqual(4)
})
it('the place stepped back from lies ahead', () => {
  expect(canForward(stepped)).toEqual(true)
})
it('forward is the place stepped back from', () => {
  expect(here(forward(stepped))).toEqual(tasks)
})
it('back at the start stays', () => {
  expect(back(START)).toEqual(START)
})
it('forward at the end stays', () => {
  expect(forward(walked)).toEqual(walked)
})
it('back to the start', () => {
  expect(here(back(back(back(walked))))).toEqual(board)
})

/* ---- a visit after a step back ---- */

const branched = visit(stepped, board)
it('a new visit cuts what lay ahead', () => {
  expect(branched.places.map((p) => p.tab)).toEqual([Tab.Roster, Tab.Roster, Tab.Roster, Tab.Roster])
})
it('a new visit ends the trail', () => {
  expect(canForward(branched)).toEqual(false)
})
it('the places behind stay', () => {
  expect(here(back(branched))).toEqual(lyra)
})

/* ---- the last tab ---- */

it('at the start there is no last tab', () => {
  expect(lastTab(START)).toEqual(null)
})
it('a page over the tab is not a change of tab', () => {
  expect(lastTab(opened)).toEqual(null)
})
it('the last tab is the one open before this one', () => {
  expect(lastTab(walked)).toEqual(Tab.Roster)
})
const flipped = visit(walked, { tab: lastTab(walked)!, character: null, query: '' })
it('a flip goes back to it', () => {
  expect(here(flipped).tab).toEqual(Tab.Roster)
})

/* ---- the query ---- */

const typed = lookFor(walked, 'flask')
it('what is typed belongs to the place', () => {
  expect(here(typed)).toEqual({ ...tasks, query: 'flask' })
})
it('typing is no step', () => {
  expect(typed.index).toEqual(walked.index)
})
it('the same query again changes nothing', () => {
  expect(lookFor(typed, 'flask')).toEqual(typed)
})
it('the query stays with its place', () => {
  expect(here(back(typed))).toEqual(lyra)
})
it('a step forward brings it back', () => {
  expect(here(forward(back(typed))).query).toEqual('flask')
})
it('a new place starts with none', () => {
  expect(here(visit(typed, kael)).query).toEqual('')
})
const hit = visit(typed, { ...tasks, query: 'potion' })
it('a hit on the place the shell stands in is no step', () => {
  expect(hit.index).toEqual(typed.index)
})
it('but its query is taken', () => {
  expect(here(hit).query).toEqual('potion')
})
it('a second flip returns', () => {
  expect(lastTab(flipped)).toEqual(Tab.Tasks)
})
it('a page over the last tab still names the tab', () => {
  expect(lastTab(visit(walked, lyra))).toEqual(Tab.Tasks)
})

/* ---- the length ---- */

let long = START
for (let i = 0; i < MAX_PLACES + 20; i++) long = visit(long, { tab: Tab.Tasks, character: `c${i}`, query: '' })
it('the trail is capped', () => {
  expect(long.places.length).toEqual(MAX_PLACES)
})
it('the newest place stays', () => {
  expect(here(long).character).toEqual(`c${MAX_PLACES + 19}`)
})
it('the oldest places fall off', () => {
  expect(long.places[0].character).toEqual('c20')
})
