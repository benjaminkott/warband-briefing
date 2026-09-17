import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { CheckboxKind } from '../../enums/checkboxKind'
import { Severity } from '../../enums/severity'
import './Checkbox'
import './Chip'
import './Entry'
import '../Notice'

interface Args {
  label: string
  off: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Entry',
  component: 'wt-entry',
  args: { label: 'SavedInstances', off: false },
  render: (args) =>
    html`<div style="max-width: 560px">
      <wt-entry
        ?off=${args.off}
        .control=${html`<wt-checkbox kind=${CheckboxKind.Plain} ?checked=${!args.off}></wt-checkbox>`}
        label=${args.label}
        .badge=${html`<wt-chip icon="check" label="Addon installed"></wt-chip>`}
        .content=${html`<span class="muted tiny">44 characters · 4 files · last 2 h ago</span>
          <p class="muted">A common community addon. It supplies every character it has seen.</p>
          <div class="chips">
            <wt-chip small icon="users" label="Character data"></wt-chip><wt-chip small icon="lock" label="Lockouts"></wt-chip>
          </div>`}
      ></wt-entry>
    </div>`
}

export default meta

/** The switch, the name, the badge; the body set in under the name. */
export const Entry: StoryObj<Args> = {}

/** Switched off: the box fades, the switch stays usable. */
export const Off: StoryObj<Args> = { args: { off: true } }

/** A head only, with a notice as the whole body. */
export const HeadOnly: StoryObj<Args> = {
  render: () =>
    html`<div style="max-width: 560px">
      <wt-entry label="Only a name"></wt-entry>
      <wt-entry
        label="With a notice"
        .badge=${html`<wt-chip icon="close" label="Addon missing"></wt-chip>`}
        .content=${html`<wt-notice tone=${Severity.Danger}>${'The file could not be read.'}</wt-notice>`}
      ></wt-entry>
    </div>`
}
