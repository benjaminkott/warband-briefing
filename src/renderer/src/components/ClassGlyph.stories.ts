import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { CLASS_COLORS, ClassToken } from '../enums/classToken'
import './ClassGlyph'

interface Args {
  token: ClassToken
  size: number
}

const meta: Meta<Args> = {
  title: 'Shared/ClassGlyph',
  component: 'wt-class-glyph',
  args: { token: ClassToken.Paladin, size: 32 },
  argTypes: { token: { control: 'select', options: Object.values(ClassToken) }, size: { control: { type: 'range', min: 12, max: 96 } } },
  render: (args) => html`<wt-class-glyph token=${args.token} size=${args.size}></wt-class-glyph>`
}

export default meta

/** One class's glyph - our own drawing, not Blizzard's icon. */
export const One: StoryObj<Args> = {}

/** Every class the set knows, on its class colour. */
export const All: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-wrap: wrap; gap: var(--s4)">
      ${Object.values(ClassToken).map(
        (token) =>
          html`<span
            style="display: inline-flex; flex-direction: column; align-items: center; gap: var(--s2); color: ${CLASS_COLORS[token]}"
          >
            <wt-class-glyph token=${token} size="32"></wt-class-glyph><span class="tiny">${token}</span>
          </span>`
      )}
    </div>`
}
