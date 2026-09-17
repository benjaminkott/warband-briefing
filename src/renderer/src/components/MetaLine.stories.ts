import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Region } from '../../../shared/enums/region'
import { LEVELLING, MAIN } from '../stories/fixtures'
import './CharacterLinks'
import './MetaLine'
import './Icon'
import { IconSize } from '../enums/iconSize'

interface Args {
  detailed: boolean
}

const meta: Meta<Args> = {
  title: 'Shared/MetaLine',
  component: 'wt-meta-line',
  args: { detailed: false },
  render: (args) => html`<wt-meta-line .character=${MAIN} ?detailed=${args.detailed}></wt-meta-line>`
}

export default meta

/** Played time, zone, auctions, mail, bag space - the card keeps the sentences in tooltips. */
export const Card: StoryObj<Args> = {}

/** The page spells them out, with the last boss as an entry of its own. */
export const Detailed: StoryObj<Args> = { args: { detailed: true } }

/** With a lead before the entries and the link row after them, as card and page set it. */
export const WithLeadAndLinks: StoryObj<Args> = {
  render: (args) =>
    html`<wt-meta-line
      class="card-foot"
      .character=${MAIN}
      ?detailed=${args.detailed}
      .lead=${html`<span><wt-icon name="clock" size=${IconSize.Sm}></wt-icon>Zuletzt gesehen vor 40 min</span>`}
      .content=${html`<span class="card-foot-spacer"></span><wt-character-links .character=${MAIN} region=${Region.Eu}></wt-character-links>`}
    ></wt-meta-line>`
}

/** A character with little to say. */
export const Sparse: StoryObj<Args> = {
  render: () => html`<wt-meta-line .character=${LEVELLING}></wt-meta-line>`
}
