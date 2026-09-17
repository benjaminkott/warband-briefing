import { css, html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'

/**
 * A row of chips, or the sentence that says why there are none. The card's
 * blocks, the goal strip of the character page and the board all put their
 * chips in one. The chips are the row's children and fall into its slot;
 * with `empty` set, the row shows that sentence in the faint small print
 * of an empty block instead.
 */
@customElement('wt-chips')
export class WtChips extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: var(--chip-gap);
    }

    :host([empty]) {
      display: block;
      font-size: var(--fs-tiny);
      color: var(--text-faint);
    }
  `

  /** The sentence for an empty row; set, it replaces the chips. */
  @property({ reflect: true }) accessor empty: string | undefined = undefined

  protected override render(): TemplateResult {
    return this.empty !== undefined ? html`${this.empty}` : html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-chips': WtChips
  }
}
