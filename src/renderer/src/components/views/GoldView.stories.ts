import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ACCOUNTS, CHAR_HISTORY, DATA_BUNDLE, GOLD, GOLD_HISTORY, ROSTER } from '../../stories/fixtures'
import { GoldRange } from '../../enums/goldRange'
import { GoldChart } from '../../enums/goldChart'
import { AnyAccount } from '../../../../shared/enums/anyAccount'
import './GoldView'

interface Args {
  account: string
  range: GoldRange
  chart: GoldChart
}

/** One character off the roster: listed with its gold, dimmed. */
const HIDDEN_KEYS = new Set([ROSTER[2]!.key])

const meta: Meta<Args> = {
  title: 'Views/GoldView',
  component: 'wt-gold-view',
  args: { account: AnyAccount.All, range: GoldRange.Month, chart: GoldChart.Total },
  argTypes: {
    account: { control: 'radio', options: [AnyAccount.All, ...ACCOUNTS] },
    range: { control: 'radio', options: Object.values(GoldRange) },
    chart: { control: 'radio', options: Object.values(GoldChart) }
  },
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    html`<div class="content" style="height: 100vh">
      <wt-gold-view
        .gold=${GOLD}
        .history=${GOLD_HISTORY}
        .charHistory=${CHAR_HISTORY}
        .characters=${ROSTER}
        .hiddenKeys=${HIDDEN_KEYS}
        .accounts=${ACCOUNTS}
        account=${args.account}
        range=${args.range}
        chart=${args.chart}
        .lastSyncAt=${DATA_BUNDLE.lastSyncAt}
      ></wt-gold-view>
    </div>`
}

export default meta

/** What the account owns right now, and how it got there. */
export const Account: StoryObj<Args> = {}

export const OneAccount: StoryObj<Args> = { args: { account: 'WOW2', range: GoldRange.Quarter } }

/** The chart as one line for each character, in its class colour, over the season. */
export const ByCharacter: StoryObj<Args> = { args: { chart: GoldChart.Characters, range: GoldRange.All } }

/** Nothing read yet. */
export const Empty: StoryObj<Args> = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-gold-view .gold=${null} .history=${[]} .characters=${[]} .accounts=${[]} .lastSyncAt=${null}></wt-gold-view>
    </div>`
}
