/**
 * The chores a player took off a week.
 *
 * Every chore the sources know is on every character's week to start
 * with, and Mira raids but never does the world-quest weekly, the alt
 * fills the vault but its crests are nobody's chore. So the player picks on
 * the list itself - every line has a box, and a line taken off is not on
 * the list, not in the count and not in the evening's plan. The choice is
 * kept by chore id (`vault:raid`, `weekly:93912`, `currency:3008`), the
 * same id on every character, under the character's key - or under the
 * warband for a chore of the whole account. Absent means every chore is
 * wanted: the list as read from the game stays the start.
 */

import type { CharacterSnapshot, WeeklyActivity, WeeklyTask } from './types'
import type { VaultCategory } from './enums/vaultCategory'

/**
 * The ids of the lines the week is measured by outside the list itself -
 * a vault row, a quest, an activity - so the progress and the plan ask
 * the skips by the same words the list does. The other lines are named
 * where they are made (`tasks.ts`, `gear.ts`).
 */
export const vaultChoreId = (category: VaultCategory): string => `vault:${category}`
export const weeklyChoreId = (task: Pick<WeeklyTask, 'id'>): string => `weekly:${task.id}`
export const activityChoreId = (activity: Pick<WeeklyActivity, 'key'>): string => `activity:${activity.key}`

/** Chore ids taken off a week, by subject: a character's key, or the warband. */
export type TaskSkips = Record<string, string[]>

/** The chore ids the subject took off; none without an entry. */
export function skippedOf(skips: TaskSkips | null | undefined, subject: string): string[] {
  return skips?.[subject] ?? []
}

export function isSkipped(skips: TaskSkips | null | undefined, subject: string, id: string): boolean {
  return skippedOf(skips, subject).includes(id)
}

/** The skips with one chore taken off or put back; a subject with nothing taken off has no entry. */
export function withSkip(skips: TaskSkips | null | undefined, subject: string, id: string, skipped: boolean): TaskSkips {
  const next: TaskSkips = { ...(skips ?? {}) }
  const own = skippedOf(skips, subject).filter((each) => each !== id)
  if (skipped) own.push(id)
  if (own.length === 0) delete next[subject]
  else next[subject] = own
  return next
}

/** Whether the chore is still on the character's week; a snapshot without skips wants all of it. */
export function wantsChore(character: Pick<CharacterSnapshot, 'skipped'>, id: string): boolean {
  return !character.skipped?.includes(id)
}

/**
 * The roster with each character's skips on it, so a view that gets a
 * character measures it by what the player kept - no view has to carry
 * the config.
 */
export function withSkips(characters: CharacterSnapshot[], skips: TaskSkips | null | undefined): CharacterSnapshot[] {
  return characters.map((character) => {
    const skipped = skippedOf(skips, character.key)
    return skipped.length > 0 ? { ...character, skipped } : character
  })
}

/** The roster with nothing taken off: what the pick mode offers, every chore there is. */
export function withoutSkips(characters: CharacterSnapshot[]): CharacterSnapshot[] {
  return characters.map((character) => (character.skipped ? { ...character, skipped: undefined } : character))
}
