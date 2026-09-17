/**
 * What a card says about its character, worked out without a DOM: the
 * week's progress and state, the trends under the figures, and the step
 * the plan picks. The card only draws this.
 */

import type { CharacterPoint, CharacterSnapshot, Goal, SeasonDungeon } from '../../../../shared/types'
import { trend, type TrendSeries } from '../../../../shared/charHistory'
import { TREND_DAYS, type DisplayFlags } from '../../../../shared/display'
import type { Translator } from '../../../../shared/i18n'
import { nextStep, type NextStep } from '../../model/plan'
import { characterState, tokenAmount, weeklyProgress, type CharacterState, type WeeklyProgress } from '../../model/overview'
import { seasonToken } from '../../../../shared/seasonCatalog'

export interface CardModel {
  progress: WeeklyProgress
  state: CharacterState
  /** The one errand, in the board's words. */
  step: NextStep
  ilvlTrend: TrendSeries | null
  ratingTrend: TrendSeries | null
  /** The season's token in the card's corner: its id for the icon, the count, the word and the name for the tip; null while the season names none. */
  token: { id: number; label: string; amount: number | null; tip: string } | null
}

export interface CardInputs {
  character: CharacterSnapshot
  flags: DisplayFlags
  goals: Goal[]
  maxLevel: number
  resetAt: number
  history: CharacterPoint[] | undefined
  /** The season's dungeons, so the dungeon step can name one never run. */
  dungeons?: SeasonDungeon[]
  now?: number
}

export function cardModel(tr: Translator, inputs: CardInputs): CardModel {
  const { character, flags, goals, maxLevel, resetAt, history, dungeons = [] } = inputs
  const now = inputs.now ?? Date.now()

  const progress = weeklyProgress(character, goals, flags)
  const state = characterState(character, maxLevel, resetAt)
  const step = nextStep(character, progress, state.levelling, tr, flags, dungeons)

  const ilvlTrend = flags.trend ? trend(history, (point) => point.itemLevel, TREND_DAYS, now) : null
  const ratingTrend = flags.trend ? trend(history, (point) => point.rating, TREND_DAYS, now) : null

  const season = seasonToken()
  // A character still levelling holds none worth a count; the dash says so.
  const token = season
    ? { id: season.id, label: season.figure!, amount: state.levelling ? null : tokenAmount(character), tip: season.name }
    : null

  return { progress, state, step, ilvlTrend, ratingTrend, token }
}
