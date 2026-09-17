import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { ClassToken } from '../../enums/classToken'
import './Card'

interface Args {
  link: boolean
  color: ClassToken | ''
}

const meta: Meta<Args> = {
  title: 'UI/Card',
  component: 'wt-card',
  args: { link: false, color: '' },
  argTypes: { color: { control: 'select', options: ['', ...Object.values(ClassToken)] } },
  render: (args) =>
    html`<div style="max-width: 320px">
      <wt-card ?link=${args.link} color=${args.color || nothing}
        ><p class="muted" style="margin: var(--s3)">Der Inhalt der Karte.</p></wt-card
      >
    </div>`
}

export default meta

/** The raised box every card, tile and panel is made of: ground, edge, corner, shadow. The content is the card's children. */
export const Box: StoryObj<Args> = {}

/** A card that leads somewhere: the pointer, the hover, and the sweep on the edge. */
export const Link: StoryObj<Args> = { args: { link: true } }

/** About a character of a class: the sweep on hover takes the class colour in place of the accent. */
export const ClassColour: StoryObj<Args> = { args: { link: true, color: ClassToken.DeathKnight } }

/** The parent's classes ride along: the same box as a compact dashboard panel. */
export const AsPanel: StoryObj<Args> = {
  render: () =>
    html`<div class="dash" style="max-width: 320px">
      <wt-card class="panel dash-panel"><p class="muted">Ein Panel ohne Kopfzeile.</p></wt-card>
    </div>`
}
