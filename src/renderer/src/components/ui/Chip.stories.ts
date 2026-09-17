import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { ICON_NAMES, type IconName } from '../Icon'
import { CHIP_TONES, type ChipTone } from './Chip'
import { Severity } from '../../enums/severity'
import { Tint } from '../../enums/tint'
import './Chip'
import './Chips'

interface Args {
  label: string
  icon?: IconName
  note?: string
  tone?: ChipTone
  small: boolean
  numeric: boolean
  numericNote: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Chip',
  component: 'wt-chip',
  args: { label: 'Liberation of Undermine HC', note: '4/8', small: false, numeric: false, numericNote: true },
  argTypes: {
    icon: { control: 'select', options: [undefined, ...ICON_NAMES] },
    tone: { control: 'radio', options: [undefined, ...CHIP_TONES] }
  },
  render: (args) =>
    html`<wt-chip
      label=${args.label}
      icon=${args.icon ?? nothing}
      .note=${args.note || undefined}
      tone=${args.tone ?? nothing}
      ?small=${args.small}
      ?numeric=${args.numeric}
      ?numeric-note=${args.numericNote}
    ></wt-chip>`
}

export default meta

export const Lockout: StoryObj<Args> = {}
export const Ok: StoryObj<Args> = { args: { label: 'Midnight: Dungeons', tone: Severity.Ok, icon: 'check', note: undefined } }
export const Warn: StoryObj<Args> = { args: { label: 'Vault-Fächer', tone: Severity.Warn, icon: 'dot', note: '5/6' } }
/** A loss: a reward that is gone at the reset, a run that failed. */
export const Danger: StoryObj<Args> = { args: { label: 'Vault verfallen', tone: Severity.Danger, icon: 'alert', note: undefined } }
export const Run: StoryObj<Args> = { args: { label: '+12', numeric: true, note: 'CM', numericNote: false } }
export const Quiet: StoryObj<Args> = {
  args: { label: '+12', numeric: true, tone: Tint.Quiet, icon: 'clock', note: 'CM', numericNote: false }
}
export const Small: StoryObj<Args> = {
  args: { label: 'Timewalking: Legion', small: true, icon: 'calendar', note: 'bis Do., 00:32', numericNote: false }
}

/** A row of chips, wrapping. */
export const Row: StoryObj<Args> = {
  render: () =>
    html`<wt-chips style="max-width: 420px">
      <wt-chip numeric label="+13" note="AKCE" tone=${Severity.Ok}></wt-chip>
      <wt-chip numeric label="+12" note="TD" tone=${Severity.Ok}></wt-chip>
      <wt-chip numeric label="+12" note="CM" tone=${Tint.Quiet} icon="clock"></wt-chip>
      <wt-chip label="Gobfather" tone=${Severity.Ok} icon="check"></wt-chip>
      <wt-chip label="Champion Mistcrest" numeric note="62 / 90 · 62/90"></wt-chip>
      <wt-chip small icon="calendar" label="Darkmoon Faire" note="bis Di., 03:32"></wt-chip>
    </wt-chips>`
}

/** The one thing to shout about, and the keystone in its own colour. */
export const Accent: StoryObj<Args> = { args: { label: 'Vault abholen', icon: 'vault', tone: Tint.Accent, note: undefined } }
export const Key: StoryObj<Args> = {
  args: { label: '+14', icon: 'keystone', tone: Tint.Key, numeric: true, note: 'TD', numericNote: false }
}

/** No tone: a word beside a name, a source's addon found or not. */
export const Plain: StoryObj<Args> = {
  render: () =>
    html`<div class="row">
      <wt-chip label="WOW1" data-tip="WTF-Account"></wt-chip>
      <wt-chip label="Stufe 74"></wt-chip>
      <wt-chip icon="check" label="Addon installiert"></wt-chip>
      <wt-chip icon="close" label="Addon nicht gefunden"></wt-chip>
    </div>`
}
