import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement, type Content } from '../../element'

/** A closing line under a panel's content: a hint on how to read it. */
@customElement('wt-panel-foot')
export class WtPanelFoot extends WtElement {
  @property() accessor text: Content = nothing

  protected override willUpdate(): void {
    this.hostClasses({ faint: true, tiny: true, 'dash-foot': true })
  }

  protected override render(): TemplateResult {
    return html`${this.text}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-panel-foot': WtPanelFoot
  }
}
