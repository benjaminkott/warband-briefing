import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import type { BagItem } from '../../../shared/types'
import { ItemCategory } from '../../../shared/enums/itemCategory'
import './ItemTile'

const FLASK: BagItem = {
  itemId: 213196,
  name: 'Vial of Kaheti Oils',
  count: 12,
  quality: 3,
  itemLevel: null,
  category: ItemCategory.Consumable,
  craftTier: 3
}
const CROWN: BagItem = {
  itemId: 212000,
  name: 'Crown of Consuming Radiance',
  count: 1,
  quality: 4,
  itemLevel: 678,
  category: ItemCategory.Armor
}
const HEARTH: BagItem = { itemId: 6948, name: 'Hearthstone', count: 1, quality: 1, itemLevel: null, category: ItemCategory.Misc }
const UNKNOWN: BagItem = { itemId: 1, name: 'Wretched Fang', count: 8, quality: 0, itemLevel: null, category: null }

const meta: Meta = {
  title: 'Shared/ItemTile',
  component: 'wt-item-tile',
  render: () =>
    html`<div style="display: flex; gap: var(--s1)">
      <wt-item-tile .item=${FLASK}></wt-item-tile>
      <wt-item-tile .item=${CROWN}></wt-item-tile>
      <wt-item-tile .item=${HEARTH}></wt-item-tile>
      <wt-item-tile .item=${UNKNOWN}></wt-item-tile>
      <wt-item-tile free="9"></wt-item-tile>
    </div>`
}

export default meta

/** A stack with its count and its crafting tier, a piece of gear with its level, a single item with nothing, an item without an icon, and the free slots. */
export const Tiles: StoryObj = {}
