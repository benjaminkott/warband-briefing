import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Tab } from '../enums/tab'
import { Severity } from '../enums/severity'
import { UPDATE_READY, UPDATE_STATE } from '../stories/fixtures'
import './Notices'

interface Args {
  message: boolean
  updateReady: boolean
  noWowPath: boolean
}

const meta: Meta<Args> = {
  title: 'Shared/Notices',
  component: 'wt-notices',
  args: { message: true, updateReady: true, noWowPath: true },
  render: (args) =>
    html`<wt-notices
      .notice=${args.message ? { severity: Severity.Ok, text: 'Kael ist da – die Liste ist gefüllt.', action: { label: 'Zur Liste', tab: Tab.Tasks } } : null}
      .updateState=${args.updateReady ? UPDATE_READY : UPDATE_STATE}
      ?no-wow-path=${args.noWowPath}
    ></wt-notices>`
}

export default meta

/** Everything at once: the shell's message with its button, an update ready, no folder set. */
export const All: StoryObj<Args> = {}

/** Only the shell's message. */
export const Message: StoryObj<Args> = { args: { updateReady: false, noWowPath: false } }
