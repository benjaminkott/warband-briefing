import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ICON_NAMES, type IconName } from '../Icon'
import './Select'
import './Button'
import './FieldGroup'
import './Input'
import './Hint'

interface Args {
  icon: IconName
  label: string
  narrow: boolean
}

const meta: Meta<Args> = {
  title: 'UI/FieldGroup',
  component: 'wt-field-group',
  args: { icon: 'folder', label: 'WoW-Ordner', narrow: false },
  argTypes: { icon: { control: 'select', options: ICON_NAMES } },
  render: (args) =>
    html`<wt-field-group style="max-width: 560px" icon=${args.icon} label=${args.label} ?narrow=${args.narrow}>
      <wt-input control-id="demo" code value="C:\\Program Files (x86)\\World of Warcraft\\_retail_"></wt-input>
    </wt-field-group>`
}

export default meta

/** The label with its mark beside the control, as the settings set them. */
export const Text: StoryObj<Args> = {}

/** The short field beside a button. */
export const Narrow: StoryObj<Args> = {
  args: { icon: 'globe', label: 'Region', narrow: true },
  render: (args) =>
    html`<div class="row" style="max-width: 560px">
      <wt-button icon="folder" label="Ordner wählen…"></wt-button>
      <div class="spacer"></div>
      <wt-field-group icon=${args.icon} label=${args.label} narrow>
        <wt-select
          control-id="region"
          value="eu"
          .options=${[
            { value: 'eu', label: 'EU' },
            { value: 'us', label: 'US' }
          ]}
        ></wt-select>
      </wt-field-group>
    </div>`
}

/** A label and its control on one line, as the toolbar and the gold view set them. */
export const Inline: StoryObj<Args> = {
  render: () =>
    html`<wt-field-group inline icon="sort" label="Sortierung">
      <wt-select
        value="vault"
        .options=${[
          { value: 'vault', label: 'Vault-Slots' },
          { value: 'ilvl', label: 'Item-Level' }
        ]}
      ></wt-select>
    </wt-field-group>`
}

/** A line of help under a control. */
export const Hint: StoryObj<Args> = {
  render: () =>
    html`<div style="max-width: 560px">
      <wt-hint text="Die Region bestimmt den Reset-Countdown (EU: Mittwoch 06:00, US: Dienstag 08:00 Ortszeit)."></wt-hint>
      <wt-hint icon="check" text="Auf dem neuesten Stand (GitHub)."></wt-hint>
    </div>`
}
