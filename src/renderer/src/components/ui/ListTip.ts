import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { WtElement } from '../../element'
import type { ListTip } from '../../model/listTip'
import { severityClasses } from '../../enums/severity'

/**
 * A tooltip with a heading over rows: a label at the left, its value at
 * the right, the values one under the other so the eye runs down one
 * column. A value wears its tone - `ok` for what is done, `warn` for what
 * is not - so the open rows stand out of the done ones. A note under the
 * rows says where the figures come from. `wt-tip-layer`
 * puts it inside its `wt-tip` when the pointer rests on a host with a
 * `listTip`; the surface is the tip's.
 */
@customElement('wt-list-tip')
export class WtListTip extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: auto auto;
      column-gap: var(--s4);
      row-gap: var(--s0);
      min-width: 160px;
      white-space: nowrap;
    }
    .heading {
      grid-column: 1 / -1;
      margin-bottom: var(--s1);
      padding-bottom: var(--s1);
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }
    .value {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .value.ok {
      color: var(--ok-text);
    }
    .value.warn {
      color: var(--warn-text);
    }
    .value.danger {
      color: var(--danger-text);
    }
    .note {
      grid-column: 1 / -1;
      margin-top: var(--s1);
      padding-top: var(--s1);
      border-top: 1px solid var(--border);
      max-width: 260px;
      white-space: normal;
      color: var(--text-dim);
    }
  `

  @property({ attribute: false }) accessor tip: ListTip | null = null

  protected override render(): TemplateResult {
    const tip = this.tip
    if (!tip) return html`${nothing}`
    return html`<div class="heading">${tip.heading}</div>
      ${tip.rows.map(
        (row) =>
          html`<div class="label">${row.label}</div>
            <div class=${classMap({ value: true, ...severityClasses(row.tone) })}>${row.value}</div>`
      )}
      ${tip.note ? html`<div class="note">${tip.note}</div>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-list-tip': WtListTip
  }
}
