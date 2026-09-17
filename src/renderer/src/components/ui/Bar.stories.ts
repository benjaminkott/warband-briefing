import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { BarKind } from '../../enums/barKind'
import './Bar'
import './Chip'

interface Args {
  percent: number
  kind: BarKind
  warn: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Bar',
  component: 'wt-bar',
  args: { percent: 62, kind: BarKind.Bar, warn: false },
  argTypes: {
    percent: { control: { type: 'range', min: 0, max: 100 } },
    kind: { control: 'radio', options: Object.values(BarKind) }
  },
  render: (args) =>
    html`<div style="max-width: 320px; position: relative; min-height: 8px">
      <wt-bar percent=${args.percent} kind=${args.kind} ?warn=${args.warn}></wt-bar>
    </div>`
}

export default meta

export const Track: StoryObj<Args> = {}
export const Full: StoryObj<Args> = { args: { percent: 100, warn: true } }
export const InAChip: StoryObj<Args> = {
  render: (args) =>
    html`<wt-chip
      .label=${html`Silvermoon Court<strong>24</strong><wt-bar kind=${BarKind.Chip} percent=${args.percent}></wt-bar>`}
    ></wt-chip>`
}

/** The xp bar of a levelling character: the rested band rides on the same track, the `xp-bar` class sizes it. */
export const WithRested: StoryObj<Args> = {
  args: { percent: 42 },
  render: (args) =>
    html`<div style="max-width: 320px">
      <wt-bar class="xp-bar" percent=${args.percent} rested="30"></wt-bar>
    </div>`
}
