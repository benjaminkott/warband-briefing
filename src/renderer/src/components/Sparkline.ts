import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { HostDisplay } from '../enums/hostDisplay'
import { Tint, TINT_VAR } from '../enums/tint'

const VIEW_W = 300
const VIEW_H = 64
/** Half a stroke, so the line at the very top or bottom is not clipped. */
const PAD = 3

/** What a sparkline needs of a series: the readings and the range they span. */
export interface SparkSeries {
  samples: Array<{ at: number; value: number }>
  from: number
  to: number
  min: number
  max: number
}

/** The line's colour, named by what it draws rather than by a hex value. */
export type SparkTone = Exclude<Tint, Tint.Quiet>

export const SPARK_TONES: readonly SparkTone[] = [Tint.Gold, Tint.Accent, Tint.Key]

/** The tones a figure with a trend takes: gold has its own element. */
export type FigureTone = Exclude<SparkTone, Tint.Gold>

/**
 * A line small enough to sit in a tile.
 *
 * The same stepped shape the gold chart draws - the amount holds until the next
 * reading, so a slope between two of them would be a rise that never happened -
 * but without axis, ticks or dots: at this size those are texture, not
 * information, and the figure beside it carries the actual number. Gold was
 * the first thing it drew; item level and rating step the same way.
 *
 * The box is stretched to whatever width it is given, which would stretch the
 * stroke with it; `vector-effect` keeps the line one weight regardless. The
 * host wraps the svg without a box of its own, so the svg is what the tile
 * lays out; a class given to the host lands on the svg.
 */
@customElement('wt-sparkline')
export class WtSparkline extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Contents
  @property({ attribute: false }) accessor series: SparkSeries | null = null
  @property() accessor tone: SparkTone = Tint.Gold

  protected override render(): TemplateResult | typeof nothing {
    const series = this.series
    if (!series || series.samples.length < 2) return nothing

    const span = Math.max(1, series.to - series.from)
    const lo = series.min
    const hi = series.max
    const range = Math.max(1, hi - lo)
    const color = TINT_VAR[this.tone]

    const x = (at: number): number => ((at - series.from) / span) * VIEW_W
    const y = (value: number): number => PAD + (1 - (value - lo) / range) * (VIEW_H - 2 * PAD)

    const path = series.samples
      .map((sample, index) => (index === 0 ? `M${x(sample.at)} ${y(sample.value)}` : `H${x(sample.at)}V${y(sample.value)}`))
      .join('')
    // The line runs to the right edge: the last reading is still what holds now.
    const tail = `H${x(series.to)}`
    // One gradient per tone, or two sparklines on a page would share a colour.
    const gradient = `spark-fade-${this.tone}`

    return html`<svg class="sparkline" viewBox=${`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" role="presentation">
      <defs>
        <linearGradient id=${gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color=${color} stop-opacity="0.28" />
          <stop offset="100%" stop-color=${color} stop-opacity="0" />
        </linearGradient>
      </defs>
      <path class="sparkline-area" d=${`${path}${tail}V${VIEW_H}H${x(series.samples[0]!.at)}Z`} fill=${`url(#${gradient})`} />
      <path class="sparkline-line" d=${`${path}${tail}`} stroke=${color} vector-effect="non-scaling-stroke" />
    </svg>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-sparkline': WtSparkline
  }
}
