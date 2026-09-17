import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import '../components/Icon'
import '../components/ui/Button'
import '../components/ui/Chip'
import { IconSize } from '../enums/iconSize'
import { ControlSize } from '../enums/controlSize'

/**
 * The scales of the stylesheet, not an element: every distance, icon,
 * radius and control height in the app is one step of these. One place to
 * see that a step is a step.
 */
const meta: Meta = {
  title: 'Foundations/Scales'
}

export default meta

/** A row of the sheet: the token, and a box that is its size. */
const row = (name: string, sample: unknown) => html`
  <code class="tiny" style="justify-self: start">${name}</code>
  <div style="display: flex; align-items: center; gap: var(--s3)">${sample}</div>
`

const sheet = (rows: unknown[]) =>
  html`<div style="display: grid; grid-template-columns: max-content 1fr; gap: var(--s2) var(--s5); align-items: center; max-width: 640px">
    ${rows}
  </div>`

const SPACES = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']

/** The spacing scale: a bar as long as each step. */
export const Spacing: StoryObj = {
  render: () =>
    sheet(
      SPACES.map((step) =>
        row(`--${step}`, html`<span style="display: block; width: var(--${step}); height: var(--s3); background: var(--accent)"></span>`)
      )
    )
}

/** The icon scale beside the type it goes with. */
export const Icons: StoryObj = {
  render: () =>
    sheet(
      Object.values(IconSize).map((size) =>
        row(
          `--icon-${size}`,
          html`<wt-icon name="vault" size=${size} style="color: var(--accent)"></wt-icon><wt-icon name="check" size=${size}></wt-icon
            ><wt-icon name="alert" size=${size} class="warn-text"></wt-icon>`
        )
      )
    )
}

const RADII = ['radius-xs', 'radius-sm', 'radius', 'radius-pill']

/** The radii on a box of the sunken surface. */
export const Radii: StoryObj = {
  render: () =>
    sheet(
      RADII.map((step) =>
        row(
          `--${step}`,
          html`<span
            style="display: block; width: var(--s9); height: var(--s7); background: var(--bg-sunken); border: 1px solid var(--border-strong); border-radius: var(--${step})"
          ></span>`
        )
      )
    )
}

/** The control heights, one button for each, and the chip beside them. */
export const Controls: StoryObj = {
  render: () =>
    sheet([
      ...Object.values(ControlSize).map((size) =>
        row(
          `--control-h${size === ControlSize.Md ? '' : `-${size}`}`,
          html`<wt-button label="Aktualisieren" icon="refresh" size=${size}></wt-button>`
        )
      ),
      row('--chip-h', html`<wt-chip label="Chip" icon="keystone"></wt-chip>`),
      row('--chip-h-sm', html`<wt-chip label="Chip" icon="keystone" small></wt-chip>`)
    ])
}
