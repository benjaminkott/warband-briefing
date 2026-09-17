import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Region } from '../../../shared/enums/region'
import { displayFlags } from '../../../shared/display'
import {
  ALT_UNCLAIMED,
  BETWEEN_WEEKS,
  CHAR_HISTORY,
  CONFIG,
  INACTIVE,
  LEVELLING,
  MAIN,
  MAX_LEVEL,
  RESET_AT,
  ROSTER
} from '../stories/fixtures'
import './CharacterCard'
import './ClassMedallion'
import './IdentityLine'
import './MetaLine'
import './CharacterLinks'

interface Args {
  showAccount: boolean
}

const flags = displayFlags(CONFIG)

const card = (character: (typeof ROSTER)[number], args: Args) =>
  html`<wt-character-card
    .character=${character}
    .history=${CHAR_HISTORY[character.key]}
    .flags=${flags}
    .goals=${CONFIG.goals}
    .maxLevel=${MAX_LEVEL}
    .resetAt=${RESET_AT}
    region=${Region.Eu}
    ?show-account=${args.showAccount}
  ></wt-character-card>`

const meta: Meta<Args> = {
  title: 'Shared/CharacterCard',
  component: 'wt-character-card',
  args: { showAccount: false },
  render: (args) => html`<div class="char-grid" style="max-width: 1040px">${card(MAIN, args)}</div>`
}

export default meta

/** The main, mid-week: who, the four figures, the one thing to do. */
export const Main: StoryObj<Args> = {}

/** Every state the roster knows, one under the other, at the narrowest width the band stays on one line. */
export const Roster: StoryObj<Args> = {
  args: { showAccount: true },
  render: (args) =>
    html`<div class="char-grid" style="max-width: 1040px">
      ${[MAIN, ALT_UNCLAIMED, LEVELLING, BETWEEN_WEEKS, INACTIVE].map((character) => card(character, args))}
    </div>`
}

/** A reward waiting from last week: the band is lit, the step says so. */
export const Unclaimed: StoryObj<Args> = {
  render: (args) => html`<div class="char-grid" style="max-width: 1040px">${card(ALT_UNCLAIMED, args)}</div>`
}

/** Still levelling: the level in place of the state, no step. */
export const Levelling: StoryObj<Args> = {
  render: (args) => html`<div class="char-grid" style="max-width: 1040px">${card(LEVELLING, args)}</div>`
}

/** A profession alt: every vault row taken off the list, so nothing of the vault is a chore; the step is the concentration. */
export const Crafter: StoryObj<Args> = {
  render: (args) =>
    html`<div class="char-grid" style="max-width: 1040px">${card({ ...MAIN, skipped: ['vault:raid', 'vault:dungeon', 'vault:world'] }, args)}</div>`
}

/** The pieces of the head band on their own: medallion, identity line, meta line and the link row. */
export const Parts: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s4); max-width: 640px">
      <div style="display: flex; gap: var(--s3); align-items: center">
        ${ROSTER.map((character) => html`<wt-class-medallion .character=${character} size="48"></wt-class-medallion>`)}
        <wt-class-medallion .character=${{ ...MAIN, classToken: 'TINKER', className: 'Tinker' }} size="48"></wt-class-medallion>
      </div>
      <wt-identity-line class="card-sub" .character=${MAIN} .parts=${[MAIN.spec, MAIN.className, MAIN.realm]}></wt-identity-line>
      <wt-meta-line .character=${MAIN}></wt-meta-line>
      <wt-meta-line .character=${MAIN} detailed></wt-meta-line>
      <wt-character-links .character=${MAIN} region=${Region.Eu}></wt-character-links>
    </div>`
}
