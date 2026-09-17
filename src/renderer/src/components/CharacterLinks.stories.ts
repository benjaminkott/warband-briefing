import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Region } from '../../../shared/enums/region'
import { MAIN } from '../stories/fixtures'
import { Place } from '../enums/place'
import './CharacterLinks'

interface Args {
  size: number
  place: Place.Card | Place.Table
}

const meta: Meta<Args> = {
  title: 'Shared/CharacterLinks',
  component: 'wt-character-links',
  args: { size: 20, place: Place.Card },
  argTypes: { place: { control: 'radio', options: [Place.Card, Place.Table] } },
  render: (args) =>
    html`<wt-character-links .character=${MAIN} region=${Region.Eu} size=${args.size} place=${args.place}></wt-character-links>`
}

export default meta

/** The places a player looks a character up, as a strip of the sites' own marks. */
export const Card: StoryObj<Args> = {}

/** The table's tighter strip, pushed to the cell's end. */
export const Table: StoryObj<Args> = {
  args: { size: 17, place: Place.Table },
  render: (args) =>
    html`<div style="width: 200px; border: 1px dashed var(--border)">
      <wt-character-links .character=${MAIN} region=${Region.Eu} size=${args.size} place=${Place.Table}></wt-character-links>
    </div>`
}
