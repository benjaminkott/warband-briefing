import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import type { BagItem, TooltipLine } from '../../../shared/types'
import { ItemCategory } from '../../../shared/enums/itemCategory'
import { MAIN, translatorFor } from '../stories/fixtures'
import { itemTip } from '../model/gameTip'
import './GameTip'
import './ItemTile'
import './ui/Tip'

/** The lines of an item of the fixture, by id. */
function linesOf(itemId: number): TooltipLine[] {
  const item = [...MAIN.bags!.items, ...MAIN.gear].find((each) => each.itemId === itemId)
  return item?.tooltip ?? []
}

const FLASK: BagItem = {
  itemId: 241322,
  name: 'Flask of the Magisters',
  count: 12,
  quality: 3,
  itemLevel: null,
  category: ItemCategory.Consumable,
  tooltip: linesOf(241322)
}
const CROWN: BagItem = {
  itemId: 212000,
  name: 'Crown of Consuming Radiance',
  count: 1,
  quality: 4,
  itemLevel: 678,
  category: ItemCategory.Armor,
  tooltip: linesOf(212000)
}
const BARE: BagItem = {
  itemId: 213196,
  name: 'Vial of Kaheti Oils',
  count: 12,
  quality: 3,
  itemLevel: null,
  category: ItemCategory.Consumable
}

const meta: Meta = {
  title: 'Shared/GameTip',
  component: 'wt-game-tip',
  render: (_args, context) => {
    const tr = translatorFor(context)
    return html`<div style="display: flex; gap: var(--s4); align-items: flex-start">
      <wt-tip class="hover-tip game-tip" style="position: static; transform: none"
        ><wt-game-tip .tip=${itemTip(tr, FLASK.tooltip)}></wt-game-tip
      ></wt-tip>
      <wt-tip class="hover-tip game-tip" style="position: static; transform: none"
        ><wt-game-tip .tip=${itemTip(tr, CROWN.tooltip)}></wt-game-tip
      ></wt-tip>
    </div>`
  }
}

export default meta

/** A consumable and a piece of gear: the name in the quality's colour, an effect in green, a slot with its type at the right, a blank line between the parts, and the note under them. */
export const Tips: StoryObj = {}

/** On a tile: rest the pointer on the first two; the third has no lines and keeps the name as its tip. */
export const OnTiles: StoryObj = {
  render: () =>
    html`<div style="display: flex; gap: var(--s1)">
      <wt-item-tile .item=${FLASK}></wt-item-tile>
      <wt-item-tile .item=${CROWN}></wt-item-tile>
      <wt-item-tile .item=${BARE}></wt-item-tile>
    </div>`
}
