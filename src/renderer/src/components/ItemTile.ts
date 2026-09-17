import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { BagItem } from '../../../shared/types'
import { IconKind } from '../../../shared/enums/iconKind'
import { WowheadKind, wowheadUrl } from '../enums/wowheadKind'
import { qualityColor } from '../model/gear'
import { itemTip } from '../model/gameTip'
import { tileFigure } from '../model/inventory'
import { WtExtLink } from './ui/ExtLink'
import './GameIcon'
import './CraftTier'
import './ui/Format'

/**
 * One item as a bag addon draws it: a square with the game's icon, the
 * edge in the colour of the quality, and in the corner the figure a
 * player reads off a bag - the count of a stack, the item level of a
 * piece of gear. The tooltip is the item's as the client draws it where
 * the companion registered the lines, else the name; the tile is the way
 * to the item's page, so it is a `wt-ext-link` that draws a tile in place
 * of a word.
 *
 * The same square with the number of free slots is the last tile of a
 * container (`free`): it is not a link, and it has no icon.
 */
@customElement('wt-item-tile')
export class WtItemTile extends WtExtLink {
  @property({ attribute: false }) accessor item: BagItem | null = null
  /** The free slots of a container, in place of an item. */
  @property({ type: Number }) accessor free: number | null = null

  protected override willUpdate(): void {
    const item = this.item
    this.href = item ? wowheadUrl(WowheadKind.Item, item.itemId, this.tr.locale) : ''
    this.site = 'Wowhead'
    this.wowhead = item ? (item.wowhead ?? `item=${item.itemId}`) : null
    this.hostClasses({ 'item-tile': true, 'item-tile-free': item === null })
    this.hostVar('--quality-color', item ? qualityColor(item.quality) : null)
    // Wowhead's tooltip, while its switch is on, stands in for the game's.
    this.gameTip = item && this.wowheadOff ? itemTip(this.tr, item.tooltip) : null
    super.willUpdate()
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const item = this.item
    if (!item) {
      const free = this.free ?? 0
      return html`<span class="tile" data-tip=${tr.t('detail.bags.freeSlots', { free })}
        ><wt-format class="item-tile-figure" .value=${free}></wt-format
      ></span>`
    }
    const name = item.name || `#${item.itemId}`
    const figure = tileFigure(item)
    return html`<a
      href=${this.href}
      aria-label=${name}
      data-wowhead=${this.wowhead ?? nothing}
      data-disable-wowhead-tooltip=${this.wowheadOff ? 'true' : nothing}
      data-tip=${this.gameTip || !this.wowheadOff ? nothing : `${name}\n${tr.t('card.openOn', { site: this.site })}`}
      @click=${this.onClick}
      ><wt-game-icon kind=${IconKind.Item} ref=${item.itemId} size="40"></wt-game-icon
      ><wt-craft-tier tier=${item.craftTier ?? nothing}></wt-craft-tier>${
        figure === null ? nothing : html`<wt-format class="item-tile-figure" .value=${figure}></wt-format>`
      }</a
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-item-tile': WtItemTile
  }
}
