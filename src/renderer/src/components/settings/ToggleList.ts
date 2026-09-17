import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement, type Content } from '../../element'

/** The rows, one under the other; the host is the `.char-toggles` column. */
@customElement('wt-toggle-list')
export class WtToggleList extends WtElement {
  @property({ attribute: false }) accessor content: Content = nothing

  protected override willUpdate(): void {
    this.hostClasses({ 'char-toggles': true })
  }

  protected override render(): TemplateResult {
    return html`${this.content}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-toggle-list': WtToggleList
  }
}
