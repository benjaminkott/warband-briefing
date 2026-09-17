import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ACCOUNTS, WARBAND_BANKS } from '../../stories/fixtures'
import { AnyAccount } from '../../../../shared/enums/anyAccount'
import './BankView'

interface Args {
  account: string
}

const meta: Meta<Args> = {
  title: 'Views/BankView',
  component: 'wt-bank-view',
  args: { account: AnyAccount.All },
  argTypes: {
    account: { control: 'radio', options: [AnyAccount.All, ...ACCOUNTS] }
  },
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    html`<div class="content" style="height: 100vh">
      <wt-bank-view .banks=${WARBAND_BANKS} .accounts=${ACCOUNTS} account=${args.account}></wt-bank-view>
    </div>`
}

export default meta

/** The warband bank of the account, tab by tab, with the moment the companion read it. */
export const Account: StoryObj<Args> = {}

/** An account the companion has not visited the bank with. */
export const OtherAccount: StoryObj<Args> = { args: { account: 'WOW2' } }

/** Nothing read yet. */
export const Empty: StoryObj<Args> = {
  render: () =>
    html`<div class="content" style="height: 100vh">
      <wt-bank-view .banks=${[]} .accounts=${[]}></wt-bank-view>
    </div>`
}
