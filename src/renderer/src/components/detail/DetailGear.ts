import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { CharacterSnapshot, GearItem } from '../../../../shared/types'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../../shared/display'
import { qualityColor, slotLabel, takesEnchant } from '../../model/gear'
import { itemTip } from '../../model/gameTip'
import { wowheadTooltipsEnabled } from '../../wowheadTooltips'
import { whole } from '../../model/format'
import { gearRows } from './model'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import { FormatKind } from '../../enums/formatKind'
import { IconKind } from '../../../../shared/enums/iconKind'
import { WowheadKind, wowheadUrl } from '../../enums/wowheadKind'
import '../ui/DashPanel'
import '../ui/Format'
import '../ui/ExtLink'
import '../GameIcon'
import '../ui/PanelEmpty'
import '../ui/PanelFoot'
import '../ui/Row'
import '../ui/Cell'

/**
 * Every equipped item, slot by slot. The card boils this down to "two rings
 * unenchanted"; here each slot says for itself what it is, how high it is and
 * what it is still missing.
 */
@customElement('wt-detail-gear')
export class WtDetailGear extends WtDetailPanel {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS

  protected override willUpdate(): void {
    const tr = this.tr
    const { rows, check, open, emptySockets } = gearRows(this.character, this.flags)

    const enchantCell = (item: GearItem): TemplateResult => {
      if (!takesEnchant(item)) return html`<wt-format class="faint"></wt-format>`
      if (item.enchantId === null) return html`<span class="faint">${tr.t('detail.gear.unknown')}</span>`
      if (item.enchantId === 0) return html`<span class="warn-text">${tr.t('detail.gear.unenchanted')}</span>`
      return html`<span class="ok-text">${tr.t('detail.gear.enchanted')}</span>`
    }
    const socketCell = (item: GearItem): TemplateResult => {
      if (!item.sockets) return html`<wt-format class="faint"></wt-format>`
      return html`<span class=${emptySockets.has(item) ? 'warn-text' : 'ok-text'}>${item.gems}/${item.sockets}</span>`
    }

    this.span = 12
    this.icon = 'shield'
    this.heading = tr.t('card.gear')
    this.aside = check.known ? (check.issues > 0 ? tr.plural('detail.gear.issues', check.issues) : tr.t('gear.ok')) : undefined
    this.content = html`${
      rows.length === 0
        ? html`<wt-panel-empty text=${tr.t('card.noGear')}></wt-panel-empty>`
        : html`<wt-table
            kind=${TableKind.Detail}
            .columns=${[
              { label: tr.t('detail.col.slot') },
              { label: tr.t('detail.col.item') },
              { label: tr.t('detail.col.ilvl'), num: true },
              { label: tr.t('detail.col.track') },
              { label: tr.t('detail.col.enchant') },
              { label: tr.t('detail.col.sockets') }
            ]}
          >
            ${rows.map((item) => {
              const color = qualityColor(item.quality)
              const weakest = check.weakest === item
              // Wowhead's tooltip, while its switch is on, stands in for the game's.
              const tip = wowheadTooltipsEnabled() ? null : itemTip(tr, item.tooltip)
              return html`<wt-row
                class=${[open.has(item) ? 'detail-open' : '', weakest ? 'detail-weakest' : ''].filter(Boolean).join(' ') || nothing}
                data-tip=${weakest ? tr.t('gear.weakest', { slot: slotLabel(tr, item.slot), ilvl: whole(tr, item.itemLevel) }) : nothing}
              >
                <wt-cell class="muted">${slotLabel(tr, item.slot)}</wt-cell>
                <!-- The game's icon before the name, the name is the way to the item's page, and the cell's tip is the item's tooltip where the client gave one. -->
                <wt-cell class="detail-item" style=${color ? styleMap({ color }) : nothing} .gameTip=${tip}>
                  <wt-game-icon class="detail-row-icon" kind=${IconKind.Item} ref=${item.itemId} size="16"></wt-game-icon>
                  <wt-ext-link
                    class="ext-link"
                    href=${wowheadUrl(WowheadKind.Item, item.itemId, tr.locale)}
                    site="Wowhead"
                    label=${item.name || `#${item.itemId}`}
                    ?quiet=${tip !== null}
                    wowhead=${item.wowhead ?? `item=${item.itemId}`}
                  ></wt-ext-link>
                </wt-cell>
                <wt-cell class="num"><wt-format kind=${FormatKind.Whole} .value=${item.itemLevel}></wt-format></wt-cell>
                <wt-cell class="muted">${item.track ?? '—'}</wt-cell>
                <wt-cell>${enchantCell(item)}</wt-cell>
                <wt-cell>${socketCell(item)}</wt-cell>
              </wt-row>`
            })}
          </wt-table>`
    }
    ${check.known && !check.socketsKnown ? html`<wt-panel-foot .text=${tr.t('gear.socketsUnknown')}></wt-panel-foot>` : nothing}`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-gear': WtDetailGear
  }
}
