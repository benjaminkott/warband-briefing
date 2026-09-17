import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import './App'

const meta: Meta = {
  title: 'App/Shell',
  component: 'wt-app',
  parameters: { layout: 'fullscreen' },
  // The shell talks to the preload bridge, which Storybook replaces with the
  // fixtures (see .storybook/mock-api.ts): every tab works, nothing is saved.
  render: () => html`<wt-app></wt-app>`
}

export default meta

/** The whole app on the fixture roster: tabs, top bar, every view. */
export const Shell: StoryObj = {}
