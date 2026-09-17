import { css, html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'

/**
 * A list of checkboxes that stays readable at any panel width: as many
 * columns as fit, never one long column of short labels. The checkboxes
 * are its children; the currencies, the factions and the view flags fill
 * it. The grid is its own stylesheet; how a row sits in a cell reaches
 * into the checkbox and stays in `styles.css`, keyed on the tag.
 */
@customElement('wt-check-grid')
export class WtCheckGrid extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--s2) var(--s4);
      align-items: start;
    }
  `

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-check-grid': WtCheckGrid
  }
}
