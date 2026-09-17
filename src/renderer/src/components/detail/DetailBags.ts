import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot, Container } from '../../../../shared/types'
import type { Translator } from '../../../../shared/i18n'
import { inventoryTotals, mergeContainers } from '../../model/inventory'
import { memoLast } from '../../memo'
import { WtDetailPanel } from './DetailPanel'
import '../ui/DashPanel'
import '../Inventory'
import '../ui/PanelEmpty'

/**
 * What the character carries and what sits in its bank, the top bar's
 * search over both. The card says how many slots are free; this is where the
 * player looks before a raid evening for the flasks the card cannot count
 * yet (decision C12).
 */
@customElement('wt-detail-bags')
export class WtDetailBags extends WtDetailPanel {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** The place's search text, from the top bar. */
  @property() accessor query = ''

  // Two places: the bags, and the bank with its tabs folded into one bag,
  // the way a bag addon shows it. Named here, once per change of what the
  // snapshot holds.
  private containersOf = memoLast((bags: Container | null, bank: Container[], tr: Translator): Container[] => [
    ...(bags ? [{ ...bags, name: tr.t('detail.bags.bags') }] : []),
    ...(bank.length > 0 ? [mergeContainers(bank, tr.t('detail.bags.bank'))] : [])
  ])

  protected override willUpdate(): void {
    const tr = this.tr
    const containers = this.containersOf(this.character.bags, this.character.bank, tr)
    const totals = inventoryTotals(containers)
    this.span = 12
    this.icon = 'bag'
    this.heading = tr.t('detail.bags.title')
    this.aside = containers.length > 0 ? tr.plural('detail.bags.kinds', totals.kinds) : undefined
    this.content =
      containers.length === 0
        ? html`<wt-panel-empty text=${tr.t('detail.bags.empty')} to-sources></wt-panel-empty>`
        : html`<wt-inventory .containers=${containers} query=${this.query}></wt-inventory>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-bags': WtDetailBags
  }
}
