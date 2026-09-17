import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import './Logo'

interface Args {
  size: number
}

const meta: Meta<Args> = {
  title: 'Shared/Logo',
  component: 'wt-logo',
  args: { size: 22 },
  argTypes: { size: { control: { type: 'range', min: 12, max: 96 } } },
  render: (args) => html`<span style="color: var(--accent)"><wt-logo size=${args.size}></wt-logo></span>`
}

export default meta

/** The app's own mark: a shield with the week ticked off, in whatever colour surrounds it. */
export const Mark: StoryObj<Args> = {}

export const Sizes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; align-items: center; gap: var(--s4); color: var(--accent)">
      ${[16, 22, 32, 48, 64].map((size) => html`<wt-logo size=${size}></wt-logo>`)}
    </div>`
}
