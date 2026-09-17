import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ControlSize } from '../../enums/controlSize'
import './Select'
import './Button'
import './FieldGroup'

interface Args {
  value: string
  size: ControlSize
  disabled: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Select',
  component: 'wt-select',
  args: { value: '30', size: ControlSize.Md, disabled: false },
  argTypes: { size: { control: 'radio', options: Object.values(ControlSize) } },
  render: (args) =>
    html`<wt-field-group icon="calendar" label="Trend über" narrow style="max-width: 280px">
      <wt-select
        control-id="trend"
        .value=${args.value}
        size=${args.size}
        ?disabled=${args.disabled}
        .options=${[
          { value: '7', label: '7 Tage', icon: 'calendar' },
          { value: '30', label: '30 Tage', icon: 'calendar' },
          { value: '90', label: '90 Tage', icon: 'calendar' }
        ]}
      ></wt-select>
    </wt-field-group>`
}

export default meta

/** Our own dropdown: the native one paints its list from the operating system. */
export const Select: StoryObj<Args> = {}

export const Disabled: StoryObj<Args> = { args: { disabled: true } }

/** The three sizes, each beside a button of the same size: they stand level. */
export const Sizes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s3); max-width: 360px">
      ${Object.values(ControlSize).map(
        (size) =>
          html`<div class="row">
            <wt-select
              size=${size}
              value="30"
              .options=${[
                { value: '7', label: '7 Tage', icon: 'calendar' },
                { value: '30', label: '30 Tage', icon: 'calendar' }
              ]}
            ></wt-select>
            <wt-button size=${size} icon="refresh" label=${size}></wt-button>
          </div>`
      )}
    </div>`
}
