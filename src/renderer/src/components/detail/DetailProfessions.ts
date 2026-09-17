import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot } from '../../../../shared/types'
import { percentOf } from '../../model/format'
import { concentrationFull } from '../../model/overview'
import { WtDetailPanel } from './DetailPanel'
import { DetailListKind } from '../../enums/detailListKind'
import { IconKind } from '../../../../shared/enums/iconKind'
import '../ui/DashPanel'
import '../GameIcon'
import '../ui/Bar'
import './DetailList'
import '../ui/PanelEmpty'
import './DetailEntry'

/** The primary professions: skill, and the concentration bar where the profession has one. */
@customElement('wt-detail-professions')
export class WtDetailProfessions extends WtDetailPanel {
  @property({ attribute: false }) accessor character!: CharacterSnapshot

  protected override willUpdate(): void {
    const tr = this.tr
    const professions = this.character.professions ?? []
    this.span = 6
    this.icon = 'anvil'
    this.heading = tr.t('card.professions')
    this.content =
      professions.length === 0
        ? html`<wt-panel-empty text=${tr.t('card.noProfessions')}></wt-panel-empty>`
        : html`<wt-detail-list kind=${DetailListKind.Bars}>
            ${professions.map((profession) => {
              const full = concentrationFull(profession)
              return html`<wt-detail-entry>
                <span class="detail-bar-label"
                  ><wt-game-icon class="detail-row-icon" kind=${IconKind.Profession} ref=${profession.skillLineId} size="16"></wt-game-icon
                  >${profession.name}</span
                >
                <span class="detail-bar-value"> ${tr.t('profession.skill', { skill: profession.skill, max: profession.maxSkill })} </span>
                <!-- Concentration refills on its own and stops at the cap, so a
                     full bar is regeneration thrown away - the one worth a look. -->
                ${
                  profession.concentration
                    ? html`<wt-bar
                          percent=${percentOf(profession.concentration.current, profession.concentration.max)}
                          ?warn=${full}
                        ></wt-bar>
                        <span class=${`tiny${full ? ' warn-text' : ' muted'}`}>
                          ${tr.t('profession.concentration', {
                            current: tr.formatNumber(profession.concentration.current),
                            max: tr.formatNumber(profession.concentration.max)
                          })}${full ? ` · ${tr.t('profession.concentrationFull')}` : ''}
                        </span>`
                    : nothing
                }
                ${
                  profession.knowledge
                    ? html`<span class="tiny warn-text"
                        >${tr.plural('profession.knowledgePoints', profession.knowledge)} · ${tr.t('tasks.chore.knowledge')}</span
                      >`
                    : nothing
                }
              </wt-detail-entry>`
            })}
          </wt-detail-list>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-professions': WtDetailProfessions
  }
}
