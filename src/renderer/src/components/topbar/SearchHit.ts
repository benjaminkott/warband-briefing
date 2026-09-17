import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { WtElement } from '../../element'
import { HitKind } from '../../enums/hitKind'
import { Stash } from '../../enums/stash'
import { FormatKind } from '../../enums/formatKind'
import { classColor } from '../../enums/classToken'
import { IconKind } from '../../../../shared/enums/iconKind'
import { qualityColor } from '../../model/gear'
import type { CharacterHit, Hit, ItemHit } from '../../model/search'
import '../ClassGlyph'
import '../GameIcon'
import '../ui/Format'

/**
 * One row of the list under the search field: who or what was found,
 * and where. A character is its glyph, its name in the class colour and
 * the words under it - the realm, the class, the spec - with the open
 * task that matched where the name did not. An item is its icon, its
 * name in the quality colour, the stack and the place it sits in. The
 * row is picked with the mouse or by the field's arrow keys; the field
 * raises the pick, so the row raises nothing of its own.
 */
@customElement('wt-search-hit')
export class WtSearchHit extends WtElement {
  @property({ attribute: false }) accessor hit!: Hit
  /** The row the arrow keys stand on. */
  @property({ type: Boolean }) accessor active = false
  /** Whether the account is worth a word on a warband item; with one account it is noise. */
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false

  protected override willUpdate(): void {
    this.hostClasses({ 'popover-row': true, 'search-hit': true, active: this.active })
    this.setAttribute('role', 'option')
    this.setAttribute('aria-selected', String(this.active))
  }

  protected override render(): TemplateResult {
    return this.hit.kind === HitKind.Character ? this.person(this.hit) : this.thing(this.hit)
  }

  private person(hit: CharacterHit): TemplateResult {
    const { character, task } = hit
    const color = classColor(character.classToken)
    return html`<wt-class-glyph class="hit-mark" token=${character.classToken ?? nothing} size="20"></wt-class-glyph>
      <span class="hit-main">
        <span class="hit-name" style=${color ? styleMap({ color }) : nothing}>${character.name}</span>
        <span class="hit-sub muted tiny">${[character.realm, character.className, character.spec].filter(Boolean).join(' · ')}</span>
        ${task ? html`<span class="hit-note faint tiny">${task}</span>` : nothing}
      </span>`
  }

  private thing(hit: ItemHit): TemplateResult {
    const { item } = hit
    const color = qualityColor(item.quality)
    return html`<wt-game-icon class="hit-mark" kind=${IconKind.Item} ref=${item.itemId} size="22"></wt-game-icon>
      <span class="hit-main">
        <span class="hit-name" style=${color ? styleMap({ color }) : nothing}>${item.name || `#${item.itemId}`}</span>
        <span class="hit-sub muted tiny"
          >${item.count > 1 ? html`× <wt-format kind=${FormatKind.Whole} .value=${item.count}></wt-format> · ` : nothing}${this.where(hit)}</span
        >
      </span>`
  }

  /** The place the item sits in, as the player would name it. */
  private where(hit: ItemHit): string {
    const tr = this.tr
    switch (hit.stash) {
      case Stash.Bags:
        return `${hit.character?.name ?? ''} · ${tr.t('detail.bags.bags')}`
      case Stash.Bank:
        return `${hit.character?.name ?? ''} · ${tr.t('detail.bags.bank')}`
      case Stash.Warband:
        return this.showAccount && hit.account ? `${tr.t('search.warband')} · ${hit.account}` : tr.t('search.warband')
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-search-hit': WtSearchHit
  }
}
