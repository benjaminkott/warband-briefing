import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { DungeonBest, SeasonDungeon } from '../../../../shared/types'
import { runName, whole } from '../../model/format'
import { bestRows } from './model'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import { FormatKind } from '../../enums/formatKind'
import './RunResult'
import '../ui/Format'
import '../ui/DashPanel'
import '../ui/PanelEmpty'
import '../ui/PanelFoot'
import '../ui/Row'
import '../ui/Cell'

/**
 * The season's best per dungeon, the way the rating is built: one row per
 * dungeon, the sum at the foot. A dungeon of the season never run is a row
 * without a run. The key to run is marked - a dungeon never run first, else
 * the lowest key: that is where the score has the most room.
 */
@customElement('wt-detail-bests')
export class WtDetailBests extends WtDetailPanel {
  @property({ attribute: false }) accessor bests: DungeonBest[] = []
  /** The season's dungeons; a dungeon not in the bests is one never run. */
  @property({ attribute: false }) accessor dungeons: SeasonDungeon[] = []

  protected override willUpdate(): void {
    const tr = this.tr
    const { rows, total, weakest } = bestRows(this.bests, this.dungeons)
    this.icon = 'dungeon'
    this.heading = tr.t('detail.bests.title')
    this.aside = this.bests.length > 0 ? tr.t('run.score', { score: whole(tr, total) }) : undefined
    this.content = html`${
      this.bests.length === 0
        ? html`<wt-panel-empty to-sources text=${tr.t('detail.bests.empty')}></wt-panel-empty>`
        : html`<wt-table
            kind=${TableKind.Detail}
            .columns=${[
              { label: tr.t('detail.col.dungeon') },
              { label: tr.t('detail.col.key'), num: true },
              { label: tr.t('detail.col.result') },
              { label: tr.t('detail.col.time'), num: true },
              { label: tr.t('detail.col.score'), num: true }
            ]}
          >
            ${rows.map(
              ({ dungeon, best }) =>
                html`<wt-row
                  class=${weakest?.dungeon === dungeon ? 'detail-weakest' : nothing}
                  data-tip=${weakest?.dungeon === dungeon ? tr.t(best ? 'detail.bests.weakest' : 'detail.bests.unrun') : nothing}
                >
                  <wt-cell>${runName(tr, { dungeon: dungeon.name, mapChallengeModeId: dungeon.mapChallengeModeId })}</wt-cell>
                  <wt-cell class="num">${best ? `+${best.level}` : '—'}</wt-cell>
                  <wt-cell
                    >${best ? html`<wt-run-result ?timed=${best.inTime}></wt-run-result>` : html`<span class="faint">${tr.t('dash.matrix.missing')}</span>`}</wt-cell
                  >
                  <wt-cell class="num"><wt-format kind=${FormatKind.Duration} .value=${best?.durationSec}></wt-format></wt-cell>
                  <wt-cell class="num"><wt-format kind=${FormatKind.Whole} .value=${best?.score}></wt-format></wt-cell>
                </wt-row>`
            )}
          </wt-table>`
    }
    ${this.bests.length > 0 ? html`<wt-panel-foot .text=${tr.t('detail.bests.hint')}></wt-panel-foot>` : nothing}`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-bests': WtDetailBests
  }
}
