import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Content } from '../../element'
import { WtCard } from './Card'
import type { IconName } from '../Icon'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * A settings section, or any full-size panel with a titled head.
 *
 * The heading is one shape everywhere: an icon that says what the section is
 * about, the title, and the step number on the right - the numbers used to sit
 * inside the translated strings, where they could not line up.
 *
 * The body is the panel's children, as with every card. An element that is a
 * panel works its body out in `willUpdate` and fills `content` in instead.
 */
@customElement('wt-panel')
export class WtPanel extends WtCard {
  @property() accessor icon: IconName = 'info'
  /** Position in the setup order; omitted for sections that are not a step. */
  @property({ type: Number }) accessor step: number | undefined = undefined
  @property() accessor heading = ''
  @property() accessor description: string | undefined = undefined
  /** The body of an element that is a panel; a consumer gives children instead. */
  @property({ attribute: false }) accessor content: Content = nothing

  protected override willUpdate(): void {
    super.willUpdate()
    this.hostClasses({ panel: true })
  }

  protected override render(): TemplateResult {
    return html`
      <div class="panel-head">
        <span class="panel-step"><wt-icon name=${this.icon} size=${IconSize.Md}></wt-icon></span>
        <h2>${this.heading}</h2>
        ${this.step !== undefined ? html`<span class="panel-index">${this.step}</span>` : nothing}
      </div>
      ${this.description ? html`<p>${this.description}</p>` : nothing} ${this.content}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-panel': WtPanel
  }
}
