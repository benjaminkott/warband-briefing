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

/** One of several lines on one chart: its name for the legend and the tip, its colour, its readings. */
export interface StepLine {
  key: string
  label: string
  /** A CSS colour; without one the line takes the chart's tone. */
  color?: string
  series: SparkSeries
}

/** A date on the axis, as short as the range allows: a week is hours, a season is days, a year is months. */
export function timeLabel(tr: Translator, at: number, span: number): string {
  if (span <= 2 * DAY_MS) return tr.formatDateTime(at, { hour: '2-digit', minute: '2-digit' })
  if (span <= 120 * DAY_MS) return tr.formatDateTime(at, { day: '2-digit', month: '2-digit' })
  return tr.formatDateTime(at, { month: 'short', year: '2-digit' })
}

/** The reading in force at a moment: the last one at or before it, none before the first. */
function valueAt(series: SparkSeries, at: number): number | null {
  let value: number | null = null
  for (const sample of series.samples) {
    if (sample.at > at) break
    value = sample.value
  }
  return value
}

/**
 * One figure over time as stepped lines.
 *
 * One series is the usual case: the line carries the amount, the axis the
 * scale, the crosshair answers "how much was it on that day". Points are only
 * drawn when there are few enough of them to be points rather than a smear.
 * Gold was the first thing it drew; item level and rating on the character
 * page step the same way, in their own colour.
 *
 * Several `lines` share the one axis: one for each character, each in its
 * own colour, told apart by the legend under the plot and by the tip, which
 * lists every line's amount at the cursor. The fill and the dots go, or the
 * lines would hide each other.
 */
@customElement('wt-step-chart')
export class WtStepChart extends WtElement {
  @property({ attribute: false }) accessor series: SparkSeries | null = null
  /** Several series on one axis; set in place of `series`. */
  @property({ attribute: false }) accessor lines: StepLine[] | null = null
  @property() accessor tone: SparkTone = Tint.Gold
  /** Short form for the axis ticks - "1,23 Mio." rather than every digit. */
  @property({ attribute: false }) accessor format: (value: number) => string = (value) => String(value)
  /** What the picture says, for a reader who cannot see it. */
  @property() accessor label = ''
  /** The box in pixels; the plot is what the axis labels leave of it. */
  @property({ type: Number }) accessor height = HEIGHT

  /** The chart is as wide as the panel; a fixed viewBox would blur the strokes. */
  @state() accessor width = 760
  /** The moment under the cursor, snapped to a reading. */
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

  /** What is drawn: the lines given, or the one series as the one line. */
  private get drawn(): StepLine[] {
    if (this.lines) return this.lines
    return this.series ? [{ key: 'series', label: this.label, series: this.series }] : []
  }

  protected override render(): TemplateResult | typeof nothing {
    const tr = this.tr
    const lines = this.drawn
    if (lines.length === 0) return nothing
    const single = lines.length === 1 ? lines[0]!.series : null
    const width = this.width
    const height = this.height
    const tone = this.tone
    const format = this.format

    const from = Math.min(...lines.map((line) => line.series.from))
    const to = Math.max(...lines.map((line) => line.series.to))
    const min = Math.min(...lines.map((line) => line.series.min))
    const max = Math.max(...lines.map((line) => line.series.max))

    const plotW = Math.max(120, width - PAD.left - PAD.right)
    const plotH = height - PAD.top - PAD.bottom
    const span = Math.max(1, to - from)
    const { lo, hi, ticks } = niceTicks(min, max)

    const x = (at: number): number => PAD.left + ((at - from) / span) * plotW
    const y = (value: number): number => PAD.top + (1 - (value - lo) / Math.max(1, hi - lo)) * plotH

    // The amount holds until the next reading, so the line steps rather than
    // sloping: a gradual rise between two readings never happened.
    const pathOf = (series: SparkSeries): string =>
      series.samples
        .map((sample, index) => {
          const px = x(sample.at)
          const py = y(sample.value)
          if (index === 0) return `M${px} ${py}`
          return `H${px}V${py}`
        })
        .join('')

    const timeTicks = [0, 1, 2, 3].map((step) => from + (span / 3) * step)

    // The moments the cursor can rest on: every reading of every line.
    const moments = [...new Set(lines.flatMap((line) => line.series.samples.map((sample) => sample.at)))].sort((a, b) => a - b)
    const pick = (event: PointerEvent): void => {
      const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
      const at = from + ((event.clientX - box.left - PAD.left) / plotW) * span
      let best = moments[0]!
      for (const moment of moments) if (Math.abs(moment - at) < Math.abs(best - at)) best = moment
      this.hover = best
    }

    const active = this.hover
    // What each line stood at under the cursor, the highest first: the order
    // the eye meets them on the plot.
    const readings =
      active === null
        ? []
        : lines
            .map((line) => ({ line, value: valueAt(line.series, active) }))
            .filter((entry): entry is { line: StepLine; value: number } => entry.value !== null)
            .sort((a, b) => b.value - a.value)

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

        ${single ? svg`<path class="chart-area" d=${`${pathOf(single)}V${PAD.top + plotH}H${x(single.from)}Z`} fill=${`url(#${gradient})`} />` : nothing}
        ${lines.map((line) => svg`<path class="chart-line" style=${styleMap({ stroke: line.color ?? '' })} d=${pathOf(line.series)} />`)}

        <!-- Individual readings are worth marking only while they are countable. -->
        ${
          single && single.samples.length <= 24
            ? single.samples.map((sample) => svg`<circle class="chart-dot" cx=${x(sample.at)} cy=${y(sample.value)} r="3.5" />`)
            : nothing
        }
        ${
          active !== null
            ? svg`<g class="chart-cursor">
              <line x1=${x(active)} x2=${x(active)} y1=${PAD.top} y2=${PAD.top + plotH} />
              ${readings.map(({ line, value }) => svg`<circle style=${styleMap({ fill: line.color ?? '' })} cx=${x(active)} cy=${y(value)} r="5" />`)}
            </g>`
            : nothing
        }
      </svg>

      ${
        active !== null && readings.length > 0
          ? html`<wt-tip
              style=${styleMap({
                // Clamped to the box, so a reading at either end stays readable.
                left: `${Math.min(Math.max(x(active), PAD.left + 60), PAD.left + plotW - 60)}px`,
                top: `${PAD.top}px`
              })}
            >
              ${
                single
                  ? html`<div class="chart-tip-value"><wt-format .value=${readings[0]!.value}></wt-format></div>`
                  : readings.map(
                      ({ line, value }) => html`<div class="chart-tip-row">
                        <span class="chart-swatch" style=${styleMap({ background: line.color ?? '' })}></span>
                        <span>${line.label}</span>
                        <wt-format class="chart-tip-figure" .value=${value}></wt-format>
                      </div>`
                    )
              }
              <div class="chart-tip-time"><wt-format kind=${FormatKind.Datetime} .value=${active}></wt-format></div>
            </wt-tip>`
          : nothing
      }
      ${
        single
          ? nothing
          : html`<div class="chart-legend">
              ${lines.map(
                (line) => html`<span class="chart-legend-item">
                  <span class="chart-swatch" style=${styleMap({ background: line.color ?? '' })}></span>${line.label}
                </span>`
              )}
            </div>`
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-step-chart': WtStepChart
  }
}
