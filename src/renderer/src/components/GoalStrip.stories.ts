import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { evaluateGoals } from '../model/overview'
import { GoalKind } from '../../../shared/enums/goalKind'
import { ALT_UNCLAIMED, CONFIG, MAIN } from '../stories/fixtures'
import './GoalStrip'
import './ui/Card'

interface Args {
  small: boolean
}

const meta: Meta<Args> = {
  title: 'Shared/GoalStrip',
  component: 'wt-goal-strip',
  args: { small: false },
  render: (args) =>
    html`<wt-card class="panel">
      <wt-goal-strip ?small=${args.small} .goals=${evaluateGoals(MAIN, CONFIG.goals)}></wt-goal-strip>
    </wt-card>`
}

export default meta

/** The goals of a character mid-week: one met, one still short. */
export const Mixed: StoryObj<Args> = {}

/** Every goal met - the tick is what the roster is scanned for. */
export const Met: StoryObj<Args> = {
  render: () =>
    html`<wt-card class="panel">
      <wt-goal-strip .goals=${evaluateGoals(MAIN, [{ id: 'runs', kind: GoalKind.MythicRuns, target: 1 }])}></wt-goal-strip>
    </wt-card>`
}

/** The chips a shade smaller: what a tile and a card carry. */
export const Small: StoryObj<Args> = {
  args: { small: true },
  render: (args) =>
    html`<wt-card class="panel">
      <wt-goal-strip ?small=${args.small} .goals=${evaluateGoals(ALT_UNCLAIMED, CONFIG.goals)}></wt-goal-strip>
    </wt-card>`
}
