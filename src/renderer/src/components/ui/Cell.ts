import { css, html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'

/**
 * One cell of a row: what the panel puts in it, as its children. The host
 * is the cell of the table's flat tree, and carries the classes the sheet
 * keys a cell on (`num`, `row-action`, `detail-wrap`).
 */
@customElement('wt-cell')
export class WtCell extends WtElement {
  static override shadow = true

  static override styles = css`
    /* What a td has by default; the detail kind sets top in the sheet. */
    :host {
      display: table-cell;
      vertical-align: middle;
    }
  `

  override connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'cell')
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-cell': WtCell
  }
}
