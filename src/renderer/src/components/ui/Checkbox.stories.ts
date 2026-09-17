import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { CheckboxKind } from '../../enums/checkboxKind'
import './Checkbox'
import '../settings/ToggleRow'
import '../Icon'
import './CheckGrid'
import '../settings/ToggleList'
import { IconSize } from '../../enums/iconSize'

interface Args {
  label: string
  kind: CheckboxKind
  checked: boolean
  disabled: boolean
  indeterminate: boolean
  off: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Checkbox',
  component: 'wt-checkbox',
  args: { label: 'Trend unter den Figuren', kind: CheckboxKind.CheckRow, checked: true, disabled: false, indeterminate: false, off: false },
  argTypes: { kind: { control: 'radio', options: Object.values(CheckboxKind) } },
  render: (args) =>
    html`<wt-checkbox
      kind=${args.kind}
      label=${args.label}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      ?indeterminate=${args.indeterminate}
      ?off=${args.off}
    ></wt-checkbox>`
}

export default meta

export const Row: StoryObj<Args> = {}
export const Indeterminate: StoryObj<Args> = { args: { kind: CheckboxKind.CharSwitch, label: 'Übersicht', indeterminate: true } }
export const Disabled: StoryObj<Args> = { args: { disabled: true } }
export const Plain: StoryObj<Args> = { args: { kind: CheckboxKind.Plain } }

/** The roster rows of the settings: a mark, a name, a note, and the switch at the right; a head row above. */
export const RosterRow: StoryObj<Args> = {
  render: () =>
    html`<div style="max-width: 480px">
      <wt-toggle-row
        head
        .label=${html`<span class="faint tiny">Alle</span>`}
        .content=${html`<wt-checkbox kind=${CheckboxKind.CharSwitch} label="Übersicht" indeterminate></wt-checkbox>`}
      ></wt-toggle-row>
      <wt-toggle-list
        .content=${html`<wt-toggle-row
            .mark=${html`<wt-icon name="folder" size=${IconSize.Sm}></wt-icon>`}
            label="WOW1"
            .content=${html`<span class="faint tiny">4 Charaktere</span>
              <wt-checkbox kind=${CheckboxKind.CharSwitch} label="Übersicht" checked></wt-checkbox>`}
          ></wt-toggle-row>
          <wt-toggle-row
            off
            .mark=${html`<wt-icon name="folder" size=${IconSize.Sm}></wt-icon>`}
            label="WOW2"
            .content=${html`<span class="faint tiny">2 Charaktere</span>
              <wt-checkbox kind=${CheckboxKind.CharSwitch} label="Übersicht"></wt-checkbox>`}
          ></wt-toggle-row>`}
      ></wt-toggle-list>
    </div>`
}

/** A list of boxes in as many columns as fit: the view flags of a settings group. */
export const Grid: StoryObj<Args> = {
  render: () =>
    html`<div style="max-width: 560px">
      <wt-check-grid>
        ${['Trend unter den Figuren', 'Schatzkammer', 'Berufe', 'Währungen', 'Rufe'].map(
          (label, index) =>
            html`<wt-checkbox ?checked=${index % 2 === 0} .label=${html`<span class="input-grow">${label}</span>`}></wt-checkbox>`
        )}
      </wt-check-grid>
    </div>`
}

/** The row of the stat picker's menu. */
export const MenuRow: StoryObj<Args> = {
  render: () =>
    html`<div class="popover" style="position: static; display: inline-block">
      <wt-checkbox
        kind=${CheckboxKind.PopoverRow}
        checked
        .label=${html`<wt-icon name="vault" size=${IconSize.Sm}></wt-icon>Schatzkammer`}
      ></wt-checkbox>
      <wt-checkbox kind=${CheckboxKind.PopoverRow} .label=${html`<wt-icon name="coins" size=${IconSize.Sm}></wt-icon>Gold`}></wt-checkbox>
    </div>`
}
