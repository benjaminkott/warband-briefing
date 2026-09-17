import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { hasContent, type Content } from '../../element'
import { WtCard } from './Card'
import type { IconName } from '../Icon'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * A compact panel: one box, one caption line, the same on the dashboard and
 * the character page - so the captions sit at the same place down the page
 * whatever a panel holds.
 *
 * Three things can ride on the caption line: a note right after the title in
 * quieter type, a mark whose tooltip says how to read the panel, and an aside
 * - a count or a total - pushed to the far end.
 *
 * The body is the panel's children, as with every card. An element that is a
 * panel works its body out in `willUpdate` and fills `content` in instead.
 */
@customElement('wt-dash-panel')
export class WtDashPanel extends WtCard {
  @property() accessor icon: IconName = 'info'
  @property() accessor heading = ''
  @property() accessor note: string | undefined = undefined
  @property() accessor hint: string | undefined = undefined
  /** Plain text as an attribute, or a template as a property. */
  @property() accessor aside: Content = nothing
  /** The body of an element that is a panel; a consumer gives children instead. */
  @property({ attribute: false }) accessor content: Content = nothing

  protected override willUpdate(): void {
    // Grid placement and the like come from the parent's class; the panel's
    // own classes are always there.
    super.willUpdate()
    this.hostClasses({ panel: true, 'dash-panel': true })
  }

  protected override render(): TemplateResult {
    return html`
      <div class="dash-head">
        <wt-icon name=${this.icon} size=${IconSize.Sm}></wt-icon>
        <h2>${this.heading}</h2>
        ${this.note ? html`<span class="dash-head-note">${this.note}</span>` : nothing}
        ${this.hint ? html`<wt-icon name="info" size=${IconSize.Sm} class="dash-head-hint" label=${this.hint}></wt-icon>` : nothing}
        ${hasContent(this.aside) ? html`<span class="dash-head-aside">${this.aside}</span>` : nothing}
      </div>
      ${this.content}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-dash-panel': WtDashPanel
  }
}
