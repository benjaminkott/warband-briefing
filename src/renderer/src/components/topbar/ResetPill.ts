import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * The time to the weekly reset, as the one figure on the bar that is not a
 * button: a calendar mark, the word, the figure in strong type - and, after
 * it, the evenings that are left, the figure a player with an evening a
 * day counts in; the bar shows them only at its widest, the tooltip always.
 * Its sunken fill says it is something to read, not to press.
 */
@customElement('wt-reset-pill')
export class WtResetPill extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  /** "2d 14h", already formatted; empty while there is no season to count to. */
  @property() accessor until = ''
  /** The evenings before the reset; none while there is nothing to count to. */
  @property({ type: Number }) accessor evenings = 0

  protected override willUpdate(): void {
    this.hostClasses({ 'reset-pill': true })
    // The evenings ride in the tooltip too: on most windows the bar has no room for them.
    this.hostTip(
      this.evenings > 0
        ? `${this.tr.t('topbar.resetHint')} · ${this.tr.plural('reset.evenings', this.evenings)}`
        : this.tr.t('topbar.resetHint')
    )
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    return html`<wt-icon name="calendar" size=${IconSize.Sm}></wt-icon>
      <span class="reset-label">${tr.t('topbar.resetIn')}</span>
      <strong>${this.until || '—'}</strong>
      ${this.until && this.evenings > 0 ? html`<span class="reset-evenings">· ${tr.plural('reset.evenings', this.evenings)}</span>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-reset-pill': WtResetPill
  }
}
