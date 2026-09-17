import { css, html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { percentOf } from '../model/format'
import { WtElement } from '../element'
import { FormatKind } from '../enums/formatKind'
import './ui/Bar'
import './ui/Format'

/**
 * One line of a breakdown: a name, its share of the whole as a bar and a
 * figure, the amount in gold. The name is the row's children - a word, or
 * a medallion, the name as the way to the character's page and a note
 * after it - so the sheet outside keeps reaching them. An `off` row is
 * dimmed: a character that is not on the roster still holds its gold.
 */
@customElement('wt-share-row')
export class WtShareRow extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: minmax(150px, 1.3fr) minmax(60px, 1fr) 40px minmax(90px, auto);
      align-items: center;
      gap: var(--s3);
      padding: var(--s2) 0;
      border-top: 1px solid var(--border);
    }

    :host(:first-child) {
      border-top: none;
    }

    :host([off]) {
      opacity: 0.5;
    }

    .label {
      display: flex;
      align-items: center;
      gap: var(--s2);
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    }

    /* The note after a name gives way first: the name and the figures stay. */
    ::slotted(span) {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    wt-bar {
      margin-top: 0;
    }

    .share {
      font-size: var(--fs-tiny);
      color: var(--text-faint);
      text-align: right;
    }

    .value {
      text-align: right;
      color: var(--gold);
    }
  `

  /** The part, in copper. */
  @property({ type: Number }) accessor value = 0
  /** The whole, in copper. */
  @property({ type: Number }) accessor total = 0
  /** The row drawn as switched off. */
  @property({ type: Boolean, reflect: true }) accessor off = false

  protected override render(): TemplateResult {
    const { value, total } = this
    return html`<span class="label"><slot></slot></span>
      <wt-bar percent=${percentOf(value, total)} role="presentation"></wt-bar>
      <wt-format kind=${FormatKind.Percent} .value=${total > 0 ? value / total : 0} class="share"></wt-format>
      <wt-format kind=${FormatKind.Gold} .value=${value} class="value"></wt-format>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-share-row': WtShareRow
  }
}
