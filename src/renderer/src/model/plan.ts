/**
 * The plan: what a character does next, and which character goes first.
 *
 * The overview measures the week (`overview.ts`), the dashboard and the task
 * list show it. Between the two sits one question both have to answer the
 * same way: of everything still open, what is worth doing first? This
 * module owns that answer. It prices a vault slot in the two units a player
 * acts in - how many actions it takes and how much item level it pays -
 * and ranks by pay-out first, actions second. The dashboard sorts its rows
 * by it, the tile and the card name the step it picks, the task list
 * explains a vault line with it. Nothing here re-derives progress.
 *
 * The rule is one function, `compareValue`, so a later refinement - a role
 * per character, a weight per row - changes one place.
 */

import type { CharacterSnapshot, SeasonDungeon, VaultRow } from '../../../shared/types'
import { priceVaultRow, type VaultGapStep } from '../../../shared/vault'
import type { Translator } from '../../../shared/i18n'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../shared/display'
import { VAULT_LABEL_KEYS } from './labels'
import { hasUnclaimedVault, type WeeklyProgress } from './overview'
import { DEFAULT_EVENING_MINUTES, seasonMinutes, vaultStepMinutes } from '../../../shared/effort'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { StepTone } from '../enums/stepTone'
import { keyToRun, type KeyToRun } from './dungeons'

export { priceVaultRow, type VaultGapStep } from '../../../shared/vault'

/** What the ranking reads off a step or a row: pay-out and price. */
export interface Valued {
  /** Item level the next step pays over the character; null where nobody priced it. */
  gain: number | null
  /** Actions the next step takes; `Infinity` where there is none. */
  cost: number
}

/**
 * The order of the plan: the biggest pay-out first, then the fewest
 * actions. "Fewest" is counted in the step's own unit - a dungeon, a boss
 * kill, a world activity - because that is the unit the player acts in. A
 * step nobody has priced counts as a gain of nothing: it ranks below a
 * step known to pay, above one known to pay less than the character
 * already wears. Negative means `a` comes first.
 */
export function compareValue(a: Valued, b: Valued): number {
  return (b.gain ?? 0) - (a.gain ?? 0) || a.cost - b.cost
}

/**
 * The vault slot worth filling first, by `compareValue`; null means the
 * vault is full. With `within`, only a slot that fits into that many
 * minutes counts: the evening asks for the best step it has room for,
 * not the best step there is.
 */
export function bestGap(vaultRows: VaultRow[], itemLevel: number | null, within = Infinity): VaultGapStep | null {
  const minutes = seasonMinutes()
  let best: VaultGapStep | null = null
  for (const row of vaultRows) {
    const gap = priceVaultRow(row, itemLevel)
    if (!gap || vaultStepMinutes(gap.category, gap.missing, minutes) > within) continue
    if (!best || compareValue({ gain: gap.gain, cost: gap.missing }, { gain: best.gain, cost: best.missing }) < 0) best = gap
  }
  return best
}

/**
 * Why a vault step, in parts: a view with room sets each in a column of its
 * own, a view without shows the one sentence `detail` makes of them.
 */
/** What a vault slot pays: the reward's level, and how far over the character where known. */
export interface Reward {
  level: number
  /** The level over the character's item level; null where the character has none. */
  gain: number | null
}

export interface StepReason {
  /** The vault row and the slot the step fills: "Dungeons · slot 2 of 3". */
  slot: string
  /** The slot alone, as a note beside the words that already name the row: "slot 2 of 3". */
  note: string
  /** What the slot pays, and how far over the character where a source priced it. */
  reward: Reward | null
  /** The key that fills the slot with the most rating to gain; only the dungeon row names one. */
  key: KeyToRun | null
}

/** The one thing left to do, in words, and how urgent it is. */
export interface NextStep {
  /** Translation key with its plural handled - the caller only renders `text`. */
  text: string
  /**
   * Why this step and what it is worth, as one sentence: the vault row and
   * slot it fills, the pay-out over the character's item level, the key to
   * run. Null for a step that needs no reason.
   */
  detail: string | null
  /** The same reason in parts. Null with `detail`. */
  reason: StepReason | null
  tone: StepTone
  icon: 'vault' | 'chevronUp' | 'scroll' | 'shield' | 'check'
  /** What the step takes, in minutes, by the season's figures; null for a step that is none. */
  minutes: number | null
}

/** The slot of a gap alone: "slot 2 of 3". A task line and the evening's plan set it beside the row's words. */
export function gapNote(gap: VaultGapStep, tr: Translator): string {
  return tr.t('tasks.vaultSlot', { slot: gap.slot, slots: gap.slots })
}

/** The row and the slot of a gap: "Dungeons · slot 2 of 3". */
export function gapSlot(gap: VaultGapStep, tr: Translator): string {
  return `${tr.t(VAULT_LABEL_KEYS[gap.category])} · ${gapNote(gap, tr)}`
}

/** The pay-out of a reward in words: "reward item level 710, +12"; the gain only where there is one. */
export function rewardText(reward: Reward, tr: Translator): string {
  return reward.gain !== null && reward.gain > 0
    ? tr.t('dash.steps.gain', { level: tr.formatNumber(reward.level), gain: tr.formatNumber(reward.gain) })
    : tr.t('dash.steps.reward', { level: tr.formatNumber(reward.level) })
}

/** The key to run in words: "weakest key: Ara-Kara +12 - the most rating to gain is here"; a dungeon never run says so. */
export function keyText(key: KeyToRun, tr: Translator): string {
  return key.best
    ? tr.t('dash.steps.key', { dungeon: key.dungeon.name, level: key.best.level })
    : tr.t('dash.steps.unrun', { dungeon: key.dungeon.name })
}

/** The key to run, named: "weakest key: Ara-Kara +12" - for a line; the sentence is its tip. */
export function keyLabel(key: KeyToRun, tr: Translator): string {
  return key.best
    ? tr.t('dash.steps.weakestKey', { dungeon: key.dungeon.name, level: key.best.level })
    : tr.t('dash.steps.unrunKey', { dungeon: key.dungeon.name })
}

/** The reward of a gap as the reason carries it; null where no source priced the slot. */
export function gapReward(gap: VaultGapStep): Reward | null {
  return gap.rewardItemLevel === null ? null : { level: gap.rewardItemLevel, gain: gap.gain }
}

/** The reason line of a vault step: "Dungeons · slot 2 of 3 · reward item level 710, +12". */
export function gapDetail(gap: VaultGapStep, tr: Translator): string {
  return reasonText({ slot: gapSlot(gap, tr), note: gapNote(gap, tr), reward: gapReward(gap), key: null }, tr)
}

/** The reason as one sentence, its parts joined the way the tooltips read them. */
export function reasonText(reason: StepReason, tr: Translator): string {
  const parts = [reason.slot]
  if (reason.reward) parts.push(rewardText(reason.reward, tr))
  if (reason.key) parts.push(keyText(reason.key, tr))
  return parts.join(' · ')
}

/**
 * What a character should do next, worked out once for the tile, the list
 * row and the card's head - so no two views can name a different errand. A
 * reward already in the vault is the whole errand; below it the vault slot
 * that pays the most, then the user's own weeklies, then a bare gear slot.
 */
export function nextStep(
  character: CharacterSnapshot,
  progress: WeeklyProgress,
  levelling: boolean,
  tr: Translator,
  flags: DisplayFlags = DISPLAY_DEFAULTS,
  dungeons: SeasonDungeon[] = []
): NextStep {
  return stepWithin(character, progress, levelling, tr, flags, Infinity, dungeons)!
}

/**
 * The same step, held to an evening: the best of what fits into `within`
 * minutes. A slot that takes four dungeons is not tonight's, but the two
 * raid bosses beside it may be - so the vault is asked again for the best
 * slot that fits, and only then the quests and the gear. Null when nothing
 * the character has fits; without a limit there is always a step.
 */
export function stepWithin(
  character: CharacterSnapshot,
  progress: WeeklyProgress,
  levelling: boolean,
  tr: Translator,
  flags: DisplayFlags,
  within: number,
  dungeons: SeasonDungeon[] = []
): NextStep | null {
  const minutes = seasonMinutes()
  // The reward is the one step that is never too long: it is two minutes.
  if (hasUnclaimedVault(character)) {
    return { text: tr.t('card.unclaimed'), detail: null, reason: null, tone: StepTone.Claim, icon: 'vault', minutes: minutes.claim }
  }
  if (levelling) {
    return {
      text: tr.t('card.level', { level: character.level }),
      detail: null,
      reason: null,
      tone: StepTone.Quiet,
      icon: 'chevronUp',
      minutes: null
    }
  }
  // The user's goals are the finish line: a character that has met them
  // is not asked for another slot - the list still shows the rows, the
  // plan does not push them. With no goals, the vault itself is the line.
  const goalsMet = progress.goals.length > 0 && progress.goals.every((goal) => goal.done)
  const gap = goalsMet ? null : bestGap(progress.vaultRows, character.itemLevel, within)
  if (gap) {
    // For the dungeon row the step can say which key: the one with the most
    // rating to gain fills the slot and lifts the score in one run.
    const key = gap.category === VaultCategory.Dungeon ? keyToRun(character.dungeonBests ?? [], dungeons) : null
    const reason: StepReason = { slot: gapSlot(gap, tr), note: gapNote(gap, tr), reward: gapReward(gap), key }
    return {
      text: tr.plural(`vault.gap.${gap.category}`, gap.missing),
      detail: reasonText(reason, tr),
      reason,
      tone: StepTone.Open,
      icon: 'chevronUp',
      minutes: vaultStepMinutes(gap.category, gap.missing, minutes)
    }
  }
  const weeklies = progress.openWeeklies * minutes.weekly
  if (progress.openWeeklies > 0 && weeklies <= within) {
    return {
      text: tr.plural('dash.steps.weekly', progress.openWeeklies),
      detail: null,
      reason: null,
      tone: StepTone.Open,
      icon: 'scroll',
      minutes: weeklies
    }
  }
  const gear = progress.gearIssues * minutes.gear
  if (progress.gearIssues > 0 && gear <= within) {
    return {
      text: tr.plural('dash.steps.gear', progress.gearIssues),
      detail: null,
      reason: null,
      tone: StepTone.Open,
      icon: 'shield',
      minutes: gear
    }
  }
  // Something is open, but nothing of it fits the evening.
  if (
    within !== Infinity &&
    ((!goalsMet && progress.vaultRows.some((row) => priceVaultRow(row, character.itemLevel))) ||
      progress.openWeeklies > 0 ||
      progress.gearIssues > 0)
  )
    return null
  return { text: tr.t('card.weekDone'), detail: null, reason: null, tone: StepTone.Done, icon: 'check', minutes: null }
}

/** What the evening's plan reads off a roster row; `RosterRow` has all of it. */
export interface PlanRow {
  character: CharacterSnapshot
  progress: WeeklyProgress
  levelling: boolean
  /** The season's dungeons, so the dungeon step can name one never run. */
  dungeons: SeasonDungeon[]
}

/** One line of the evening: who, what for, and whether it fits the evening. */
export interface PlanEntry {
  character: CharacterSnapshot
  step: NextStep
  /** False on a line the evening has no room for: what comes after, said so the list is not shorter than the week. */
  fits: boolean
}

/** The most lines an evening lists: a plan, not the whole list again. */
export const EVENING_LINES = 5
/** The fewest, where the week has them: what comes after the evening fills the list up to here. */
const EVENING_LINES_MIN = 3

const takesStep = (step: NextStep | null): step is NextStep =>
  step !== null && (step.tone === StepTone.Claim || step.tone === StepTone.Open)

/**
 * The evening's plan: the characters worth logging into, each with its
 * step, as many as fit the evening. The rows come in the board's order -
 * a reward waiting first, then the biggest pay-out - and each row is
 * asked for the best step that fits into what is left of the budget: a
 * slot that takes four dungeons is passed over for the two raid bosses
 * beside it, or for the next character's turn-in. Skipped altogether is
 * what has no step to take: a character done for the week, one describing
 * last week, one still levelling. Below three lines the plan goes on with
 * what does not fit, marked so - the evening is short, the week is not.
 */
export function eveningPlan(
  rows: PlanRow[],
  tr: Translator,
  flags: DisplayFlags = DISPLAY_DEFAULTS,
  budget = DEFAULT_EVENING_MINUTES
): PlanEntry[] {
  const plan: PlanEntry[] = []
  const passed: PlanRow[] = []
  let left = budget
  for (const row of rows) {
    if (row.levelling || row.character.stale) continue
    if (plan.length >= EVENING_LINES) break
    const step = stepWithin(row.character, row.progress, row.levelling, tr, flags, left, row.dungeons)
    if (takesStep(step)) {
      plan.push({ character: row.character, step, fits: true })
      left -= step.minutes ?? 0
    } else if (step === null) {
      passed.push(row)
    }
  }
  for (const row of passed) {
    if (plan.length >= EVENING_LINES_MIN) break
    const step = nextStep(row.character, row.progress, row.levelling, tr, flags, row.dungeons)
    if (takesStep(step)) plan.push({ character: row.character, step, fits: false })
  }
  return plan
}

/** What the lines that fit take together, in minutes. */
export function planMinutes(plan: readonly PlanEntry[]): number {
  return plan.reduce((sum, entry) => sum + (entry.fits ? (entry.step.minutes ?? 0) : 0), 0)
}

/**
 * What a character's next step is worth and what it costs, for the order
 * of a roster: the slot the plan picks, or - with the vault full - one
 * action for an open weekly or a bare gear slot, or nothing at all. A bare
 * slot counts only where the board is asked to call it a step.
 */
export function planValue(character: CharacterSnapshot, progress: WeeklyProgress, flags: DisplayFlags = DISPLAY_DEFAULTS): Valued {
  const gap = bestGap(progress.vaultRows, character.itemLevel)
  const gearIssues = progress.gearIssues
  return {
    gain: gap?.gain ?? null,
    cost: gap ? gap.missing : progress.openWeeklies > 0 || gearIssues > 0 ? 1 : Infinity
  }
}
