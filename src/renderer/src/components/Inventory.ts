import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { Container } from '../../../shared/types'
import type { Translator } from '../../../shared/i18n'
import { WtElement, type WtEvent } from '../element'
import { shownGroups } from '../model/inventory'
import { memoLast } from '../memo'
import './InventoryGroup'
import './ui/Segmented'
import type { SegmentedOption } from './ui/Segmented'

/**
 * What is in a set of containers: the bags and the bank of a character,
 * the warband bank. One strip of switches, one for each container, and
 * below it the one the player opened, in the full width of the panel; a
 * lone container needs no strip. A bank is one container here, its tabs
 * folded into one bag by the caller, the way a bag addon shows it. The
 * query is the top bar's, handed down by the view; it goes over every
 * container: "where are my flasks" is answered by the list, one group
 * per container with a match, and no switch is lit while it does.
 *
 * Every container comes in with a name; the caller names the nameless
 * ones (the bags, an old bank without tabs), since only it knows what
 * they are.
 *
 * @fires wt-query - Empty: a tab pressed during a search ends the search.
 */
@customElement('wt-inventory')
export class WtInventory extends WtElement {
  @property({ attribute: false }) accessor containers: Container[] = []
  /** The place's search text, from the top bar. */
  @property() accessor query = ''
  /** The index of the open tab. */
  @state() accessor selected = 0

  private groupsOf = memoLast((containers: Container[], query: string, selected: number) => shownGroups(containers, query, selected))

  // One switch per container: its name on the button, its space and its
  // count in the tip, so a full tab and an empty one tell apart before
  // they are opened.
  private tabsOf = memoLast((containers: Container[], tr: Translator): SegmentedOption[] =>
    containers.map((container, index) => ({
      value: String(index),
      label: container.name ?? '',
      tip: `${tr.t('detail.bags.free', { free: container.free, slots: container.slots })} · ${tr.plural('detail.bags.kinds', container.items.length)}`
    }))
  )

  protected override willUpdate(): void {
    this.hostClasses({ inventory: true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const groups = this.groupsOf(this.containers, this.query, this.selected)
    const searching = this.query.trim().length > 0
    return html`
      ${
        this.containers.length > 1
          ? html`<div class="inventory-bar">
              <wt-segmented
                .options=${this.tabsOf(this.containers, tr)}
                value=${searching ? '' : String(this.selected)}
                @wt-change=${(event: WtEvent<'wt-change'>) => {
                  event.stopPropagation()
                  // A tab pressed during a search ends the search: the player
                  // asked for the tab, not for the matches on it.
                  if (searching) this.emit('wt-query', '')
                  this.selected = Number(event.detail)
                }}
              ></wt-segmented>
            </div>`
          : nothing
      }
      ${
        groups.length === 0
          ? html`<p class="faint tiny panel-empty">${tr.t('detail.bags.noMatch')}</p>`
          : html`<div class="inventory-groups">
              ${groups.map((group) => html`<wt-inventory-group .group=${group}></wt-inventory-group>`)}
            </div>`
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-inventory': WtInventory
  }
}
