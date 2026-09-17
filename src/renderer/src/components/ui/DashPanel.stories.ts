import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { ICON_NAMES, type IconName } from '../Icon'
import './DashPanel'
import './PanelEmpty'
import './PanelFoot'

interface Args {
  icon: IconName
  heading: string
  note: string
  hint: string
  aside: string
}

const meta: Meta<Args> = {
  title: 'UI/DashPanel',
  component: 'wt-dash-panel',
  args: { icon: 'users', heading: 'Charaktere', note: 'nach Dringlichkeit', hint: 'Wie die Reihenfolge zustande kommt.', aside: '4 / 9' },
  argTypes: { icon: { control: 'select', options: ICON_NAMES } },
  render: (args) =>
    html`<div class="dash" style="max-width: 720px">
      <wt-dash-panel icon=${args.icon} heading=${args.heading} note=${args.note} hint=${args.hint} aside=${args.aside || nothing}>
        <p class="muted">Der Inhalt des Panels.</p>
        <wt-panel-foot text="Eine Zeile darunter, wie man es liest."></wt-panel-foot>
      </wt-dash-panel>
    </div>`
}

export default meta

/** The compact box of the dashboard and the character page: one caption line, three things riding on it. */
export const Caption: StoryObj<Args> = {}

/** A panel with nothing to show says so, in the place the table would be. */
export const Empty: StoryObj<Args> = {
  render: () =>
    html`<div class="dash" style="max-width: 720px">
      <wt-dash-panel icon="dungeon" heading="Bestleistungen"
        ><wt-panel-empty text="Noch keine Runs in dieser Saison."></wt-panel-empty
      ></wt-dash-panel>
    </div>`
}

/** The reason is a source that is not installed: the way to the sources sits next to the sentence. */
export const EmptyToSources: StoryObj<Args> = {
  render: () =>
    html`<div class="dash" style="max-width: 720px">
      <wt-dash-panel icon="star" heading="Ruf"
        ><wt-panel-empty to-sources text="Kein Ruf gemeldet — dafür braucht es das Companion-Addon."></wt-panel-empty
      ></wt-dash-panel>
    </div>`
}
