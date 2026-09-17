import { css, html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'

/** One row of a table: its cells are its children. The host is the row of the table's flat tree. */
@customElement('wt-row')
export class WtRow extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: table-row;
    }
  `

  override connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'row')
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-row': WtRow
  }
}
