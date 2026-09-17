import { css, html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../element'

/**
 * A breakdown of the gold: one line for each part, its share of the whole
 * and its amount. The rows are its children; each row lays itself out.
 */
@customElement('wt-share-list')
export class WtShareList extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: block;
      margin-top: var(--s1);
    }
  `

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-share-list': WtShareList
  }
}
