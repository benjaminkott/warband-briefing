import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'
import '../Logo'

/** The mark and the name at the left of the bar: what the window is. */
@customElement('wt-brand')
export class WtBrand extends WtElement {
  protected override willUpdate(): void {
    this.hostClasses({ brand: true })
  }

  protected override render(): TemplateResult {
    return html`<wt-logo></wt-logo>
      <h1>${this.tr.t('app.name')}</h1>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-brand': WtBrand
  }
}
