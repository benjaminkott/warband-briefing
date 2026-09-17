import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ControlSize } from '../../enums/controlSize'
import './Button'
import './Chip'
import './Group'
import './Chips'

const meta: Meta = {
  title: 'UI/Group',
  component: 'wt-group'
}

export default meta

/** Two groups in a column: the title line, a note, and an action at the right. */
export const Groups: StoryObj = {
  render: () =>
    html`<div style="max-width: 520px">
      <wt-group heading="Watched">
        <wt-button slot="action" ghost size=${ControlSize.Sm} icon="refresh" label="Default"></wt-button>
        <wt-chips><wt-chip label="Delves"></wt-chip><wt-chip label="Raid"></wt-chip></wt-chips>
      </wt-group>
      <wt-group heading="Suggestions" note="From the sources, with the name from the game.">
        <wt-chips><wt-chip label="World Boss"></wt-chip></wt-chips>
      </wt-group>
      <wt-group>
        <p class="muted" style="margin: 0">A group without a title is only the spacing.</p>
      </wt-group>
    </div>`
}
