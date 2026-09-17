import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { MythicRun } from '../../../../shared/types'
import { runName } from '../../model/format'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import { FormatKind } from '../../enums/formatKind'
import './RunResult'
import '../ui/Format'
import '../ui/DashPanel'
import '../ui/PanelEmpty'
import '../ui/Row'
import '../ui/Cell'

/** Every keystone run of the week, in full - the card only has room for chips. */
@customElement('wt-detail-runs')
export class WtDetailRuns extends WtDetailPanel {
  @property({ attribute: false }) accessor runs: MythicRun[] = []

  protected override willUpdate(): void {
    const tr = this.tr
    const runs = this.runs
    this.icon = 'keystone'
    this.heading = tr.t('card.mythicThisWeek')
    this.aside = runs.length || undefined
    this.content =
      runs.length === 0
        ? html`<wt-panel-empty text=${tr.t('card.noMythicRuns')}></wt-panel-empty>`
        : html`<wt-table
            kind=${TableKind.Detail}
            .columns=${[
              { label: tr.t('detail.col.dungeon') },
              { label: tr.t('detail.col.key'), num: true },
              { label: tr.t('detail.col.result') },
              { label: tr.t('detail.col.time'), num: true },
              { label: tr.t('detail.col.score'), num: true },
              { label: tr.t('detail.col.when') }
            ]}
          >
            ${runs.map(
              (run) =>
                html`<wt-row>
                  <wt-cell>${runName(tr, run)}</wt-cell>
                  <wt-cell class="num">+${run.level}</wt-cell>
                  <wt-cell><wt-run-result ?timed=${run.completed}></wt-run-result></wt-cell>
                  <wt-cell class="num"><wt-format kind=${FormatKind.Duration} .value=${run.durationSec}></wt-format></wt-cell>
                  <wt-cell class="num"><wt-format kind=${FormatKind.Whole} .value=${run.score}></wt-format></wt-cell>
                  <wt-cell class="muted"><wt-format kind=${FormatKind.When} .value=${run.completedAt}></wt-format></wt-cell>
                </wt-row>`
            )}
          </wt-table>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-runs': WtDetailRuns
  }
}
