import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Command } from '../../enums/command'
import { BINDINGS, strokesOf } from '../../model/shortcuts'
import './Keys'

interface Args {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
}

const meta: Meta<Args> = {
  title: 'UI/Keys',
  component: 'wt-keys',
  args: { key: '1', ctrl: true, alt: false, shift: false },
  render: (args) => html`<wt-keys .stroke=${{ key: args.key, ctrl: args.ctrl, alt: args.alt, shift: args.shift }}></wt-keys>`
}

export default meta

/** One stroke as key caps; the modifiers take the keyboard's language. */
export const Stroke: StoryObj<Args> = {}

/** Every binding in the table, in its order. */
export const All: StoryObj<Args> = {
  render: () =>
    html`<div class="row" style="flex-wrap: wrap">${BINDINGS.map((binding) => html`<wt-keys .stroke=${binding.stroke}></wt-keys>`)}</div>`
}

/** A command with two strokes: the search takes either. */
export const Alternatives: StoryObj<Args> = {
  render: () => html`${strokesOf(Command.Search).map((stroke) => html`<wt-keys .stroke=${stroke}></wt-keys> `)}`
}
