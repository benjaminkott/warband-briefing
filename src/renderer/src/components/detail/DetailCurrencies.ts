import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot } from '../../../../shared/types'
import { capReached, currencyRows } from './model'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import { IconKind } from '../../../../shared/enums/iconKind'
import '../ui/DashPanel'
import '../Icon'
import '../GameIcon'
import '../ui/Format'
import '../ui/PanelEmpty'
import '../ui/Row'
import '../ui/Cell'
import { IconSize } from '../../enums/iconSize'

/** Every currency a source reported, with its cap and its week where it has one. */
@customElement('wt-detail-currencies')
export class WtDetailCurrencies extends WtDetailPanel {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** The currencies the user watches: first in the list, marked with an eye. */
  @property({ attribute: false }) accessor tracked: Set<number> = new Set()

  protected override willUpdate(): void {
    const tr = this.tr
    const tracked = this.tracked
    const rows = currencyRows(this.character, tracked)
    this.icon = 'coins'
    this.heading = tr.t('card.currencies')
    this.aside = rows.length || undefined
    this.content =
      rows.length === 0
        ? html`<wt-panel-empty text=${tr.t('detail.currencies.empty')}></wt-panel-empty>`
        : html`<wt-table
            kind=${TableKind.Detail}
            .columns=${[
              { label: tr.t('detail.col.currency') },
              { label: tr.t('detail.col.amount'), num: true },
              { label: tr.t('detail.col.cap'), num: true },
              { label: tr.t('detail.col.week'), num: true }
            ]}
          >
            ${rows.map(
              (currency) =>
                html`<wt-row>
                  <wt-cell>
                    ${
                      tracked.has(currency.id)
                        ? html`<wt-icon
                            name="eye"
                            size=${IconSize.Xs}
                            class="detail-row-icon"
                            label=${tr.t('detail.currencies.tracked')}
                          ></wt-icon>`
                        : nothing
                    }<wt-game-icon class="detail-row-icon" kind=${IconKind.Currency} ref=${currency.id} size="16"></wt-game-icon
                    >${currency.name || tr.t('currency.unknown', { id: currency.id })}
                  </wt-cell>
                  <wt-cell class="num"><wt-format .value=${currency.quantity}></wt-format></wt-cell>
                  <wt-cell class="num muted"><wt-format .value=${currency.max || null}></wt-format></wt-cell>
                  <wt-cell class=${`num${capReached(currency) ? ' ok-text' : ''}`}>
                    ${
                      currency.weeklyMax !== null
                        ? html`<wt-format .value=${currency.earnedThisWeek ?? 0}></wt-format>/<wt-format
                              .value=${currency.weeklyMax}
                            ></wt-format>`
                        : '—'
                    }
                  </wt-cell>
                </wt-row>`
            )}
          </wt-table>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-currencies': WtDetailCurrencies
  }
}
