import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import './CraftTier'

interface Args {
  tier: number
}

const meta: Meta<Args> = {
  title: 'Shared/CraftTier',
  component: 'wt-craft-tier',
  args: { tier: 3 },
  argTypes: { tier: { control: { type: 'range', min: 1, max: 5 } } },
  render: (args) => html`<wt-craft-tier tier=${args.tier}></wt-craft-tier>`
}

export default meta

/** One tier's mark. */
export const One: StoryObj<Args> = {}

/** The five tiers side by side, and the none that draws nothing. */
export const All: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; gap: var(--s3); align-items: center">
      ${[1, 2, 3, 4, 5].map((tier) => html`<wt-craft-tier tier=${tier}></wt-craft-tier>`)}<wt-craft-tier></wt-craft-tier
      ><span class="tiny muted">(none)</span>
    </div>`
}
