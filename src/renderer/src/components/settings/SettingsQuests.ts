import { html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { AppConfig, WeeklyQuestDef } from '../../../../shared/types'
import type { CharacterSnapshot } from '../../../../shared/types'
import { seasonCatalog, seasonQuestDefs } from '../../../../shared/seasonCatalog'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import '../ui/DashPanel'
import { questChoices, withQuest } from './model'
import { ControlSize } from '../../enums/controlSize'
import { InputWidth } from '../../enums/inputWidth'
import './QuestRow'
import '../ui/Button'
import '../ui/FieldGroup'
import '../ui/Input'
import '../ui/Group'
import '../ui/Table'
import '../ui/Hint'

/**
 * The weekly quests the list watches: every quest the app knows as a row
 * with a box, the season's in one group and the rest in another, and a
 * form for an id nobody has seen. A ticked row carries the quest's
 * settings; an unticked one is only its name. Which character does which
 * quest is picked on the list, and a hint under the table says so.
 *
 * @fires wt-config - The quest list, whenever it changes.
 */
@customElement('wt-settings-quests')
export class WtSettingsQuests extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  /** Weekly quests the sources saw completed - offered as rows. */
  @property({ attribute: false }) accessor detectedQuests: WeeklyQuestDef[] = []
  /** The season's weeklies the companion learned from the game - rows of the season's group. */
  @property({ attribute: false }) accessor learnedQuests: WeeklyQuestDef[] = []
  /** The roster: with more than one character a hint says where the quest's character is picked. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  @property({ type: Boolean }) accessor busy = false

  @state() accessor questLabel = ''
  @state() accessor questId = ''

  private addTyped(): void {
    const next = withQuest(this.config.weeklyQuests, Number(this.questId), this.questLabel)
    if (!next) return
    this.emit('wt-config', { weeklyQuests: next })
    this.questLabel = ''
    this.questId = ''
  }

  protected override willUpdate(): void {
    const tr = this.tr
    const quests = this.config.weeklyQuests
    const choices = questChoices(quests, this.detectedQuests, this.learnedQuests, tr.compare)
    const columns = [
      { label: tr.t('settings.quests.quest'), className: 'col-quest' },
      { label: tr.t('settings.quests.id'), className: 'col-id' }
    ]
    this.icon = 'scroll'
    this.heading = tr.t('settings.quests.title')
    this.description = tr.t('settings.quests.body', { season: seasonCatalog().label })
    this.content = html`
      <wt-group heading=${tr.t('settings.quests.season')} note=${tr.t('settings.quests.seasonHint')}>
        <wt-button
          slot="action"
          ghost
          size=${ControlSize.Sm}
          icon="refresh"
          label=${tr.t('settings.reset')}
          data-tip=${tr.t('settings.resetHint', { season: seasonCatalog().label })}
          ?disabled=${this.busy}
          @click=${() => this.emit('wt-config', { weeklyQuests: seasonQuestDefs() })}
        ></wt-button>
        <wt-table .columns=${columns}>
          ${choices.season.map(
            (choice) =>
              html`<wt-quest-row .choice=${choice} .config=${this.config} ?busy=${this.busy}></wt-quest-row>`
          )}
        </wt-table>
        ${this.characters.length > 1 ? html`<wt-hint text=${tr.t('settings.quests.pickHint')}></wt-hint>` : nothing}
      </wt-group>

      ${
        choices.others.length > 0
          ? html`<wt-group heading=${tr.t('settings.quests.others')} note=${tr.t('settings.quests.othersHint')}>
              <wt-table .columns=${columns}>
                ${choices.others.map(
                  (choice) =>
                    html`<wt-quest-row
                      .choice=${choice}
                      .config=${this.config}
                      .characters=${this.characters}
                      ?busy=${this.busy}
                    ></wt-quest-row>`
                )}
              </wt-table>
            </wt-group>`
          : nothing
      }

      <wt-group heading=${tr.t('settings.quests.manual')} note=${tr.t('settings.quests.manualHint')}>
        <div class="row">
          <wt-input
            width=${InputWidth.Grow}
            placeholder=${tr.t('settings.quests.labelPlaceholder')}
            .value=${this.questLabel}
            @wt-input=${(event: WtEvent<'wt-input'>) => (this.questLabel = event.detail)}
            @wt-submit=${() => this.addTyped()}
          ></wt-input>
          <wt-input
            width=${InputWidth.Small}
            digits
            placeholder=${tr.t('settings.quests.id')}
            .value=${this.questId}
            @wt-input=${(event: WtEvent<'wt-input'>) => (this.questId = event.detail)}
            @wt-submit=${() => this.addTyped()}
          ></wt-input>
          <wt-button
            icon="plus"
            label=${tr.t('settings.quests.add')}
            ?disabled=${!this.questLabel.trim() || !this.questId}
            @click=${() => this.addTyped()}
          ></wt-button>
        </div>
      </wt-group>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-quests': WtSettingsQuests
  }
}
