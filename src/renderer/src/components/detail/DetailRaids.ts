import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import type { RaidProgress } from '../../../../shared/types'
import { difficultyLabel } from '../../../../shared/i18n'
import { raidCellTip, raidRows } from './model'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import '../ui/DashPanel'
import '../Icon'
import '../ui/PanelEmpty'
import '../ui/PanelFoot'
import '../ui/Row'
import '../ui/Cell'
import { IconSize } from '../../enums/iconSize'

/**
 * The season's raids, one row each, a cell for each difficulty: how many
 * bosses are down on it. The cell's tooltip lists every boss with its kills
 * or as open. A cleared difficulty is marked; a raid nobody has entered
 * stays quiet.
 */
@customElement('wt-detail-raids')
export class WtDetailRaids extends WtDetailPanel {
  @property({ attribute: false }) accessor raids: RaidProgress[] = []

  protected override willUpdate(): void {
    const tr = this.tr
    const rows = raidRows(this.raids)
    this.icon = 'raid'
    this.heading = tr.t('detail.raids.title')
    this.content =
      rows.length === 0
        ? html`<wt-panel-empty to-sources text=${tr.t('detail.raids.empty')}></wt-panel-empty>`
        : html`<wt-table
              kind=${TableKind.Detail}
              .columns=${[
                { label: tr.t('detail.col.raid') },
                ...rows[0]!.cells.map((cell) => ({ label: difficultyLabel(tr, cell.difficultyId, '', true), num: true }))
              ]}
            >
              ${rows.map(
                (row) =>
                  html`<wt-row>
                    <wt-cell><wt-icon name="raid" size=${IconSize.Xs} class="detail-row-icon"></wt-icon>${row.raid.name}</wt-cell>
                    ${row.cells.map(
                      (cell) =>
                        html`<wt-cell
                          class=${classMap({ num: true, 'ok-text': cell.killed === cell.total && cell.total > 0, faint: cell.killed === 0 })}
                          .listTip=${cell.total > 0 ? raidCellTip(tr, cell) : null}
                          >${cell.killed}/${cell.total}</wt-cell
                        >`
                    )}
                  </wt-row>`
              )}
            </wt-table>
            <wt-panel-foot .text=${tr.t('detail.raids.hint')}></wt-panel-foot>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-raids': WtDetailRaids
  }
}
