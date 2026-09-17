import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, WeeklyQuestDef } from '../../../../shared/types'
import { WtElement, type WtEvent } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import { CheckboxKind } from '../../enums/checkboxKind'
import { WowheadKind, wowheadUrl } from '../../enums/wowheadKind'
import { withQuests, type QuestChoice } from './model'
import { questIdsOf } from '../../../../shared/questPool'
import '../ui/Checkbox'
import '../ui/ExtLink'
import '../ui/Table'
import '../ui/Cell'

/**
 * One quest of the settings as a row of the table: its box and name.
 * Which character does it is picked on the list.
 * The cells are its light DOM children, so the table's column rules
 * reach them; the host is the row of the table's flat tree.
 *
 * @fires wt-config - The quest list, whenever the row changes it.
 */
@customElement('wt-quest-row')
export class WtQuestRow extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.TableRow

  @property({ attribute: false }) accessor choice!: QuestChoice
  @property({ attribute: false }) accessor config!: AppConfig
  @property({ type: Boolean }) accessor busy = false

  override connectedCallback(): void {
    super.connectedCallback()
    this.setAttribute('role', 'row')
  }

  private add(def: WeeklyQuestDef): void {
    const next = withQuests(this.config.weeklyQuests, [def])
    if (next) this.emit('wt-config', { weeklyQuests: next })
  }

  private drop(id: number): void {
    this.emit('wt-config', { weeklyQuests: this.config.weeklyQuests.filter((quest) => quest.id !== id) })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const choice = this.choice
    const quest = choice.watched
    return html`<wt-cell class="col-quest">
        <wt-checkbox
          kind=${CheckboxKind.CheckRow}
          label=${choice.label}
          ?checked=${quest !== null}
          ?disabled=${this.busy}
          @wt-check=${(event: WtEvent<'wt-check'>) => (event.detail ? this.add(choice.def) : this.drop(choice.id))}
        ></wt-checkbox>
      </wt-cell>
      <!-- A pool has no one id to link: the cell says how many quests take turns. -->
      <wt-cell class="num"
        >${
          choice.def.pool
            ? html`<span
                class="faint"
                data-tip=${[
                  tr.t('settings.quests.poolHint'),
                  ...(choice.latest ? [tr.t('settings.quests.poolLatest', { label: choice.latest })] : [])
                ].join('\n')}
                >${tr.t('settings.quests.pool', { count: questIdsOf(choice.def).length })}</span
              >`
            : html`<wt-ext-link
                class="faint ext-link"
                href=${wowheadUrl(WowheadKind.Quest, choice.id)}
                site="Wowhead"
                label=${String(choice.id)}
                mark
              ></wt-ext-link>`
        }</wt-cell
      >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-quest-row': WtQuestRow
  }
}
