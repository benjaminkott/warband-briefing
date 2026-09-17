import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { hasContent, WtElement, type Content } from '../../element'

/**
 * One row of the settings' roster: a mark, a name, and the switches and
 * boxes in columns of their own at the right - so the eye runs down a
 * column of names and a column of ticks. The accounts and the characters
 * are both lists of these; the character list puts a `head` row above,
 * whose cells are the switches for a whole column.
 */
@customElement('wt-toggle-row')
export class WtToggleRow extends WtElement {
  /** The folder mark of an account, the medallion of a character. */
  @property({ attribute: false }) accessor mark: Content = nothing
  /** Plain text as an attribute, or a template as a property. */
  @property() accessor label: Content = nothing
  /** The row drawn as switched off. */
  @property({ type: Boolean }) accessor off = false
  /** The head row: the same columns, a hairline under it, no hover. */
  @property({ type: Boolean }) accessor head = false
  /** The cells after the name. */
  @property({ attribute: false }) accessor content: Content = nothing

  protected override willUpdate(): void {
    this.hostClasses({ 'char-toggle': true, off: this.off, 'char-toggle-head': this.head })
  }

  protected override render(): TemplateResult {
    // The head's second cell is a caption, not a name: it keeps its own type.
    return html`${hasContent(this.mark) ? this.mark : html`<span></span>`}${
      this.head ? this.label : html`<span class="char-toggle-name">${this.label}</span>`
    }${this.content}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-toggle-row': WtToggleRow
  }
}
