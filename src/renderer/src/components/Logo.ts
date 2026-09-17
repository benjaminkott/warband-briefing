import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'

/**
 * The app's own mark: a shield with the week ticked off.
 *
 * Drawn here rather than shipped as a file so it takes the topbar's colour and
 * stays crisp at any window scale.
 */
@customElement('wt-logo')
export class WtLogo extends WtElement {
  @property({ type: Number }) accessor size = 22

  protected override willUpdate(): void {
    this.hostClasses({ 'brand-logo': true })
  }

  protected override render(): TemplateResult {
    const size = this.size
    return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 2.6 20.4 5.6v6.6c0 4.4-3.3 7.9-8.4 9.2-5.1-1.3-8.4-4.8-8.4-9.2V5.6z" fill="currentColor" opacity="0.14" />
      <path
        d="M12 2.6 20.4 5.6v6.6c0 4.4-3.3 7.9-8.4 9.2-5.1-1.3-8.4-4.8-8.4-9.2V5.6z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path d="m8.2 11.9 2.7 2.7 5-5.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-logo': WtLogo
  }
}
