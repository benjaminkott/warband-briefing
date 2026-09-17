import { css, html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { DetailListKind } from '../../enums/detailListKind'

/**
 * The list of a character page panel: lines with a hairline between them.
 * Two cuts, one element with a `kind` - the plain list of lines, `bars`
 * for a name, a figure and a bar across the row (professions). The lines
 * are the list's children, each a `wt-detail-entry`; the list renders into
 * a shadow root and says how a line of the bars cut is laid out, since
 * that is the list's cut, not the line's.
 */
@customElement('wt-detail-list')
export class WtDetailList extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: block;
    }

    /* Renown and professions: a name, a figure and a bar across the row. */
    :host([kind='bars']) ::slotted(wt-detail-entry) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: var(--s0) var(--s3);
      padding: var(--s2) 0;
    }
  `

  @property({ reflect: true }) accessor kind: DetailListKind = DetailListKind.Lines

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-list': WtDetailList
  }
}
