import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { MAIN, ROSTER } from '../stories/fixtures'
import './ClassMedallion'

interface Args {
  size: number
}

const meta: Meta<Args> = {
  title: 'Shared/ClassMedallion',
  component: 'wt-class-medallion',
  args: { size: 48 },
  argTypes: { size: { control: { type: 'range', min: 16, max: 96 } } },
  render: (args) => html`<wt-class-medallion .character=${MAIN} size=${args.size}></wt-class-medallion>`
}

export default meta

/** The character's class as a round medallion, in the class colour. */
export const One: StoryObj<Args> = {}

/** The roster, and a class the set does not know: the abbreviation stands in for the artwork. */
export const Roster: StoryObj<Args> = {
  render: (args) =>
    html`<div style="display: flex; gap: var(--s3); align-items: center">
      ${ROSTER.map((character) => html`<wt-class-medallion .character=${character} size=${args.size}></wt-class-medallion>`)}
      <wt-class-medallion .character=${{ ...MAIN, classToken: 'TINKER', className: 'Tinker' }} size=${args.size}></wt-class-medallion>
    </div>`
}

/** The three sizes the app draws: table row, card, page. */
export const Sizes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; gap: var(--s3); align-items: center">
      ${[22, 24, 48, 54, 72].map((size) => html`<wt-class-medallion .character=${MAIN} size=${size}></wt-class-medallion>`)}
    </div>`
}
