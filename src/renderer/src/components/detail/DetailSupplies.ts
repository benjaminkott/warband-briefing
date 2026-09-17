import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot } from '../../../../shared/types'
import { supplyStock } from '../../../../shared/supplies'
import { supplyLabel } from '../../model/labels'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import { Severity } from '../../enums/severity'
import '../ui/DashPanel'
import '../ui/Format'
import '../ui/Table'
import '../ui/PanelEmpty'
import '../ui/Row'
import '../ui/Cell'

/**
 * The season's consumables against what the character carries: flasks,
 * potions, runes - in the bags, in the bank, and how many its focus wants.
 * A short line is in the warning ink; the same shortage is an errand on
 * the list. Without a source that lists the bags the panel says so.
 */
@customElement('wt-detail-supplies')
export class WtDetailSupplies extends WtDetailPanel {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** The player's own minimums over the catalog's, by group id. */
  @property({ attribute: false }) accessor minimums: AppConfig['supplyMinimums'] = {}

  protected override willUpdate(): void {
    const tr = this.tr
    const stock = supplyStock(this.character, this.minimums)
    const short = (stock ?? []).filter((entry) => entry.short).length
    this.span = 6
    this.icon = 'bag'
    this.heading = tr.t('detail.supplies.title')
    this.aside = short > 0 ? tr.plural('detail.supplies.short', short) : undefined
    this.hostClasses({ [Severity.Warn]: short > 0 })
    this.content =
      stock === null
        ? html`<wt-panel-empty text=${tr.t('detail.supplies.noSource')} to-sources></wt-panel-empty>`
        : stock.length === 0
          ? html`<wt-panel-empty text=${tr.t('detail.supplies.noCatalog')}></wt-panel-empty>`
          : html`<wt-table
              kind=${TableKind.Detail}
              .columns=${[
                { label: tr.t('detail.col.supply') },
                { label: tr.t('detail.col.bags'), num: true },
                { label: tr.t('detail.col.bank'), num: true },
                { label: tr.t('detail.col.needed'), num: true }
              ]}
            >
              ${stock.map(
                (entry) =>
                  html`<wt-row class=${entry.short ? 'warn-text' : ''}>
                    <wt-cell>${supplyLabel(tr, entry.group)}</wt-cell>
                    <wt-cell class="num"><wt-format .value=${entry.inBags}></wt-format></wt-cell>
                    <wt-cell class="num muted"><wt-format .value=${entry.inBank}></wt-format></wt-cell>
                    <wt-cell class="num muted"><wt-format .value=${entry.needed}></wt-format></wt-cell>
                  </wt-row>`
              )}
            </wt-table>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-supplies': WtDetailSupplies
  }
}
