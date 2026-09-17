import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { hasContent, WtElement, type Content } from '../../element'

/**
 * One entry of a list inside a panel: a sunken box with a head line and a
 * body under it. The head holds a control at the left (a switch), the name,
 * and a badge after it (a chip that says the state). The body is one column
 * with one gap - a status line, a text, chips, a notice, an action - set in
 * from the control, so it lines up with the name.
 *
 * An entry that is `off` is drawn faded; the control stays usable, so the
 * reader can switch it back on. The sources panel fills one in for each
 * data source.
 */
@customElement('wt-entry')
export class WtEntry extends WtElement {
  /** The control at the left of the head: a checkbox, a mark. */
  @property({ attribute: false }) accessor control: Content = nothing
  /** Plain text as an attribute, or a template as a property. */
  @property() accessor label: Content = nothing
  /** What sits after the name: a chip with the state. */
  @property({ attribute: false }) accessor badge: Content = nothing
  /** The entry drawn as switched off. */
  @property({ type: Boolean }) accessor off = false
  /** The body under the head. */
  @property({ attribute: false }) accessor content: Content = nothing

  protected override willUpdate(): void {
    this.hostClasses({ entry: true, off: this.off })
  }

  protected override render(): TemplateResult {
    return html`<div class="entry-head">
        ${this.control}
        <span class="entry-name">${this.label}</span>
        ${this.badge}
      </div>
      ${hasContent(this.content) ? html`<div class="entry-body">${this.content}</div>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-entry': WtEntry
  }
}
