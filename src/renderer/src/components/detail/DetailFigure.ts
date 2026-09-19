import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { TrendSeries } from '../../../../shared/charHistory'
import { signed, whole } from '../../model/format'
import { formatGoldShort } from '../../model/gold'
import { WtDetailPanel } from './DetailPanel'
import '../ui/DashPanel'
import type { SparkTone } from '../Sparkline'
import { Tint } from '../../enums/tint'
import { FormatKind } from '../../enums/formatKind'
import '../StepChart'
import '../ui/Format'
import '../ui/Trend'
import '../ui/PanelEmpty'

/** Panels share a row, so each chart gets less height than the gold view's one. */
const CHART_HEIGHT = 160

/** What the figure is: a whole number, or a sum of copper shown as gold. */
export type FigureKind = FormatKind.Whole | FormatKind.Gold

/**
 * One of the headline figures with its whole recorded history under it.
 *
 * The card shows the last month as a sparkline; here there is room for the
 * axis, the dates and every reading there is, so "up 12" becomes "up 12 since
 * the season started, most of it in the first week". The panel's `icon` and
 * `heading` come from the caller; the heading also names the chart. A gold
 * figure is copper, as the snapshot holds it; its series is already in gold.
 */
@customElement('wt-detail-figure')
export class WtDetailFigure extends WtDetailPanel {
  @property({ type: Number }) accessor value: number | null = null
  @property({ attribute: false }) accessor series: TrendSeries | null = null
  @property() accessor tone: SparkTone = Tint.Accent
  @property() accessor kind: FigureKind = FormatKind.Whole

  protected override willUpdate(): void {
    const tr = this.tr
    const { series, heading, kind } = this
    const change = series ? Math.round(series.change) : 0
    const short = (value: number): string => (kind === FormatKind.Gold ? formatGoldShort(tr, value) : whole(tr, value))
    this.content = html`<div class="detail-figure">
        <wt-format kind=${kind} .value=${this.value} class="detail-figure-value"></wt-format>
        ${
          series
            ? html`<wt-trend class="detail-figure-delta" .change=${change}>
                ${tr.t('detail.since', {
                  change: signed(tr, change),
                  since: tr.formatDateTime(series.from, { dateStyle: 'medium' })
                })}
              </wt-trend>`
            : nothing
        }
      </div>
      ${
        series
          ? html`<wt-step-chart
              .series=${series}
              tone=${this.tone}
              height=${CHART_HEIGHT}
              .format=${short}
              label=${`${heading}: ${short(series.samples[0]!.value)} → ${short(series.samples[series.samples.length - 1]!.value)}`}
            ></wt-step-chart>`
          : html`<wt-panel-empty text=${tr.t('detail.noHistory')}></wt-panel-empty>`
      }`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-figure': WtDetailFigure
  }
}
