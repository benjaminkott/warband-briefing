import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { hasContent, WtElement, type Content } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import { refreshWowheadLinks, wowheadTooltipsEnabled } from '../../wowheadTooltips'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * A link to a page outside the app. The app never loads a page itself: the
 * click goes to the system browser through the shell, and the tooltip
 * names the site and shows the address, so a player knows where a click
 * leads before it leads there.
 *
 * The host is `display: contents`: a custom element cannot be an `<a>`, so
 * the real one sits inside. The place gives the host its class - `ext-link`
 * for the quiet id of a settings row, `brand-link` for the tile of a
 * character's sites - and the stylesheet reaches the link as `> a`. A custom
 * property on the host reaches the link through inheritance.
 */
@customElement('wt-ext-link')
export class WtExtLink extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Contents
  @property() accessor href = ''
  /** The site the tooltip names: "Open on Wowhead". */
  @property() accessor site = ''
  /** Plain text as an attribute, or a template as a property. */
  @property() accessor label: Content = nothing
  /** The mark after the label that says the link leaves the app. */
  @property({ type: Boolean }) accessor mark = false
  /** No tip of its own: the parent's tip says where the click leads (the note of an item's game tip). */
  @property({ type: Boolean }) accessor quiet = false
  /** What Wowhead's tooltip needs of an item (`item=…&bonus=…`); the script reads it off the link. */
  @property() accessor wowhead: string | null = null

  /** Whether Wowhead's script must leave this link alone: its tooltip is off, or the link is not an item's. */
  protected get wowheadOff(): boolean {
    return !this.wowhead || !wowheadTooltipsEnabled()
  }

  protected override updated(): void {
    // A link drawn anew is one the script has not seen.
    if (this.wowhead) refreshWowheadLinks()
  }

  protected onClick(event: Event): void {
    // Not the renderer's window: the page opens beside the app.
    event.preventDefault()
    void window.briefing.shell.openExternal(this.href)
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    // A link that is only its site's image has no words of its own; the
    // name a reader hears is the tooltip's first line.
    const name = tr.t('card.openOn', { site: this.site })
    return html`<a
      href=${this.href}
      aria-label=${typeof this.label === 'string' && this.label ? nothing : name}
      data-wowhead=${this.wowhead ?? nothing}
      data-disable-wowhead-tooltip=${this.wowheadOff ? 'true' : nothing}
      data-tip=${this.quiet || !this.wowheadOff ? nothing : `${name}\n${this.href}`}
      @click=${this.onClick}
      >${hasContent(this.label) ? this.label : nothing}${this.mark ? html`<wt-icon name="external" size=${IconSize.Xs}></wt-icon>` : nothing}</a
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-ext-link': WtExtLink
  }
}
