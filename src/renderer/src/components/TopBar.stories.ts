import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, type TemplateResult } from 'lit'
import { DATA_BUNDLE, ROSTER, UPDATE_READY, UPDATE_STATE, WARBAND_BANKS } from '../stories/fixtures'
import { Tab } from '../enums/tab'
import './TopBar'
import './topbar/Brand'
import './topbar/ResetPill'
import './topbar/WindowControls'

interface Args {
  tab: Tab
  canBack: boolean
  canForward: boolean
  untilReset: string
  evenings: number
  running: boolean
  updateReady: boolean
  maximized: boolean
  query: string
}

const bar = (args: Args): TemplateResult =>
  html`<wt-top-bar
    tab=${args.tab}
    ?can-back=${args.canBack}
    ?can-forward=${args.canForward}
    .lastSyncAt=${DATA_BUNDLE.lastSyncAt}
    until-reset=${args.untilReset}
    evenings=${args.evenings}
    .status=${{ running: args.running, step: '', errors: [] }}
    .updateState=${args.updateReady ? UPDATE_READY : UPDATE_STATE}
    ?maximized=${args.maximized}
    query=${args.query}
    .characters=${ROSTER}
    .banks=${WARBAND_BANKS}
  ></wt-top-bar>`

/** The window widths the bar's stages are seen at: wide, the default window, and the narrowest the main process allows. */
const WIDTHS: Array<{ px: number; note: string }> = [
  { px: 2200, note: 'everything' },
  { px: 2000, note: 'the read timestamp and the evenings go' },
  { px: 1700, note: 'the words on the actions go' },
  { px: 1520, note: 'the tab labels stay' },
  { px: 1320, note: 'the default window: the tab labels go' },
  { px: 1000, note: 'the name beside the mark goes' },
  { px: 760, note: 'the narrowest window: the search folds to its mark' }
]

const meta: Meta<Args> = {
  title: 'Shared/TopBar',
  component: 'wt-top-bar',
  args: {
    tab: Tab.Roster,
    canBack: false,
    canForward: false,
    untilReset: '4d 21h',
    evenings: 5,
    running: false,
    updateReady: false,
    maximized: false,
    query: ''
  },
  argTypes: { tab: { control: 'radio', options: Object.values(Tab) } },
  parameters: { layout: 'fullscreen' },
  render: bar
}

export default meta

/** The bar across the top: mark, back and forward, tabs, search, last read, reset, re-read, window controls. */
export const Idle: StoryObj<Args> = {}

/** A search typed and the field focused: the hits hang under it, over whatever the view shows. */
export const Searching: StoryObj<Args> = {
  args: { query: 'flask' },
  render: (args) => html`<div style="min-height: 420px">${bar(args)}</div>`,
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLInputElement>('wt-search input')?.focus()
  }
}

/** A page opened from the list and closed again: both steps of the trail have a place to go. */
export const Walked: StoryObj<Args> = { args: { canBack: true, canForward: true } }

/** While the sources are being read. */
export const Reading: StoryObj<Args> = { args: { running: true } }

/** An update downloaded: the one accent button in the bar. */
export const UpdateReady: StoryObj<Args> = { args: { updateReady: true } }

/**
 * The bar at each width it gives way at, one under the other: the stages are
 * queries on the bar's own width, so a frame of that width shows the stage
 * a window of that width would. The update button is on, the widest case.
 */
export const Breakpoints: StoryObj<Args> = {
  args: { canBack: true, updateReady: true },
  render: (args) =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s4); align-items: flex-start; padding: var(--s4)">
      ${WIDTHS.map(
        ({ px, note }) =>
          html`<div>
            <p class="muted tiny" style="margin: 0 0 var(--s1)">${px}px - ${note}</p>
            <div style=${`width: ${px}px`}>${bar(args)}</div>
          </div>`
      )}
    </div>`
}

/** The bar's own pieces: the brand, the reset figure, the window controls on a strip of bar. */
export const Pieces: StoryObj<Args> = {
  render: () =>
    html`<div class="topbar" style="gap: 24px">
      <wt-brand></wt-brand>
      <wt-reset-pill until="4d 21h"></wt-reset-pill>
      <wt-reset-pill></wt-reset-pill>
      <div class="spacer"></div>
      <wt-window-controls></wt-window-controls>
    </div>`
}
