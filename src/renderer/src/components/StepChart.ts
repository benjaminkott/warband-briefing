import { html, nothing, svg, type TemplateResult } from 'lit'
import { DAY_MS } from '../../../shared/time'
import { customElement, property, state } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { Translator } from '../../../shared/i18n'
import { niceTicks } from '../model/gold'
import { WtElement } from '../element'
import type { SparkSeries, SparkTone } from './Sparkline'
import { TINT_VAR, Tint } from '../enums/tint'
import { FormatKind } from '../enums/formatKind'
import './ui/Format'
import './ui/Tip'

/** The gold view's height; a chart in a narrower box asks for less. */
const HEIGHT = 260
/** Room for the axis labels; the plot is what is left of the box. */
const PAD = { top: 16, right: 18, bottom: 26, left: 68 }

/** A date on the axis, as short as the range allows: a week is hours, a season is days, a year is months. */
export function timeLabel(tr: Translator, at: number, span: number): string {
  if (span <= 2 * DAY_MS) return tr.formatDateTime(at, { hour: '2-digit', minute: '2-digit' })
  if (span <= 120 * DAY_MS) return tr.formatDateTime(at, { day: '2-digit', month: '2-digit' })
  return tr.formatDateTime(at, { month: 'short', year: '2-digit' })
}

/**
 * One figure over time as a single stepped line.
 *
 * One series, so there is nothing to tell apart by colour: the line carries the
 * amount, the axis carries the scale and the crosshair answers "how much was it
 * on that day". Points are only drawn when there are few enough of them to be
 * points rather than a smear. Gold was the first thing it drew; item level and
 * rating on the character page step the same way, in their own colour.
 */
@customElement('wt-step-chart')
export class WtStepChart extends WtElement {
  @property({ attribute: false }) accessor series!: SparkSeries
  @property() accessor tone: SparkTone = Tint.Gold
  /** Short form for the axis ticks - "1,23 Mio." rather than every digit. */
  @property({ attribute: false }) accessor format: (value: number) => string = (value) => String(value)
  /** What the picture says, for a reader who cannot see it. */
  @property() accessor label = ''
  /** The box in pixels; the plot is what the axis labels leave of it. */
  @property({ type: Number }) accessor height = HEIGHT

  /** The chart is as wide as the panel; a fixed viewBox would blur the strokes. */
  @state() accessor width = 760
  @state() accessor hover: number | null = null

  private observer: ResizeObserver | null = null

  override connectedCallback(): void {
    super.connectedCallback()
    this.observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0
      if (measured > 0) this.width = measured
    })
    this.observer.observe(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.observer?.disconnect()
    this.observer = null
  }

  protected override willUpdate(): void {
    this.hostClasses({ 'step-chart': true })
    this.hostVar('--chart-color', TINT_VAR[this.tone])
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const series = this.series
    const width = this.width
    const height = this.height
    const tone = this.tone
    const format = this.format

    const plotW = Math.max(120, width - PAD.left - PAD.right)
    const plotH = height - PAD.top - PAD.bottom
    const span = Math.max(1, series.to - series.from)
    const { lo, hi, ticks } = niceTicks(series.min, series.max)

    const x = (at: number): number => PAD.left + ((at - series.from) / span) * plotW
    const y = (value: number): number => PAD.top + (1 - (value - lo) / Math.max(1, hi - lo)) * plotH

    // The amount holds until the next reading, so the line steps rather than
    // sloping: a gradual rise between two readings never happened.
    const path = series.samples
      .map((sample, index) => {
        const px = x(sample.at)
        const py = y(sample.value)
        if (index === 0) return `M${px} ${py}`
        return `H${px}V${py}`
      })
      .join('')
    const area = `${path}V${PAD.top + plotH}H${x(series.from)}Z`

    const timeTicks = [0, 1, 2, 3].map((step) => series.from + (span / 3) * step)
    const active = this.hover === null ? null : series.samples[this.hover]

    const pick = (event: PointerEvent): void => {
      const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
      const at = series.from + ((event.clientX - box.left - PAD.left) / plotW) * span
      let best = 0
      for (let i = 1; i < series.samples.length; i++) {
        const sample = series.samples[i]!
        if (Math.abs(sample.at - at) < Math.abs(series.samples[best]!.at - at)) best = i
      }
      this.hover = best
    }

    // One gradient per tone, or two charts on a page would share a colour.
    const gradient = `step-fade-${tone}`

    return html`
      <svg
        width=${width}
        height=${height}
        role="img"
        aria-label=${this.label}
        @pointermove=${pick}
        @pointerleave=${() => (this.hover = null)}
      >
        <defs>
          <linearGradient id=${gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color=${TINT_VAR[tone]} stop-opacity="0.22" />
            <stop offset="100%" stop-color=${TINT_VAR[tone]} stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Grid and axis stay behind the data and out of its way. -->
        ${ticks.map(
          (tick) => svg`<g>
            <line class="chart-grid" x1=${PAD.left} x2=${PAD.left + plotW} y1=${y(tick)} y2=${y(tick)} />
            <text class="chart-tick" x=${PAD.left - 10} y=${y(tick) + 4} text-anchor="end">${format(tick)}</text>
          </g>`
        )}
        ${timeTicks.map(
          (at, index) => svg`<text
            class="chart-tick"
            x=${x(at)}
            y=${height - 8}
            text-anchor=${index === 0 ? 'start' : index === timeTicks.length - 1 ? 'end' : 'middle'}
          >${timeLabel(tr, at, span)}</text>`
        )}

        <path class="chart-area" d=${area} fill=${`url(#${gradient})`} />
        <path class="chart-line" d=${path} />

        <!-- Individual readings are worth marking only while they are countable. -->
        ${
          series.samples.length <= 24
            ? series.samples.map((sample) => svg`<circle class="chart-dot" cx=${x(sample.at)} cy=${y(sample.value)} r="3.5" />`)
            : nothing
        }
        ${
          active
            ? svg`<g class="chart-cursor">
              <line x1=${x(active.at)} x2=${x(active.at)} y1=${PAD.top} y2=${PAD.top + plotH} />
              <circle cx=${x(active.at)} cy=${y(active.value)} r="5" />
            </g>`
            : nothing
        }
      </svg>

      ${
        active
          ? html`<wt-tip
              style=${styleMap({
                // Clamped to the box, so a reading at either end stays readable.
                left: `${Math.min(Math.max(x(active.at), PAD.left + 60), PAD.left + plotW - 60)}px`,
                top: `${PAD.top}px`
              })}
            >
              <div class="chart-tip-value"><wt-format .value=${active.value}></wt-format></div>
              <div class="chart-tip-time"><wt-format kind=${FormatKind.Datetime} .value=${active.at}></wt-format></div>
            </wt-tip>`
          : nothing
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-step-chart': WtStepChart
  }
}
