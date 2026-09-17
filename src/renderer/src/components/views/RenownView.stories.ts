import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { CONFIG, ROSTER } from '../../stories/fixtures'
import './RenownView'

const meta: Meta = {
  title: 'Views/RenownView',
  component: 'wt-renown-view',
  parameters: { layout: 'fullscreen' },
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-renown-view .characters=${ROSTER} .trackedFactions=${CONFIG.trackedFactions ?? []}></wt-renown-view>
    </div>`
}

export default meta

/** The renown tab: the selected factions of the warband, a panel for each group. */
export const Selection: StoryObj = {}

/** No selection: the default set of the season. */
export const Default: StoryObj = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-renown-view .characters=${ROSTER}></wt-renown-view>
    </div>`
}

/** No renown reported: the tab names the companion and leads to the sources. */
export const Empty: StoryObj = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-renown-view .characters=${[]}></wt-renown-view>
    </div>`
}
