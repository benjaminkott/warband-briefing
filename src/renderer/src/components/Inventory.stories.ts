import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import type { Container } from '../../../shared/types'
import { MAIN, WARBAND_BANKS } from '../stories/fixtures'
import { inventoryGroups, shownGroups } from '../model/inventory'
import './Inventory'
import './InventoryGroup'

const bags: Container = { ...MAIN.bags!, name: 'Taschen' }
const containers: Container[] = [bags, ...MAIN.bank]

const meta: Meta = {
  title: 'Shared/Inventory',
  component: 'wt-inventory',
  render: () => html`<div style="max-width: 1100px"><wt-inventory .containers=${containers}></wt-inventory></div>`
}

export default meta

/** The bags and the bank tabs of the main: a strip of tabs, the open tab below. */
export const BagsAndBank: StoryObj = {}

/** The top bar's search handed down: one group per tab with a match, no tab lit. */
export const Searched: StoryObj = {
  render: () => html`<div style="max-width: 1100px"><wt-inventory .containers=${containers} query="potion"></wt-inventory></div>`
}

/** The warband bank: three tabs, the third one empty. */
export const WarbandBank: StoryObj = {
  render: () => html`<div style="max-width: 1100px"><wt-inventory .containers=${WARBAND_BANKS[0]!.tabs}></wt-inventory></div>`
}

/** One tab on its own: the caption line with the name and the space, the items below in columns. */
export const Group: StoryObj = {
  render: () =>
    html`<div style="max-width: 1100px">
      ${shownGroups(containers, '', 0).map((group) => html`<wt-inventory-group .group=${group}></wt-inventory-group>`)}
    </div>`
}

/** The groups of a search: one per tab with a match, only the lines that match. */
export const GroupSearched: StoryObj = {
  render: () =>
    html`<div style="max-width: 1100px" class="inventory-groups">
      ${inventoryGroups(containers, 'potion').map((group) => html`<wt-inventory-group .group=${group}></wt-inventory-group>`)}
    </div>`
}

/** An empty tab: the caption says the space, the line below says there is nothing in it. */
export const GroupEmpty: StoryObj = {
  render: () =>
    html`<div style="max-width: 1100px">
      ${shownGroups([{ name: 'Tab 3', slots: 98, free: 98, items: [] }], '', 0).map((group) => html`<wt-inventory-group .group=${group}></wt-inventory-group>`)}
    </div>`
}
