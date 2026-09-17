import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { ICON_NAMES, type IconName } from '../Icon'
import './Panel'
import './FieldGroup'
import './Input'

interface Args {
  icon: IconName
  heading: string
  description: string
  step?: number
}

const meta: Meta<Args> = {
  title: 'UI/Panel',
  component: 'wt-panel',
  args: { icon: 'folder', heading: 'Installation', description: 'Wo World of Warcraft liegt.', step: 1 },
  argTypes: { icon: { control: 'select', options: ICON_NAMES } },
  render: (args) =>
    html`<wt-panel icon=${args.icon} heading=${args.heading} description=${args.description} step=${args.step ?? nothing}>
      <wt-field-group icon="folder" label="Ordner">
        <wt-input control-id="folder" code value="C:\\Program Files (x86)\\World of Warcraft\\_retail_"></wt-input>
      </wt-field-group>
    </wt-panel>`
}

export default meta

export const Settings: StoryObj<Args> = {}
