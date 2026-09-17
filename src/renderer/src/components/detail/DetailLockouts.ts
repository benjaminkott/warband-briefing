import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { InstanceLockout } from '../../../../shared/types'
import { difficultyLabel } from '../../../../shared/i18n'
import { lockoutRows } from './model'
import { WtDetailPanel } from './DetailPanel'
import { TableKind } from '../../enums/tableKind'
import { FormatKind } from '../../enums/formatKind'
import '../ui/DashPanel'
import '../Icon'
import '../ui/Format'
import '../ui/PanelEmpty'
import '../ui/Row'
import '../ui/Cell'
import { IconSize } from '../../enums/iconSize'

/** Raids and dungeons together, with the bosses named where a source knows them. */
@customElement('wt-detail-lockouts')
export class WtDetailLockouts extends WtDetailPanel {
  @property({ attribute: false }) accessor lockouts: InstanceLockout[] = []

  protected override willUpdate(): void {
    const tr = this.tr
    const rows = lockoutRows(this.lockouts)
    this.icon = 'raid'
    this.heading = tr.t('detail.lockouts.title')
    this.aside = rows.length || undefined
    this.content =
      rows.length === 0
        ? html`<wt-panel-empty text=${tr.t('detail.lockouts.empty')}></wt-panel-empty>`
        : html`<wt-table
            kind=${TableKind.Detail}
            .columns=${[
              { label: tr.t('detail.col.instance') },
              { label: tr.t('detail.col.difficulty') },
              { label: tr.t('detail.col.progress'), num: true },
              { label: tr.t('detail.col.bosses') },
              { label: tr.t('detail.col.reset') }
            ]}
          >
            ${rows.map(
              (lock) =>
                html`<wt-row>
                  <wt-cell
                    ><wt-icon name=${lock.isRaid ? 'raid' : 'dungeon'} size=${IconSize.Xs} class="detail-row-icon"></wt-icon
                    >${lock.name}</wt-cell
                  >
                  <wt-cell class="muted">
                    ${difficultyLabel(tr, lock.difficultyId, lock.difficulty)}${
                      lock.maxPlayers ? ` · ${tr.t('lockout.players', { count: lock.maxPlayers })}` : ''
                    }
                  </wt-cell>
                  <wt-cell class="num">${lock.total > 0 ? `${lock.defeated}/${lock.total}` : lock.defeated}</wt-cell>
                  <wt-cell class="detail-wrap">
                    ${
                      lock.bosses.length > 0
                        ? lock.bosses.join(', ')
                        : html`<span class="faint"
                            >${lock.defeated > 0 ? tr.plural('lockout.defeatedCount', lock.defeated) : tr.t('lockout.noBoss')}</span
                          >`
                    }
                  </wt-cell>
                  <wt-cell class="muted"><wt-format kind=${FormatKind.Until} .value=${lock.resetsAt}></wt-format></wt-cell>
                </wt-row>`
            )}
          </wt-table>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-lockouts': WtDetailLockouts
  }
}
