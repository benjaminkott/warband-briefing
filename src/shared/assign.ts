/**
 * Which goals are a character's own.
 *
 * The goals are one list for the whole roster, and the main does not play
 * towards the same vault as the alt - so a goal can name the characters it
 * is for. Absent means every character: the list for all stays the start,
 * and a roster of one never sees the question (A2). Which chores a
 * character does is picked on the list itself (`skips.ts`).
 */

import type { Goal } from './types'

/** A definition that can be limited to some characters; absent means all of them. */
export interface Assigned {
  characters?: string[]
}

/** Whether the definition is the character's. */
export function assignedTo(def: Assigned, key: string): boolean {
  return def.characters === undefined || def.characters.includes(key)
}

/** Whether the definition is limited to some characters. */
export function isLimited(def: Assigned): boolean {
  return def.characters !== undefined
}

/**
 * The goals a character is measured against. For each kind the goal that
 * names the character wins over the one for everyone: "three slots for
 * all, one for Mira" measures Mira against one. A goal that names other
 * characters is not the character's at all.
 */
export function goalsFor(goals: Goal[], key: string): Goal[] {
  const own = goals.filter((goal) => assignedTo(goal, key))
  return own.filter((goal) => isLimited(goal) || !own.some((other) => other.kind === goal.kind && isLimited(other)))
}
