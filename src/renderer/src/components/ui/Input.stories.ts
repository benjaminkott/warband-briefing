import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { InputWidth } from '../../enums/inputWidth'
import { InputType } from '../../enums/inputType'
import { ControlSize } from '../../enums/controlSize'
import './Input'
import './Button'
import './FieldGroup'

interface Args {
  value: string
  placeholder: string
  width: InputWidth | undefined
  size: ControlSize
  digits: boolean
  code: boolean
  disabled: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Input',
  component: 'wt-input',
  args: { value: '', placeholder: 'Bezeichnung', width: undefined, size: ControlSize.Md, digits: false, code: false, disabled: false },
  argTypes: {
    width: { control: 'radio', options: [undefined, ...Object.values(InputWidth)] },
    size: { control: 'radio', options: Object.values(ControlSize) }
  },
  render: (args) =>
    html`<div class="row" style="max-width: 480px">
      <wt-input
        .value=${args.value}
        placeholder=${args.placeholder}
        width=${ifDefined(args.width)}
        size=${args.size}
        ?digits=${args.digits}
        ?code=${args.code}
        ?disabled=${args.disabled}
      ></wt-input>
    </div>`
}

export default meta

export const Text: StoryObj<Args> = {}
export const Digits: StoryObj<Args> = { args: { placeholder: 'Quest-ID', width: InputWidth.Small, digits: true } }
export const Disabled: StoryObj<Args> = { args: { value: 'D:\\Games\\World of Warcraft', code: true, disabled: true } }

/** A form row: the long field, the short id, and the button that adds them. */
export const FormRow: StoryObj<Args> = {
  render: () =>
    html`<div class="row" style="max-width: 560px">
      <wt-input width=${InputWidth.Grow} placeholder="Bezeichnung"></wt-input>
      <wt-input width=${InputWidth.Small} digits placeholder="Quest-ID"></wt-input>
      <wt-button icon="plus" label="Hinzufügen"></wt-button>
    </div>`
}

/** The three sizes, each beside a button of the same size: they stand level. */
export const Sizes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s3); max-width: 480px">
      ${Object.values(ControlSize).map(
        (size) =>
          html`<div class="row">
            <wt-input width=${InputWidth.Grow} size=${size} placeholder=${size}></wt-input>
            <wt-button size=${size} icon="plus" label="Hinzufügen"></wt-button>
          </div>`
      )}
    </div>`
}

/** A labelled field of the settings, with the number field for a level. */
export const InField: StoryObj<Args> = {
  render: () =>
    html`<div style="max-width: 320px">
      <wt-field-group icon="users" label="Mindeststufe">
        <wt-input control-id="story-min-level" type=${InputType.Number} value="70" min="1" max="90"></wt-input>
      </wt-field-group>
    </div>`
}
