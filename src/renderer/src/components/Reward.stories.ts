import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { DISPLAY_DEFAULTS } from '../../../shared/display'
import { bestGap, gapReward } from '../model/plan'
import { weeklyProgress } from '../model/overview'
import { CONFIG, MAIN, ROSTER } from '../stories/fixtures'
import './Reward'

interface Args {
  level: number
  gain: number | null
  compact: boolean
}

const meta: Meta<Args> = {
  title: 'Shared/Reward',
  component: 'wt-reward',
  args: { level: 678, gain: 2, compact: false },
  render: (args) => html`<wt-reward .reward=${{ level: args.level, gain: args.gain }} ?compact=${args.compact}></wt-reward>`
}

export default meta

/** What a vault slot pays: the level with its unit, the gain over the character in the accent. */
export const One: StoryObj<Args> = {}

/** No gain, or none known: the level alone. A reward nobody priced draws nothing at all. */
export const Levels: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; gap: var(--s4); align-items: baseline">
      <wt-reward .reward=${{ level: 678, gain: 12 }}></wt-reward>
      <wt-reward .reward=${{ level: 665, gain: 0 }}></wt-reward>
      <wt-reward .reward=${{ level: 672, gain: null }}></wt-reward>
      <wt-reward .reward=${null}></wt-reward><span class="faint tiny">(none: nothing)</span>
    </div>`
}

/** The level alone, for a grid cell; the tooltip says the rest. */
export const Compact: StoryObj<Args> = { args: { compact: true } }

/** The slot the plan picks for each character of the fixture roster. */
export const Roster: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s2)">
      ${ROSTER.map((character) => {
        const gap = bestGap(weeklyProgress(character, CONFIG.goals, DISPLAY_DEFAULTS).vaultRows, character.itemLevel)
        return html`<div style="display: flex; gap: var(--s4)">
          <span style="width: 8em">${character.name}</span><wt-reward .reward=${gap ? gapReward(gap) : null}></wt-reward>
        </div>`
      })}
      <span class="faint tiny">${MAIN.name}'s reward is the one the evening's plan names.</span>
    </div>`
}
