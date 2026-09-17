import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { signed } from '../../model/format'
import { TrendDirection } from '../../enums/trendDirection'
import '../Icon'
import './Format'
import { IconSize } from '../../enums/iconSize'

/**
 * Which way a figure moved: an arrow and the change, in the trend colours -
 * green up, red down, quiet when flat. The card band, the stat tile and the
 * character page's figure all draw it; the place gives the host its own
 * class for the type size. `days` puts "+12 in 30 days" in the tooltip.
 * The children stand after the arrow in place of the bare change; with
 * `arrow`, the arrow stands alone. The colours are the trend's own
 * stylesheet, keyed on the direction it reflects.
 */
@customElement('wt-trend')
export class WtTrend extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--s0);
    }

    /* Up is green, down is red - but the sign carries it too, for anyone
       who cannot tell the two apart. */
    :host([direction='up']) {
      color: var(--ok);
    }

    :host([direction='down']) {
      color: var(--danger);
    }

    :host([direction='flat']) {
      color: var(--text-dim);
    }
  `

  @property({ type: Number }) accessor change = 0
  @property({ type: Number }) accessor days: number | undefined = undefined
  /** The arrow alone: a table cell is a number first, and the change is in the tooltip. */
  @property({ type: Boolean }) accessor arrow = false
  /** Worked out from the change; reflected for the stylesheet. */
  @property({ reflect: true }) accessor direction: TrendDirection = TrendDirection.Flat

  protected override willUpdate(): void {
    const tr = this.tr
    const change = this.change
    this.direction = change > 0 ? TrendDirection.Up : change < 0 ? TrendDirection.Down : TrendDirection.Flat
    this.hostTip(this.days !== undefined ? tr.t('card.trend', { change: signed(tr, change), days: this.days }) : null)
  }

  protected override render(): TemplateResult {
    const change = this.change
    return html`${change === 0 ? nothing : html`<wt-icon name=${change > 0 ? 'trendUp' : 'trendDown'} size=${IconSize.Xs}></wt-icon>`}${
      this.arrow ? nothing : html`<slot><wt-format .value=${Math.abs(change)}></wt-format></slot>`
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-trend': WtTrend
  }
}
