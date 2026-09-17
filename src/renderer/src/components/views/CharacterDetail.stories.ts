import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Region } from '../../../../shared/enums/region'
import { displayFlags } from '../../../../shared/display'
import { DetailSection } from '../../enums/detailSection'
import type { WtEvent } from '../../element'
import { ALT_UNCLAIMED, CHAR_HISTORY, CONFIG, LEVELLING, MAIN, MAX_LEVEL, RESET_AT } from '../../stories/fixtures'
import './CharacterDetail'
import type { WtCharacterDetail } from './CharacterDetail'

interface Args {
  section: DetailSection
  hasPrev: boolean
  hasNext: boolean
  showAccount: boolean
}

const flags = displayFlags(CONFIG)

const page = (character: typeof MAIN, args: Args) =>
  html`<div class="content" style="height: 100vh">
    <wt-character-detail
      .character=${character}
      .history=${CHAR_HISTORY[character.key]}
      .flags=${flags}
      .goals=${CONFIG.goals}
      .trackedCurrencies=${new Set(CONFIG.trackedCurrencies)}
      .maxLevel=${MAX_LEVEL}
      .resetAt=${RESET_AT}
      region=${Region.Eu}
      ?show-account=${args.showAccount}
      ?has-prev=${args.hasPrev}
      ?has-next=${args.hasNext}
      section=${args.section}
      @wt-detail-section=${(event: WtEvent<'wt-detail-section'>) => {
        // The shell keeps the section; here the page keeps it itself.
        ;(event.target as WtCharacterDetail).section = event.detail
      }}
    ></wt-character-detail>
  </div>`

const meta: Meta<Args> = {
  title: 'Views/CharacterDetail',
  component: 'wt-character-detail',
  args: { section: DetailSection.Week, hasPrev: true, hasNext: true, showAccount: true },
  argTypes: { section: { control: 'inline-radio', options: Object.values(DetailSection) } },
  parameters: { layout: 'fullscreen' },
  render: (args) => page(MAIN, args)
}

export default meta

/** One character in full: the hero band, and under it the week - the vault, the tasks, every run and lockout. The bar switches the section. */
export const Main: StoryObj<Args> = {}

/** The season: the two histories, every best, the raids. */
export const Season: StoryObj<Args> = { args: { section: DetailSection.Season } }

/** Every slot, with what the gear check found. */
export const Gear: StoryObj<Args> = { args: { section: DetailSection.Gear } }

/** The professions: skill, concentration, knowledge, cooldowns. */
export const Professions: StoryObj<Args> = { args: { section: DetailSection.Professions } }

/** What the character carries: currencies, supplies, the bags and the bank. */
export const Inventory: StoryObj<Args> = { args: { section: DetailSection.Inventory } }

/** A reward waiting, and hardly any history yet. */
export const Unclaimed: StoryObj<Args> = { render: (args) => page(ALT_UNCLAIMED, args) }

/** Below the cap: no vault, no bests, empty panels saying so. */
export const Levelling: StoryObj<Args> = { render: (args) => page(LEVELLING, args) }
