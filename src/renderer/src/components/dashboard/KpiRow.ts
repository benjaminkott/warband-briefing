import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classColor } from '../../enums/classToken'
import { styleMap } from 'lit/directives/style-map.js'
import type { Goal, GoldSummary } from '../../../../shared/types'
import type { RosterRow, WeekTotals } from '../../model/dashboard'
import { goldTrend, toGold, type GoldSeries } from '../../model/gold'
import { playedParts } from '../../model/overview'
import { eveningsUntil } from '../../../../shared/reset'
import { WtElement } from '../../element'
import { Tint } from '../../enums/tint'
import '../ui/Button'
import '../StatTile'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../../shared/display'

const EMPTY_TOTALS: WeekTotals = { unlocked: 0, slots: 0, done: 0, runs: 0, bosses: 0, keyAvg: null }

/**
 * The week, summed: five figures, nothing smaller than the type scale's small
 * size. The fourth is the reward waiting to be collected while there is one,
 * and the time to the reset otherwise; the fifth is the way into the gold
 * view. `stats` says which of them are drawn - a player who never raids
 * does without the vault.
 *
 * @fires wt-open-gold - The gold figure.
 * @fires wt-open-character - A name in the reward figure, with the character's key.
 */
@customElement('wt-kpi-row')
export class WtKpiRow extends WtElement {
  @property({ attribute: false }) accessor totals: WeekTotals = EMPTY_TOTALS
  /** How many characters the totals describe. */
  @property({ type: Number, attribute: 'active-count' }) accessor activeCount = 0
  @property({ attribute: false }) accessor goals: Goal[] = []
  /** The rows with a reward waiting; named in the fourth figure. */
  @property({ attribute: false }) accessor unclaimed: RosterRow[] = []
  /** The filter the board applies; the figure that set it is marked. */
  @property({ type: Number, attribute: 'next-reset-at' }) accessor nextResetAt = 0
  /** The open lines of the task list over the counted characters; the reset tile's foot. */
  @property({ type: Number, attribute: 'open-tasks' }) accessor openTasks = 0
  /** One character on the board: "characters done" is no figure, and the vault tile filters nothing. */
  @property({ type: Boolean }) accessor solo = false
  @property({ attribute: false }) accessor gold: GoldSummary | null = null
  @property({ attribute: false }) accessor series: GoldSeries | null = null
  /** The figures switched on; all of them by default. */
  /** The views' switches: which figures the row draws. */
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS

  protected override willUpdate(): void {
    this.hostClasses({ 'kpi-row': true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { totals, activeCount, goals, unclaimed, series } = this
    const left = Math.max(this.nextResetAt - this.clock, 0)
    const remaining = playedParts(tr, left / 1000)
    const goldTotal = this.gold?.total ?? 0
    const { flags } = this

    return html`
      ${
        flags['kpi.vault']
          ? html`<wt-stat-tile
              icon="vault"
              .value=${totals.unlocked}
              .of=${totals.slots || 9 * Math.max(activeCount, 1)}
              .label=${tr.t('dash.kpi.vault')}
              bar=${totals.slots > 0 ? totals.unlocked / totals.slots : 0}
              data-tip=${this.solo ? nothing : tr.t('dash.activeHint')}
            ></wt-stat-tile>`
          : nothing
      }
      ${
        this.solo || !flags['kpi.done']
          ? nothing
          : html`<wt-stat-tile
              icon="target"
              .value=${totals.done}
              .of=${activeCount}
              .label=${tr.t('summary.done')}
              bar=${activeCount > 0 ? totals.done / activeCount : 0}
              data-tip=${goals.length > 0 ? tr.t('summary.doneGoals') : tr.t('summary.doneHint')}
            ></wt-stat-tile>`
      }
      ${
        flags['kpi.runs']
          ? html`<wt-stat-tile
              icon="keystone"
              .value=${totals.runs}
              .label=${
                totals.keyAvg === null
                  ? tr.t('summary.runs')
                  : `${tr.t('summary.runs')} · ${tr.t('dash.keyAvg')} +${tr.formatNumber(totals.keyAvg)}`
              }
              .foot=${`${tr.formatNumber(totals.bosses)} ${tr.t('dash.bosses')}`}
            ></wt-stat-tile>`
          : nothing
      }
      ${
        !flags['kpi.unclaimed']
          ? nothing
          : unclaimed.length > 0
            ? html`<wt-stat-tile
                icon="vault"
                .value=${unclaimed.length}
                .foot=${tr.t('dash.claim.foot')}
                claim
                data-tip=${tr.plural('dash.claim.body', unclaimed.length)}
              >
                <span slot="label"
                  >${tr.plural('summary.unclaimed', unclaimed.length)} —
                  ${unclaimed.map(
                    (row, index) =>
                      html`${index > 0 ? ', ' : nothing}<wt-button
                          class="char-open"
                          label=${row.character.name}
                          style=${styleMap({ color: classColor(row.character.classToken) ?? '' })}
                          data-tip=${tr.t('detail.open')}
                          @click=${() => this.emit('wt-open-character', row.character.key)}
                        ></wt-button>`
                  )}</span
                >
              </wt-stat-tile>`
            : html`<wt-stat-tile
                icon="clock"
                .value=${remaining.length === 0 ? tr.t('dash.resetNow') : remaining.slice(0, 2)}
                .label=${tr.t('dash.reset')}
                .foot=${
                  [
                    // The evenings before the reset first: the figure a player with
                    // an evening a day counts in, not the hours.
                    ...(left > 0 ? [tr.plural('reset.evenings', eveningsUntil(this.clock, this.nextResetAt))] : []),
                    ...(this.openTasks > 0 ? [`${tr.formatNumber(this.openTasks)} ${tr.t('summary.open')}`] : [])
                  ].join(' · ') || undefined
                }
                data-tip=${tr.t('topbar.resetHint')}
              ></wt-stat-tile>`
      }
      ${
        flags['kpi.gold']
          ? html`<wt-stat-tile
              icon="coins"
              .label=${tr.t('summary.gold')}
              .value=${toGold(goldTotal)}
              .trend=${goldTrend(series)}
              tone=${Tint.Gold}
              data-tip=${tr.t('gold.openView')}
              link
              @click=${() => this.emit('wt-open-gold')}
            ></wt-stat-tile>`
          : nothing
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-kpi-row': WtKpiRow
  }
}
