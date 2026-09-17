import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { TrendSeries } from '../../../../shared/charHistory'
import { signed, whole } from '../../model/format'
import { WtDetailPanel } from './DetailPanel'
import '../ui/DashPanel'
import type { FigureTone } from '../Sparkline'
import { Tint } from '../../enums/tint'
import { FormatKind } from '../../enums/formatKind'
import '../StepChart'
import '../ui/Format'
import '../ui/Trend'
import '../ui/PanelEmpty'

/** Two panels share a row, so each chart gets less height than the gold view's one. */
const CHART_HEIGHT = 160

/**
 * One of the two headline figures with its whole recorded history under it.
 *
 * The card shows the last month as a sparkline; here there is room for the
 * axis, the dates and every reading there is, so "up 12" becomes "up 12 since
 * the season started, most of it in the first week". The panel's `icon` and
 * `heading` come from the caller; the heading also names the chart.
 */
@customElement('wt-detail-figure')
export class WtDetailFigure extends WtDetailPanel {
  @property({ type: Number }) accessor value: number | null = null
  @property({ attribute: false }) accessor series: TrendSeries | null = null
  @property() accessor tone: FigureTone = Tint.Accent

  protected override willUpdate(): void {
    const tr = this.tr
    const { series, heading } = this
    const change = series ? Math.round(series.change) : 0
    this.content = html`<div class="detail-figure">
        <wt-format kind=${FormatKind.Whole} .value=${this.value} class="detail-figure-value"></wt-format>
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
              .format=${(v: number) => whole(tr, v)}
              label=${`${heading}: ${whole(tr, series.samples[0]!.value)} → ${whole(tr, series.samples[series.samples.length - 1]!.value)}`}
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
