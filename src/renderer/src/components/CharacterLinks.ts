import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { CharacterSnapshot } from '../../../shared/types'
import { characterLinks } from '../model/overview'
import { WtElement } from '../element'
import { brandColor } from './BrandMark'
import { Region } from '../../../shared/enums/region'
import { Place } from '../enums/place'
import './BrandMark'
import './ui/ExtLink'

/**
 * The places a player actually looks a character up, as a strip of marks.
 * Each is a `wt-ext-link` as a tile: the site's own mark, and its colour on
 * the edge when the pointer is on it, set as `--brand` on the host.
 *
 * Card and table share it, so a link means the same thing and sits in the same
 * order in both views. The window opens in the system browser - the app itself
 * never loads a page.
 */
@customElement('wt-character-links')
export class WtCharacterLinks extends WtElement {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** Region to build the links with when the sources did not report one. */
  @property() accessor region: Region = Region.Eu
  @property({ type: Number }) accessor size = 20
  /** The table packs the marks tighter and pushes them to the cell's end; the matrix has no links. */
  @property() accessor place: Exclude<Place, Place.Matrix> = Place.Card

  protected override willUpdate(): void {
    this.hostClasses({ 'char-links': this.place === Place.Card, 'table-links': this.place === Place.Table })
  }

  protected override render(): TemplateResult {
    return html`${characterLinks(this.character, this.region).map(
      (link) =>
        html`<wt-ext-link
          class="brand-link"
          href=${link.url}
          site=${link.label}
          .label=${html`<wt-brand-mark brand=${link.id} size=${this.size}></wt-brand-mark>`}
          style=${styleMap({ '--brand': brandColor(link.id) })}
        ></wt-ext-link>`
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-character-links': WtCharacterLinks
  }
}
