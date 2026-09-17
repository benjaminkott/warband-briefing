import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ALT_UNCLAIMED, MAIN } from '../stories/fixtures'
import { FactionSide } from '../enums/factionSide'
import './FactionTag'
import './IdentityLine'
import './ui/Chip'
import './GuildTag'

const meta: Meta = {
  title: 'Shared/IdentityLine',
  component: 'wt-identity-line'
}

export default meta

/** Spec, class and realm, then the faction and the guild, every entry behind the same dot - the card's order. */
export const Card: StoryObj = {
  render: () =>
    html`<wt-identity-line
      class="card-sub"
      .character=${MAIN}
      .parts=${[MAIN.spec, MAIN.className, MAIN.realm]}
      .extra=${[html`<span>vor 40 min</span>`, html`<wt-chip label="WOW1" data-tip="WTF-Account-Ordner, in dem dieser Charakter gespeichert ist"></wt-chip>`]}
    ></wt-identity-line>`
}

/** The page's order: realm first, the level at the end, no guild on an unguilded alt. */
export const Page: StoryObj = {
  render: () =>
    html`<wt-identity-line
      class="detail-sub"
      .character=${ALT_UNCLAIMED}
      .parts=${[ALT_UNCLAIMED.realm, ALT_UNCLAIMED.spec, ALT_UNCLAIMED.className, 'Stufe 90']}
    ></wt-identity-line>`
}

/** The two tags on their own: a faction behind its dot, a guild in the game's angle brackets; an unknown faction is nothing. */
export const Tags: StoryObj = {
  render: () =>
    html`<div style="display: flex; gap: var(--s4)">
      ${Object.values(FactionSide).map((side) => html`<wt-faction-tag faction=${side}></wt-faction-tag>`)}
      <wt-faction-tag></wt-faction-tag>
      <wt-guild-tag guild="Nachtwache"></wt-guild-tag>
    </div>`
}
