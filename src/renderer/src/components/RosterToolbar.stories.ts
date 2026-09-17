import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ViewMode } from '../enums/viewMode'
import './RosterToolbar'

interface Args {
  view: ViewMode
  shown: number
  total: number
}

const meta: Meta<Args> = {
  title: 'Shared/RosterToolbar',
  component: 'wt-roster-toolbar',
  args: { view: ViewMode.Tiles, shown: 4, total: 5 },
  argTypes: {
    view: { control: 'radio', options: Object.values(ViewMode) }
  },
  render: (args) => html`<wt-roster-toolbar view=${args.view} .shown=${args.shown} .total=${args.total}></wt-roster-toolbar>`
}

export default meta

/** The view switch and the count; the search is the top bar's. */
export const Tiles: StoryObj<Args> = {}

/** Narrowed by the top bar's search: the count as "1 von 5". */
export const Narrowed: StoryObj<Args> = { args: { shown: 1 } }

/** The table picked. */
export const Table: StoryObj<Args> = { args: { view: ViewMode.Table } }
