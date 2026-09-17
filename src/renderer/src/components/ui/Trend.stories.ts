import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import './Trend'
import '../StatTile'

interface Args {
  change: number
  days?: number
}

const meta: Meta<Args> = {
  title: 'UI/Trend',
  component: 'wt-trend',
  args: { change: 12, days: 30 },
  argTypes: { change: { control: { type: 'number' } }, days: { control: { type: 'number' } } },
  render: (args) => html`<wt-trend .change=${args.change} .days=${args.days}></wt-trend>`
}

export default meta

/** Up, in green, with the days in the tooltip. */
export const Up: StoryObj<Args> = {}

/** Down, in red. */
export const Down: StoryObj<Args> = { args: { change: -8 } }

/** Flat: no arrow, the quiet ink. */
export const Flat: StoryObj<Args> = { args: { change: 0 } }

/** The three places that draw it, each in its own type: the card band, the stat tile, the character page's figure. */
export const Places: StoryObj<Args> = {
  render: () =>
    html`<div class="row">
      <span class="card-figure-value num">628 <wt-trend class="card-figure-trend" change="12" days="30"></wt-trend></span>
      <wt-stat-tile label="Gold" .value=${2324008} .trend=${{ change: -3, days: 7 }} style="width: 160px"></wt-stat-tile>
      <wt-trend class="detail-figure-delta" change="12">+12 seit 11. März 2026</wt-trend>
    </div>`
}
