/**
 * A weekly quest the game draws from a pool.
 *
 * The season's main weekly is not one quest but a set the game rotates
 * through: "Midnight: Delves" one week, "Midnight: Raid" the next, and
 * only one of them is on the board. The dungeon weekly is the same, one
 * quest for each dungeon. A line for each of them would say "accept" for
 * six quests nobody can accept. So a definition can carry a `pool`, and
 * the line stands for whichever of them the week offers: a source reads
 * the pool's ids against the log, the turn-ins and the flags, and the
 * first one it finds is the week's quest - its title, its progress, its
 * turn-in. The definition's own `id` names the line for the skips and the
 * settings whichever id the week draws.
 *
 * The pool's ids are a seed. The game adds a quest to the set with a
 * patch - a new dungeon, a new "Midnight: ..." - and a list written down
 * is behind from then on. So a pool grows from the register: a weekly the
 * companion learned joins the pool whose shape it has (`growPools`).
 */

import type { WeeklyQuestDef } from './types'

/** The ids a definition stands for: the pool where it has one, the id alone otherwise. */
export function questIdsOf(def: Pick<WeeklyQuestDef, 'id' | 'pool'>): number[] {
  const pool = def.pool ?? []
  return pool.includes(def.id) ? pool : [def.id, ...pool]
}

/** True where the id is the definition's own or one of its pool. */
export function inPool(def: Pick<WeeklyQuestDef, 'id' | 'pool'>, id: number): boolean {
  return questIdsOf(def).includes(id)
}

/**
 * The record a lookup has for the week's quest: the first of the pool's
 * ids it knows, in the pool's order. Undefined where it knows none.
 */
export function fromPool<T>(def: Pick<WeeklyQuestDef, 'id' | 'pool'>, lookup: (id: number) => T | undefined): T | undefined {
  for (const id of questIdsOf(def)) {
    const found = lookup(id)
    if (found !== undefined) return found
  }
  return undefined
}

/** The part of a title before its colon ("Midnight: Delves" -> "Midnight:"), or null without one. */
function prefixOf(title: string): string | null {
  const colon = title.indexOf(':')
  return colon > 0 ? title.slice(0, colon + 1) : null
}

/**
 * The pools with the learned weeklies that have their shape. A pool learns
 * its shape from the members the register knows: the prefix their titles
 * share before the colon ("Midnight: Vaults" says "Midnight:"), or that
 * their titles are the season's dungeons. A learned weekly no definition
 * lists joins the first pool of its shape, in the learned order. Titles are
 * in the client's language, and so are the dungeon names and the known
 * members' titles, so the rule holds in every language. A pool with no
 * known member has no shape and stays the seed.
 */
export function growPools(defs: readonly WeeklyQuestDef[], learned: readonly WeeklyQuestDef[], dungeons: readonly string[]): WeeklyQuestDef[] {
  const listed = new Set(defs.flatMap((def) => questIdsOf(def)))
  const free = learned.filter((quest) => !listed.has(quest.id))
  return defs.map((def) => {
    if (!def.pool || free.length === 0) return def
    const known = learned.filter((quest) => inPool(def, quest.id))
    const prefixes = new Set(known.map((quest) => prefixOf(quest.label)).filter((prefix): prefix is string => prefix !== null))
    const ofDungeons = known.some((quest) => dungeons.includes(quest.label))
    const joining: number[] = []
    for (const quest of free) {
      const prefix = prefixOf(quest.label)
      const fits = (prefix !== null && prefixes.has(prefix)) || (ofDungeons && dungeons.includes(quest.label))
      if (!fits || listed.has(quest.id)) continue
      listed.add(quest.id)
      joining.push(quest.id)
    }
    return joining.length === 0 ? def : { ...def, pool: [...def.pool, ...joining] }
  })
}

/**
 * The definition a stored list keeps for an id, where one of its members
 * carries the id in its pool. The catalog's pool absorbs the quests a
 * config listed one by one before the pool existed.
 */
export function poolDefFor(defs: readonly WeeklyQuestDef[], id: number): WeeklyQuestDef | undefined {
  return defs.find((def) => def.pool !== undefined && inPool(def, id))
}

/**
 * A stored list with the quests of a pool folded into the pool's line: the
 * season's weekly was seven quests once, one line each, and a config from
 * then lists them one by one. The first of them becomes the pool's line,
 * in its place, with the pool's definition; the rest go, they are the
 * same line. A list that has the pool
 * already, or names none of its quests, is returned as it is.
 */
export function foldIntoPools(watched: readonly WeeklyQuestDef[], pools: readonly WeeklyQuestDef[]): WeeklyQuestDef[] {
  const folded = new Set<number>()
  const out: WeeklyQuestDef[] = []
  for (const quest of watched) {
    const pool = quest.pool === undefined ? poolDefFor(pools, quest.id) : undefined
    if (!pool) {
      out.push(quest)
      continue
    }
    if (folded.has(pool.id)) continue
    folded.add(pool.id)
    out.push({ id: pool.id, label: pool.label, pool: [...pool.pool!] })
  }
  return out
}
