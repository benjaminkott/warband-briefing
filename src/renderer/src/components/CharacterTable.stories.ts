import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Region } from '../../../shared/enums/region'
import { displayFlags } from '../../../shared/display'
import { CHAR_HISTORY, CONFIG, MAX_LEVEL, RESET_AT, ROSTER } from '../stories/fixtures'
import { SortDirection } from '../enums/sortDirection'
import { SortKey } from '../enums/sortKey'
import './CharacterTable'

interface Args {
  sort: SortKey
  direction: SortDirection
  showAccount: boolean
}

const meta: Meta<Args> = {
  title: 'Shared/CharacterTable',
  component: 'wt-character-table',
  args: { sort: SortKey.Vault, direction: SortDirection.Desc, showAccount: true },
  argTypes: { direction: { control: 'radio', options: Object.values(SortDirection) } },
  render: (args) =>
    html`<wt-character-table
      .characters=${ROSTER}
      .hiddenKeys=${new Set<string>()}
      .history=${CHAR_HISTORY}
      .flags=${displayFlags(CONFIG)}
      sort=${args.sort}
      direction=${args.direction}
      .maxLevel=${MAX_LEVEL}
      .resetAt=${RESET_AT}
      .goals=${CONFIG.goals}
      region=${Region.Eu}
      ?show-account=${args.showAccount}
    ></wt-character-table>`
}

export default meta

/** One row per character - the view for comparing a full roster at a glance. */
export const Roster: StoryObj<Args> = {}

/** A single account: no account column. */
export const OneAccount: StoryObj<Args> = { args: { showAccount: false } }
