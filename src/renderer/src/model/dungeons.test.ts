/**
 * Tests for the season's dungeons: how the list is put together from the
 * client and the roster, and which key a character is asked to run.
 */

import { expect, it } from 'vitest'
import { keyToRun, seasonDungeons } from './dungeons'
import { createTranslator } from '../../../shared/i18n'
import type { CharacterSnapshot, DungeonBest, SeasonDungeon } from '../../../shared/types'

const tr = createTranslator('en')

const dungeon = (id: number, name: string): SeasonDungeon => ({ mapChallengeModeId: id, name })
const best = (id: number, name: string, level: number, inTime = true): DungeonBest => ({
  mapChallengeModeId: id,
  name,
  level,
  inTime,
  score: level * 10,
  durationSec: null
})
const character = (...bests: DungeonBest[]) => ({ dungeonBests: bests }) as CharacterSnapshot

/* ---- the season's list ---- */

const ara = dungeon(1, 'Ara-Kara')
const grim = dungeon(2, 'Grim Batol')
const rookery = dungeon(3, 'The Rookery')

it('no client list, no bests: no season', () => {
  expect(seasonDungeons([], [], tr)).toEqual([])
})
it('the client list alone, by name', () => {
  expect(seasonDungeons([], [rookery, ara], tr).map((d) => d.name)).toEqual(['Ara-Kara', 'The Rookery'])
})
it('a dungeon anyone ran is in the season', () => {
  expect(seasonDungeons([character(best(2, 'Grim Batol', 9)), character(best(1, 'Ara-Kara', 12))], [], tr).map((d) => d.name)).toEqual([
    'Ara-Kara',
    'Grim Batol'
  ])
})
it('the client list and the roster as one, each dungeon once', () => {
  expect(
    seasonDungeons([character(best(1, 'Ara-Kara', 12), best(3, 'The Rookery', 8))], [ara, grim], tr).map((d) => d.mapChallengeModeId)
  ).toEqual([1, 2, 3])
})

/* ---- the key to run ---- */

const season = [ara, grim, rookery]
it('no bests and no season: no key', () => {
  expect(keyToRun([], [])).toEqual(null)
})
it('no bests: the first dungeon of the season, never run', () => {
  expect(keyToRun([], season)).toEqual({ dungeon: ara, best: null })
})
it('a dungeon never run comes before the lowest key', () => {
  expect(keyToRun([best(1, 'Ara-Kara', 12), best(2, 'Grim Batol', 2)], season)).toEqual({
    dungeon: rookery,
    best: null
  })
})
it('every dungeon run: the lowest key', () => {
  expect(keyToRun([best(1, 'Ara-Kara', 12), best(2, 'Grim Batol', 9), best(3, 'The Rookery', 11)], season)!.best!.name).toEqual(
    'Grim Batol'
  )
})
it('at the same level the run over the timer', () => {
  expect(keyToRun([best(1, 'Ara-Kara', 10), best(2, 'Grim Batol', 10, false)], [ara, grim])!.best!.name).toEqual('Grim Batol')
})
it('without a season list the lowest best stands, as before', () => {
  expect(keyToRun([best(1, 'Ara-Kara', 12), best(2, 'Grim Batol', 9)], [])).toEqual({
    dungeon: grim,
    best: best(2, 'Grim Batol', 9)
  })
})
