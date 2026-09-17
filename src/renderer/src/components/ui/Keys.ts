import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import { strokeParts, type Stroke } from '../../model/shortcuts'

/**
 * One key stroke as key caps: `Strg` `+` `1`. The words are the keyboard's
 * language, from shortcuts.ts; the element only sets each on a cap.
 */
@customElement('wt-keys')
export class WtKeys extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property({ attribute: false }) accessor stroke: Stroke = { key: '' }

  protected override willUpdate(): void {
    this.hostClasses({ keys: true })
  }

  protected override render(): TemplateResult {
    const parts = strokeParts(this.stroke, this.tr)
    return html`${parts.map((part, index) => html`${index > 0 ? html`<span class="keys-plus">+</span>` : ''}<kbd>${part}</kbd>`)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-keys': WtKeys
  }
}
