/**
 * What the views show, switch by switch.
 *
 * Every block a view draws beyond the core is a flag here, so a player who
 * does not care about enchants can take that out of every view at once
 * rather than living with it. The config stores only the flags that differ
 * from the defaults; `displayFlags` fills in the rest, so a new flag added
 * in a later version simply appears switched on.
 */

import type { AppConfig, WeeklyActivity } from './types'

export const DISPLAY_FLAGS = [
  // The tracker's activities, on the cards and the list.
  'activities',
  // The gear check: missing enchants and empty sockets, as the next step and as chores.
  'gear',
  // The trend under a figure, in the rows and the table.
  'trend',
  // The evening's plan over the task list.
  'evening',
  // The calendar's running events on the warband's panel.
  'events',
  // The season's bests under the roster.
  'matrix',
  // The figures of the roster's head row, one each.
  'kpi.vault',
  'kpi.done',
  'kpi.runs',
  'kpi.unclaimed',
  'kpi.gold'
] as const

/** The switches of the head row's figures, in the row's order. */
export const KPI_FLAGS = DISPLAY_FLAGS.filter((flag): flag is `kpi.${string}` & DisplayFlag => flag.startsWith('kpi.'))
/** The switches that are one block each: every flag but the figures. */
export const BLOCK_FLAGS = DISPLAY_FLAGS.filter((flag) => !flag.startsWith('kpi.'))

export type DisplayFlag = (typeof DISPLAY_FLAGS)[number]
export type DisplayFlags = Record<DisplayFlag, boolean>

/** Everything on. */
export const DISPLAY_DEFAULTS: DisplayFlags = Object.fromEntries(DISPLAY_FLAGS.map((flag) => [flag, true])) as DisplayFlags

/** How far back the trend under a figure looks, in days. */
export const TREND_DAYS = 30

/**
 * The switches of earlier builds, by the flag they became. A switch that
 * was renamed lists its names oldest first; two halves of one switch - the
 * enchants and the sockets, the rows' trend and the table's - are one
 * switch now, off only where every half was off. A half not stored was on.
 */
const LEGACY_HALVES: Record<DisplayFlag, string[][]> = {
  activities: [['activities.show']],
  gear: [['gear.enchants'], ['gear.sockets']],
  trend: [['card.trend', 'dash.trend'], ['table.trend']],
  evening: [['dash.evening', 'tasks.evening']],
  events: [['dash.events', 'tasks.events']],
  matrix: [['dash.matrix']],
  'kpi.vault': [],
  'kpi.done': [],
  'kpi.runs': [],
  'kpi.unclaimed': [],
  'kpi.gold': []
}

/** The stored flags over the defaults; a switch of an earlier build counts for the one it became. */
export function displayFlags(config: Pick<AppConfig, 'display'> | null | undefined): DisplayFlags {
  const stored: Record<string, boolean | undefined> = { ...(config?.display ?? {}) }
  const flags = { ...DISPLAY_DEFAULTS }
  for (const flag of DISPLAY_FLAGS) {
    if (typeof stored[flag] === 'boolean') {
      flags[flag] = stored[flag]
      continue
    }
    // Each half by its latest stored name, on where none of its names is stored.
    const halves = LEGACY_HALVES[flag].map((names) => {
      const named = names.filter((name) => typeof stored[name] === 'boolean')
      return named.length === 0 ? true : stored[named[named.length - 1]!]!
    })
    if (halves.length > 0 && halves.every((on) => !on)) flags[flag] = false
  }
  return flags
}

/** The activities a view shows: the tracker's, where they are switched on. */
export function visibleActivities(activities: WeeklyActivity[] | undefined, flags: DisplayFlags): WeeklyActivity[] {
  return flags.activities ? (activities ?? []) : []
}
