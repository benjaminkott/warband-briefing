/**
 * The user's own chores: what no source can read - "empty the mailbox",
 * "renew the auctions", "buy the enchant" - written down once and ticked
 * by hand. They live in a block of their own, apart from the measured
 * list, so a tick from a hand and a tick from the game never sit in one
 * column.
 *
 * A tick is a time. It counts for the week that contains it, so the reset
 * clears every box on its own: nothing is unticked, the reset just moves
 * past the tick. Ticks from before the reset are pruned when the config is
 * next written, to keep the map small.
 */

import type { AppConfig } from './types'
import type { CustomTaskScope } from './enums/customTaskScope'

export interface CustomTaskDef {
  /** Stable id, so a tick survives a rename of the label. */
  id: string
  label: string
  /** Once for every character with a week, or once for the whole warband. */
  scope: CustomTaskScope
}

/** The subject a tick belongs to: a character's key, or the warband. */
export const WARBAND = 'warband'

/** Task id -> subject -> when it was ticked, epoch millis. */
export type CustomTicks = Record<string, Record<string, number>>

export function customTaskId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/** Whether the box is ticked this week: a tick at or after the reset. */
export function isTicked(ticks: CustomTicks | undefined, taskId: string, subject: string, resetAt: number): boolean {
  const at = ticks?.[taskId]?.[subject]
  return at !== undefined && at >= resetAt
}

/** The ticks with one box set or cleared; a cleared box is a removed time, not a time of zero. */
export function withTick(ticks: CustomTicks | undefined, taskId: string, subject: string, done: boolean, now = Date.now()): CustomTicks {
  const next: CustomTicks = { ...(ticks ?? {}) }
  const own = { ...(next[taskId] ?? {}) }
  if (done) own[subject] = now
  else delete own[subject]
  if (Object.keys(own).length === 0) delete next[taskId]
  else next[taskId] = own
  return next
}

/** The ticks without the ones from before the reset and without the ones of tasks that no longer exist. */
export function pruneTicks(ticks: CustomTicks | undefined, defs: CustomTaskDef[], resetAt: number): CustomTicks {
  const ids = new Set(defs.map((def) => def.id))
  const next: CustomTicks = {}
  for (const [taskId, own] of Object.entries(ticks ?? {})) {
    if (!ids.has(taskId)) continue
    const kept = Object.fromEntries(Object.entries(own).filter(([, at]) => at >= resetAt))
    if (Object.keys(kept).length > 0) next[taskId] = kept
  }
  return next
}

/** What the task list needs of the config to draw the block. */
export interface CustomTaskState {
  defs: CustomTaskDef[]
  ticks: CustomTicks
  resetAt: number
}

export function customTaskState(config: Pick<AppConfig, 'customTasks' | 'customTicks'>, resetAt: number): CustomTaskState {
  return { defs: config.customTasks ?? [], ticks: config.customTicks ?? {}, resetAt }
}
