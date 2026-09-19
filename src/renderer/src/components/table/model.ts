/**
 * What a row of the character table shows, worked out without a DOM: the
 * week's reading of the character, the counts its cells set, the tooltips
 * behind them, and the step the plan picks. The element only draws it.
 */

import type { AppConfig, CharacterHistory, CharacterPoint, CharacterSnapshot, Goal, SeasonDungeon } from '../../../../shared/types'
import { difficultyLabel, type Translator } from '../../../../shared/i18n'
import { trend } from '../../../../shared/charHistory'
import { DISPLAY_DEFAULTS, TREND_DAYS, type DisplayFlags } from '../../../../shared/display'
import type { CustomTaskState } from '../../../../shared/customTasks'
import { checkGear, gearHint, type GearCheck } from '../../model/gear'
import { nextStep, type NextStep } from '../../model/plan'
import { rosterRows } from '../../model/dashboard'
import { characterTasks } from '../../model/tasks'
import {
  characterState,
  raidKills,
  stateChip,
  stateWord,
  weeklyProgress,
  type CharacterState,
  type RaidKills,
  type WeeklyProgress
} from '../../model/overview'
import { TaskState } from '../../enums/taskState'
import { Severity } from '../../enums/severity'
import type { ListTip } from '../../model/listTip'
import type { StateWord } from '../../enums/stateWord'
import type { ChipModel } from '../ui/Chip'

/** A figure and which way it moved over the trend window; 0 where there is no history. */
export interface TableFigure {
  value: number | null
  change: number
}

/** The week's lines in one cell: how many are open, of how many, and the open ones behind it - the task list's own count. */
export interface TableTasks {
  open: number
  total: number
  /** The count as the heading, an open line on each row with the note the list shows beside it. */
  tip: ListTip
}

export interface TableRow {
  character: CharacterSnapshot
  state: CharacterState
  progress: WeeklyProgress
  /** Hidden from the overview by the user; still a row, drawn quiet. */
  hidden: boolean
  itemLevel: TableFigure
  rating: TableFigure
  kills: RaidKills
  /** The cell's tooltip: a raid lockout on each row with its kills; null without one. */
  raidTip: ListTip | null
  /** Null where the character has no chore of the kind at all. */
  tasks: TableTasks | null
  gear: GearCheck
  gearTip: ListTip
  /** The one word for the week, or null mid-week - then the step says what is next. */
  word: StateWord | null
  /** The word as a chip. */
  chip: ChipModel | null
  step: NextStep
}

export interface TableInputs {
  characters: CharacterSnapshot[]
  hiddenKeys: Set<string>
  history: CharacterHistory
  flags: DisplayFlags
  goals: Goal[]
  maxLevel: number
  resetAt: number
  now: number
  /** The user's own chores and their ticks, for the lines the list counts. */
  custom: CustomTaskState | null
  /** The player's own minimums of the supplies, for the errands the list counts. */
  minimums: AppConfig['supplyMinimums'] | null
  /** The season's dungeons, so the step can name the one never run. */
  dungeons?: SeasonDungeon[]
}

function figure(
  value: number | null,
  history: CharacterPoint[] | undefined,
  pick: (point: CharacterPoint) => number | null,
  days: number,
  now: number
): TableFigure {
  const series = trend(history, pick, days, now)
  return { value, change: series ? Math.round(series.change) : 0 }
}

/**
 * The raid cell's tip: the week's raid lockouts, one on each row with its
 * difficulty and its kills - green when the raid is cleared. Null without
 * a raid lockout, so the cell stays quiet.
 */
export function raidTip(tr: Translator, character: Pick<CharacterSnapshot, 'lockouts'>): ListTip | null {
  const raids = character.lockouts.filter((lock) => lock.isRaid)
  if (raids.length === 0) return null
  const kills = raidKills(character)
  return {
    // An unknown total (see the card's chips) shows the kills alone rather than "4/0".
    heading: kills.total > 0 ? tr.t('table.raidsHint', { defeated: kills.defeated, total: kills.total }) : tr.t('table.raids'),
    rows: raids.map((lock) => ({
      label: `${lock.name} · ${difficultyLabel(tr, lock.difficultyId, lock.difficulty, true)}`,
      value: lock.total > 0 ? `${lock.defeated}/${lock.total}` : String(lock.defeated),
      tone: lock.total > 0 && lock.defeated === lock.total ? Severity.Ok : Severity.Warn
    }))
  }
}

export function tableRows(tr: Translator, inputs: TableInputs): TableRow[] {
  const {
    characters,
    hiddenKeys,
    history,
    flags = DISPLAY_DEFAULTS,
    goals,
    maxLevel,
    resetAt,
    now,
    custom,
    minimums,
    dungeons = []
  } = inputs
  // The rows the list reads, by key: the cell counts what the list lists.
  const rows = new Map(rosterRows(characters, goals, maxLevel, resetAt, tr, flags, dungeons).map((row) => [row.character.key, row]))
  return characters.map((character) => {
    const progress = weeklyProgress(character, goals, flags)
    const state = characterState(character, maxLevel, resetAt)
    // The arrows are only for the readings the table is asked for.
    const series = flags.trend ? history[character.key] : undefined
    // Every line of the task list in one cell, the open ones in the tooltip:
    // the same lines, so the cell and the list never disagree.
    const lines = characterTasks(tr, rows.get(character.key)!, flags, custom, minimums, now)
    const open = lines.filter((task) => task.state !== TaskState.Done && task.state !== TaskState.Paid)
    const gear = checkGear(character, flags)
    return {
      character,
      state,
      progress,
      hidden: hiddenKeys.has(character.key),
      itemLevel: figure(character.itemLevel, series, (point) => point.itemLevel, TREND_DAYS, now),
      rating: figure(character.mythicRating, series, (point) => point.rating, TREND_DAYS, now),
      kills: raidKills(character),
      raidTip: raidTip(tr, character),
      tasks:
        lines.length === 0 || state.levelling
          ? null
          : {
              open: open.length,
              total: lines.length,
              tip: {
                heading: tr.t('table.weekliesHint', { open: open.length, total: lines.length }),
                rows: open.map((task) => ({ label: task.label, value: task.note ?? '', tone: Severity.Warn }))
              }
            },
      gear,
      gearTip: gearHint(tr, gear),
      word: stateWord(state, progress.done),
      chip: stateChip(tr, state, progress.done, character.level),
      step: nextStep(character, progress, state.levelling, tr, flags, dungeons)
    }
  })
}
