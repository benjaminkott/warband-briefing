import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ROSTER, WARBAND_BANKS } from '../../stories/fixtures'
import './Search'

interface Args {
  query: string
  showAccount: boolean
}

/** The list shows while the field has the focus, so the story puts it there. */
const focused = ({ canvasElement }: { canvasElement: HTMLElement }): void => {
  canvasElement.querySelector<HTMLInputElement>('wt-search input')?.focus()
}

const meta: Meta<Args> = {
  title: 'Topbar/Search',
  component: 'wt-search',
  args: { query: '', showAccount: false },
  render: (args) =>
    html`<div class="topbar" style="min-height: 320px; align-items: flex-start">
      <wt-search query=${args.query} .characters=${ROSTER} .banks=${WARBAND_BANKS} ?show-account=${args.showAccount}></wt-search>
    </div>`
}

export default meta

/** The field alone; Ctrl+F and "/" jump into it from anywhere. */
export const Idle: StoryObj<Args> = {}

/** A name typed: the characters it names, and the first row stood on. */
export const Characters: StoryObj<Args> = { args: { query: 'auri' }, play: focused }

/** An item typed: every place it sits in, character by character, the warband bank last. */
export const Items: StoryObj<Args> = { args: { query: 'flask', showAccount: true }, play: focused }

/** A word an open task carries: the character, with the task as the reason for the hit. */
export const ByTask: StoryObj<Args> = { args: { query: 'delve' }, play: focused }

/** Nothing named: the list says so. */
export const NoHits: StoryObj<Args> = { args: { query: 'zzz' }, play: focused }
