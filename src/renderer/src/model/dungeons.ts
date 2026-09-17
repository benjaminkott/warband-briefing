/**
 * The season's dungeons, and which of them a character should run.
 *
 * The bests a character reports name only the dungeons it has run. A
 * dungeon never run is not in them - and it is the biggest gap of all:
 * every level there is rating from nothing. So "the weakest key" needs
 * the season's list, not the character's. The companion lists it from
 * the client; before it does, the roster stands in: a dungeon anyone has
 * run is in the season.
 */

import type { CharacterSnapshot, DungeonBest, SeasonDungeon } from '../../../shared/types'
import type { Translator } from '../../../shared/i18n'

/** The key a character should run: a dungeon of the season, with the best there where it has one. */
export interface KeyToRun {
  dungeon: SeasonDungeon
  /** Null on a dungeon never run. */
  best: DungeonBest | null
}

/**
 * The season's dungeons, by name: what the client listed, and what the
 * roster has run - a dungeon known from either is in the season.
 */
export function seasonDungeons(characters: CharacterSnapshot[], listed: SeasonDungeon[], tr: Translator): SeasonDungeon[] {
  const dungeons = new Map<number, string>()
  for (const dungeon of listed) dungeons.set(dungeon.mapChallengeModeId, dungeon.name)
  for (const character of characters) {
    for (const best of character.dungeonBests ?? []) {
      if (!dungeons.has(best.mapChallengeModeId)) dungeons.set(best.mapChallengeModeId, best.name)
    }
  }
  return [...dungeons.entries()]
    .map(([mapChallengeModeId, name]) => ({ mapChallengeModeId, name }))
    .sort((a, b) => tr.compare(a.name, b.name))
}

/**
 * The key a character should run: the first dungeon of the season it has
 * never run, else the dungeon where its best is lowest, because that is
 * where the rating has the most room. Among equal levels the run over the
 * timer, which a timed run would replace. Null without a best and without
 * a dungeon - the companion is the only source of both.
 */
export function keyToRun(bests: DungeonBest[], dungeons: SeasonDungeon[]): KeyToRun | null {
  const run = new Set(bests.map((best) => best.mapChallengeModeId))
  const unrun = dungeons.find((dungeon) => !run.has(dungeon.mapChallengeModeId))
  if (unrun) return { dungeon: unrun, best: null }
  let weakest: DungeonBest | null = null
  for (const best of bests) {
    if (!weakest || best.level < weakest.level || (best.level === weakest.level && weakest.inTime && !best.inTime)) {
      weakest = best
    }
  }
  return weakest ? { dungeon: { mapChallengeModeId: weakest.mapChallengeModeId, name: weakest.name }, best: weakest } : null
}
