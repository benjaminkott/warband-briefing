import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ACCOUNTS, DATA_BUNDLE, GOLD, GOLD_HISTORY, ROSTER } from '../../stories/fixtures'
import { GoldRange } from '../../enums/goldRange'
import { AnyAccount } from '../../../../shared/enums/anyAccount'
import './GoldView'

interface Args {
  account: string
  range: GoldRange
}

/** One character off the roster: listed with its gold, dimmed. */
const HIDDEN_KEYS = new Set([ROSTER[2]!.key])

const meta: Meta<Args> = {
  title: 'Views/GoldView',
  component: 'wt-gold-view',
  args: { account: AnyAccount.All, range: GoldRange.Month },
  argTypes: {
    account: { control: 'radio', options: [AnyAccount.All, ...ACCOUNTS] },
    range: { control: 'radio', options: Object.values(GoldRange) }
  },
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    html`<div class="content" style="height: 100vh">
      <wt-gold-view
        .gold=${GOLD}
        .history=${GOLD_HISTORY}
        .characters=${ROSTER}
        .hiddenKeys=${HIDDEN_KEYS}
        .accounts=${ACCOUNTS}
        account=${args.account}
        range=${args.range}
        .lastSyncAt=${DATA_BUNDLE.lastSyncAt}
      ></wt-gold-view>
    </div>`
}

export default meta

/** What the account owns right now, and how it got there. */
export const Account: StoryObj<Args> = {}

export const OneAccount: StoryObj<Args> = { args: { account: 'WOW2', range: GoldRange.Quarter } }

/** Nothing read yet. */
export const Empty: StoryObj<Args> = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-gold-view .gold=${null} .history=${[]} .characters=${[]} .accounts=${[]} .lastSyncAt=${null}></wt-gold-view>
    </div>`
}
