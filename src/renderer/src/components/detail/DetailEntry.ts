import { css, html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'

/**
 * One line of the list: what the panel puts in it, as its children, set
 * on one line with a hairline under it. The last line has none.
 */
@customElement('wt-detail-entry')
export class WtDetailEntry extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--s2);
      padding: var(--s1) 0;
      border-bottom: 1px solid var(--border);
      font-size: var(--fs-base);
    }

    :host(:last-child) {
      border-bottom: none;
    }
  `

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-entry': WtDetailEntry
  }
}
