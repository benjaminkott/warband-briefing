/**
 * What a weekly asks of a character.
 *
 * Most weeklies are the character's own: open until done, one for each
 * character. Some pay once for the whole account - the client flags them
 * account quests - and every character can still pick them up and turn
 * them in, for nothing. Such a quest is still the character's line, but
 * once another character collected the reward the line asks nothing: it
 * says whose the reward was, and no count holds it against the character.
 */

import type { WeeklyTask } from './types'

/** True where the character still has the quest to do and the reward to earn. */
export function isOwed(task: Pick<WeeklyTask, 'done' | 'rewardTaken'>): boolean {
  return !task.done && task.rewardTaken === undefined
}

/** True where the line counts, done or owed: not where the account's reward went to another character. */
export function isAsked(task: Pick<WeeklyTask, 'done' | 'rewardTaken'>): boolean {
  return task.done || task.rewardTaken === undefined
}
