/**
 * The view preferences: how the roster is sorted and laid out, what the
 * gold view charts. Per machine, not
 * per account - localStorage is enough - and read back defensively, because
 * an older build may have written them.
 */

import { isSettingsSection } from './components/settings/model'
import { isDetailSection } from './components/detail/model'
import { AnyAccount } from '../../shared/enums/anyAccount'
import { GOLD_RANGES, GoldRange } from './enums/goldRange'
import { SortDirection } from './enums/sortDirection'
import { SortKey } from './enums/sortKey'
import { ViewMode } from './enums/viewMode'
import { SettingsSection } from './enums/settingsSection'
import { DetailSection } from './enums/detailSection'
import { TaskFilter } from './enums/taskFilter'
import { TaskGrouping } from './enums/taskGrouping'

export interface ViewPrefs {
  view: ViewMode
  /** The table's order: the plan's until a column head is clicked. */
  sort: SortKey
  direction: SortDirection
  /** Selected WTF account, or `all`. */
  account: string
  /** Time window the gold view charts. */
  goldRange: GoldRange
  /** The section of the settings page last opened. */
  settingsSection: SettingsSection
  /** The section of the character page last opened; it stays open from one character to the next. */
  detailSection: DetailSection
  /** The task list: what it shows, and how it is grouped. */
  tasksFilter: TaskFilter
  /** The grouping the user chose; `null` until then, and the roster's size decides (`effectiveGrouping`). */
  tasksGrouping: TaskGrouping | null
}

export const DEFAULT_PREFS: ViewPrefs = {
  view: ViewMode.Tiles,
  // The plan's order: the character worth logging into first is at the top,
  // the same order the task list has (C6).
  sort: SortKey.Plan,
  direction: SortDirection.Desc,
  account: AnyAccount.All,
  // Long enough to show what a month of playing did, short enough to still
  // show a single evening's auction house run.
  goldRange: GoldRange.Month,
  settingsSection: SettingsSection.Setup,
  detailSection: DetailSection.Week,
  // The whole week, the done lines ticked: a list that only shows what is
  // left does not show that anything got done.
  tasksFilter: TaskFilter.All,
  tasksGrouping: null
}

const PREFS_KEY = 'warband-briefing.viewPrefs'
/** The key from before the app was renamed; read once, then the current key holds the prefs. */
const LEGACY_PREFS_KEY = 'wowtodo.viewPrefs'

/** What an older build may have written, brought up to the current shape. */
export function normalizePrefs(raw: Partial<ViewPrefs>): ViewPrefs {
  const stored = { ...DEFAULT_PREFS, ...raw }
  // Earlier builds had the roster as cards; the rows are what those were.
  if ((stored.view as string) === 'cards') stored.view = ViewMode.Rows
  if (!Object.values(ViewMode).includes(stored.view)) stored.view = DEFAULT_PREFS.view
  if (!GOLD_RANGES.includes(stored.goldRange)) stored.goldRange = DEFAULT_PREFS.goldRange
  if (!isSettingsSection(stored.settingsSection)) stored.settingsSection = DEFAULT_PREFS.settingsSection
  if (!isDetailSection(stored.detailSection)) stored.detailSection = DEFAULT_PREFS.detailSection
  if (!Object.values(TaskFilter).includes(stored.tasksFilter)) stored.tasksFilter = DEFAULT_PREFS.tasksFilter
  if (stored.tasksGrouping !== null && !Object.values(TaskGrouping).includes(stored.tasksGrouping))
    stored.tasksGrouping = DEFAULT_PREFS.tasksGrouping
  return stored
}

export function loadPrefs(): ViewPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY) ?? window.localStorage.getItem(LEGACY_PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return normalizePrefs(JSON.parse(raw) as Partial<ViewPrefs>)
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: ViewPrefs): void {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // A locked-down profile without storage is no reason to break the view.
  }
}
