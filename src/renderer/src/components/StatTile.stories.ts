import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { ICON_NAMES, type IconName } from './Icon'
import { STAT_TONES, type StatTone } from './StatTile'
import { StatKind } from '../enums/statKind'
import { Tint } from '../enums/tint'
import { Severity } from '../enums/severity'
import './StatTile'
import './ui/Card'

interface Args {
  icon: IconName
  label: string
  value: number
  of?: number
  unit?: string
  foot?: string
  tone?: StatTone
  link: boolean
}

const meta: Meta<Args> = {
  title: 'Shared/StatTile',
  component: 'wt-stat-tile',
  args: { icon: 'vault', label: 'Schatzkammer', value: 14, of: 27, link: false },
  argTypes: {
    icon: { control: 'select', options: ICON_NAMES },
    tone: { control: 'select', options: [undefined, ...STAT_TONES] }
  },
  render: (args) =>
    html`<div class="summary-bar" style="max-width: 400px">
      <wt-stat-tile
        icon=${args.icon}
        .label=${args.label}
        .value=${args.value}
        .of=${args.of}
        unit=${args.unit ?? nothing}
        .foot=${args.foot}
        tone=${args.tone ?? nothing}
        ?link=${args.link}
      ></wt-stat-tile>
    </div>`
}

export default meta

/** The tile: a number the tile formats itself, an optional "/ of", the caption with its mark. */
export const Figure: StoryObj<Args> = {}
/** The warning ink on the figure alone - something is open. */
export const Warn: StoryObj<Args> = { args: { icon: 'scroll', label: 'Aufgaben offen', value: 7, of: undefined, tone: Severity.Warn } }
/** A unit is one word with its figure: the same distance whether it is a duration or gold. */
export const Units: StoryObj<Args> = {
  render: () =>
    html`<div class="summary-bar" style="max-width: 640px">
      <wt-stat-tile
        icon="clock"
        label="Spielzeit gesamt"
        .value=${[
          { value: 87, unit: 'T' },
          { value: 18, unit: 'Std' }
        ]}
      ></wt-stat-tile>
      <wt-stat-tile
        icon="clock"
        label="Reset in"
        .value=${[
          { value: 4, unit: 'T' },
          { value: 21, unit: 'h' }
        ]}
      ></wt-stat-tile>
      <wt-stat-tile icon="coins" label="Gold" .value=${2324008} unit="G" tone=${Tint.Gold}></wt-stat-tile>
    </div>`
}
/** The whole box in the warning colours - a reward that is lost at the reset. */
export const Claim: StoryObj<Args> = {
  render: () =>
    html`<div class="summary-bar" style="max-width: 400px">
      <wt-stat-tile icon="vault" label="Vault abzuholen" .value=${1} foot="verfällt beim Reset" claim></wt-stat-tile>
    </div>`
}
/** The gold figure as the summary bar and the KPI row set it: the gold tone, the month's movement, a link to the gold view. */
export const Gold: StoryObj<Args> = {
  render: () =>
    html`<div class="summary-bar" style="max-width: 320px">
      <wt-stat-tile
        icon="coins"
        label="Gold gesamt"
        .value=${2324008}
        .trend=${{ change: 184200, days: 30 }}
        tone=${Tint.Gold}
        data-tip="Goldverlauf ansehen"
        link
      ></wt-stat-tile>
    </div>`
}
/** How a figure moved: the arrow and the change in the third line, the days in the tooltip. */
export const Trend: StoryObj<Args> = {
  render: () =>
    html`<div class="summary-bar" style="max-width: 640px">
      <wt-stat-tile
        icon="coins"
        label="Gold gesamt"
        .value=${2324008}
        .trend=${{ change: 184200, days: 30 }}
        tone=${Tint.Gold}
      ></wt-stat-tile>
      <wt-stat-tile
        icon="coins"
        label="Gold gesamt"
        .value=${2324008}
        .trend=${{ change: -52300, days: 7 }}
        tone=${Tint.Gold}
      ></wt-stat-tile>
      <wt-stat-tile icon="coins" label="Gold gesamt" .value=${2324008} .trend=${{ change: 0, days: 7 }} tone=${Tint.Gold}></wt-stat-tile>
    </div>`
}

/** The board's row of five: no mark, a bar or a note in the third row; the last one is a link. */
export const Row: StoryObj<Args> = {
  render: () =>
    html`<div class="dash">
      <div class="kpi-row">
        <wt-stat-tile .value=${6} .of=${18} label="Vault-Fächer diese Woche" bar=${6 / 18}></wt-stat-tile>
        <wt-stat-tile .value=${4} label="M+ Runs · Schlüssel Ø +12" foot="4 Raid-Bosse"></wt-stat-tile>
        <wt-stat-tile .value=${1} label="Vault abzuholen — Mirella" foot="verfällt beim Reset" claim></wt-stat-tile>
        <wt-stat-tile
          .value=${[
            { value: 4, unit: 'T' },
            { value: 21, unit: 'h' }
          ]}
          label="Reset in"
          foot="6 offen"
        ></wt-stat-tile>
        <wt-stat-tile .value=${2324008} label="Gold gesamt" .trend=${{ change: 450000, days: 30 }} tone=${Tint.Gold} link></wt-stat-tile>
      </div>
    </div>`
}

/** The bare cell of the character page's hero band: the number over its caption, no box. */
export const Cell: StoryObj<Args> = {
  render: () =>
    html`<div class="detail">
      <wt-card class="panel detail-hero"
        ><div class="detail-stats">
          <wt-stat-tile kind=${StatKind.Cell} icon="target" label="ilvl" .value=${676}></wt-stat-tile>
          <wt-stat-tile kind=${StatKind.Cell} icon="keystone" label="Score" .value=${2841}></wt-stat-tile>
          <wt-stat-tile kind=${StatKind.Cell} icon="coins" label="Gold" .value=${412805}></wt-stat-tile></div
      ></wt-card>
    </div>`
}
