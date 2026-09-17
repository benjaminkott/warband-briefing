import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { TrendSeries } from '../../../../shared/charHistory'
import { WtElement, type Content } from '../../element'
import type { FigureTone } from '../Sparkline'
import { FormatKind } from '../../enums/formatKind'
import '../Sparkline'
import '../ui/Format'
import '../ui/Trend'

/**
 * One headline figure in the head band: the number, its trend over the last
 * days as an arrow beside it and a sparkline after the unit. A number is
 * formatted by the figure itself, in its `kind`; a template - a rated
 * score, a keystone - is drawn as it is, and `null` is the dash. A
 * `data-tip` on the host is the tooltip.
 */
@customElement('wt-card-figure')
export class WtCardFigure extends WtElement {
  @property({ attribute: false }) accessor value: number | Content = null
  /** How a number reads; a figure is whole by default. */
  @property() accessor kind: FormatKind = FormatKind.Whole
  /** The whole the figure is a part of - "/ 9". */
  @property({ type: Number }) accessor of: number | undefined = undefined
  @property() accessor unit = ''
  @property({ attribute: false }) accessor series: TrendSeries | null = null
  @property() accessor tone: FigureTone | undefined = undefined
  /** How many days the trend covers; without it no arrow is drawn. */
  @property({ type: Number }) accessor days: number | undefined = undefined

  protected override willUpdate(): void {
    this.hostClasses({ 'card-figure': true })
  }

  protected override render(): TemplateResult {
    const { value, series, days, tone } = this
    const change = series ? Math.round(series.change) : 0
    const figure = typeof value === 'number' || value === null ? html`<wt-format kind=${this.kind} .value=${value}></wt-format>` : value
    return html`
      <span class="card-figure-value num">
        ${figure}${this.of !== undefined ? html`<span class="card-figure-of">/ <wt-format .value=${this.of}></wt-format></span>` : nothing}
        ${
          series && days !== undefined && change !== 0
            ? html`<wt-trend class="card-figure-trend" .change=${change} .days=${days}></wt-trend>`
            : nothing
        }
      </span>
      <span class="card-figure-unit">
        ${this.unit}${series && tone ? html`<wt-sparkline .series=${series} tone=${tone}></wt-sparkline>` : nothing}
      </span>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-card-figure': WtCardFigure
  }
}
