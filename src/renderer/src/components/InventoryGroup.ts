import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'
import { WtElement } from '../element'
import { categoryGroups, MIN_GROUP_SPAN, packBands, type InventoryGroup } from '../model/inventory'
import { styleMap } from 'lit/directives/style-map.js'
import { memoLast } from '../memo'
import './ItemTile'

/**
 * One container: its name and its space on the caption line, its items
 * below as a bag addon draws a bag - a run of tiles for each group, the
 * groups side by side as the width allows, the free slots as the last
 * tile. An empty tab says so, since a caption alone looks like a list
 * that did not load.
 */
@customElement('wt-inventory-group')
export class WtInventoryGroup extends WtElement {
  @property({ attribute: false }) accessor group!: InventoryGroup
  /** The columns of cells the field's width holds; the cards are packed on them. */
  @state() private accessor columns = 0
  /** A cell's pitch in pixels - the tile and the gap after it - read off the stylesheet. */
  @state() private accessor pitch = 44
  @query('.inventory-cats') private accessor grid: HTMLElement | null = null

  // The field's width says where the cards go, and it changes with the
  // window, so the field is watched.
  private observer = new ResizeObserver(() => this.measure())

  protected override willUpdate(): void {
    this.hostClasses({ 'inventory-group': true })
  }

  protected override updated(): void {
    const grid = this.grid
    this.observer.disconnect()
    if (grid) {
      this.observer.observe(grid)
      this.measure()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer.disconnect()
  }

  private measure(): void {
    const grid = this.grid
    if (!grid) return
    // The measures are the stylesheet's, read off the field, so the
    // packing and the drawing agree on one set of numbers.
    const style = getComputedStyle(grid)
    const px = (name: string): number => Number.parseFloat(style.getPropertyValue(name))
    const tile = px('--tile-size')
    const gap = px('--tile-gap')
    const pad = px('--tile-pad')
    const pitch = Number.isFinite(tile) && Number.isFinite(gap) ? tile + gap : this.pitch
    // A card is its cells and its padding wide; the free column after it
    // holds the padding's overhang, so the last card needs that much of
    // its free column inside the field, not the whole cell.
    const overhang = Number.isFinite(pad) ? 2 * pad - gap : 0
    const columns = Math.max(0, Math.floor((grid.clientWidth + pitch - overhang) / pitch))
    if (columns !== this.columns) this.columns = columns
    if (pitch !== this.pitch) this.pitch = pitch
  }

  private groupsOf = memoLast(categoryGroups)

  protected override render(): TemplateResult {
    const tr = this.tr
    const { container, items } = this.group
    const groups = this.groupsOf(items)
    // The free slots are the last group, one tile.
    const spans = packBands([...groups.map((group) => group.items.length), ...(container.free > 0 ? [1] : [])], this.columns)
    const pitch = this.pitch
    // A card takes its tiles' cells and the free column after them; its
    // box is the cells and its padding, so the tiles fill it exactly.
    const place = (index: number) =>
      styleMap({
        gridColumn: `span ${spans[index]! + 1}`,
        width: `calc(${spans[index]! * pitch}px - var(--tile-gap) + 2 * var(--tile-pad))`
      })
    // The last column is a free one: it takes the room the field has
    // left, a cell at most, so the field never runs over its box.
    const width = Math.max(MIN_GROUP_SPAN + 1, this.columns)
    const field = styleMap({ gridTemplateColumns: `repeat(${width - 1}, ${pitch}px) minmax(0, ${pitch}px)` })
    return html`
      <div class="inventory-group-head">
        <span class="group-title">${container.name ?? ''}</span>
        <span class="inventory-group-space">${tr.t('detail.bags.free', { free: container.free, slots: container.slots })}</span>
      </div>
      ${
        items.length === 0
          ? html`<p class="faint tiny panel-empty">${tr.t('detail.bags.emptyTab')}</p>`
          : html`<div class="inventory-cats" style=${field}>
              ${groups.map(
                (group, index) =>
                  html`<div class="inventory-cat" style=${place(index)}>
                    <span class="inventory-cat-name" data-tip=${tr.t(`category.${group.category}`)}
                      >${tr.t(`category.${group.category}`)}</span
                    >
                    <div class="inventory-tiles">${group.items.map((item) => html`<wt-item-tile .item=${item}></wt-item-tile>`)}</div>
                  </div>`
              )}
              ${
                container.free > 0
                  ? html`<div class="inventory-cat" style=${place(groups.length)}>
                      <span class="inventory-cat-name">${tr.t('detail.bags.freeGroup')}</span>
                      <div class="inventory-tiles"><wt-item-tile free=${container.free}></wt-item-tile></div>
                    </div>`
                  : nothing
              }
            </div>`
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-inventory-group': WtInventoryGroup
  }
}
