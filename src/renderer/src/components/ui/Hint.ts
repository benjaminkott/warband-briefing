import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement, type Content } from '../../element'
import type { IconName } from '../Icon'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/** A line of help under a control, with the mark that says it is one. */
@customElement('wt-hint')
export class WtHint extends WtElement {
  @property() accessor icon: IconName = 'info'
  @property() accessor text: Content = nothing

  protected override willUpdate(): void {
    this.hostClasses({ hint: true })
  }

  protected override render(): TemplateResult {
    return html`<wt-icon name=${this.icon} size=${IconSize.Sm}></wt-icon>${this.text}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-hint': WtHint
  }
}
