import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'
import { keyLabel, keyText, planMinutes, rewardText, type PlanEntry } from '../../model/plan'
import { DEFAULT_EVENING_MINUTES, EVENING_CHOICES } from '../../../../shared/effort'
import type { WtEvent } from '../../element'
import { WtCard } from '../ui/Card'
import { classColor } from '../../enums/classToken'
import { ControlSize } from '../../enums/controlSize'
import { FormatKind } from '../../enums/formatKind'
import '../ClassMedallion'
import '../ui/DashPanel'
import '../ui/FieldGroup'
import '../Icon'
import '../ui/Select'
import '../StepNote'
import '../ui/Button'
import '../ui/Format'
import '../ui/PanelEmpty'
import { IconSize } from '../../enums/iconSize'

/**
 * The evening's plan: the characters worth logging into first, each with
 * its step, the reason and what it takes - as many as fit the evening.
 * The head of the roster's order, said in full - the tile below says the
 * step, this says why, and in the order the evening goes.
 *
 * The briefing is the tab's first panel, so it has a titled head like the
 * gold view's panels: what the plan takes of the evening as a note behind
 * the title, the evening's budget as the control at the far end, where a
 * panel keeps its control.
 *
 * A line is one row of a table: who, the step, what it takes, and why -
 * the row and the slot, what it pays, the key to run - in words, not as
 * bare figures: a "+11" says nothing until it is "+11 over the
 * character". The columns hold what every line has, so the steps read
 * down and the minutes down; the reason is one cell that flows, because
 * a raid step has no key and a column for it would leave a hole.
 * The table is as wide as its words, not as the panel. The lines that
 * fit come first; a caption parts them from the ones that do not, whose
 * minutes carry the warning.
 *
 * @fires wt-open-character - A line, with the character's key.
 * @fires wt-config - The evening's budget, as `eveningMinutes`.
 */
@customElement('wt-evening-panel')
export class WtEveningPanel extends WtCard {
  @property({ attribute: false }) accessor plan: PlanEntry[] = []
  /** Whether the realm is worth a word; on a single-realm roster it is noise. */
  @property({ type: Boolean, attribute: 'show-realm' }) accessor showRealm = false
  /** The evening the plan was made for, in minutes. */
  @property({ type: Number }) accessor budget = DEFAULT_EVENING_MINUTES

  protected override willUpdate(): void {
    super.willUpdate()
    this.hostClasses({ panel: true, 'evening-panel': true })
  }

  private line(entry: PlanEntry, index: number): TemplateResult {
    const tr = this.tr
    const { character, step, fits } = entry
    const color = classColor(character.classToken)
    const reason = step.reason
    return html`<li>
      <wt-button
        ghost
        size=${ControlSize.Sm}
        data-tip=${tr.t('dash.openCharacter')}
        .label=${html`<span class="evening-index num">${index + 1}</span>
          <wt-class-medallion .character=${character} size="26"></wt-class-medallion>
          <span class="evening-who">
            <span class="evening-name" style=${color ? styleMap({ color }) : ''}>${character.name}</span>
            ${this.showRealm ? html`<span class="faint tiny">${character.realm}</span>` : ''}
          </span>
          <!-- The line says the reason in full, so the step carries no tip of it. -->
          <wt-step-note class="evening-step" .step=${step} size=${IconSize.Sm} tip=""></wt-step-note>
          <wt-format
            class=${classMap({ 'evening-minutes': true, 'warn-text': !fits })}
            kind=${FormatKind.Minutes}
            .value=${step.minutes}
            data-tip=${fits ? tr.t('dash.evening.minutesHint') : tr.t('dash.evening.overHint')}
          ></wt-format>
          ${
            reason
              ? html`<span class="evening-reason">
                  <span>${reason.slot}</span>
                  ${reason.reward ? html`<span>${rewardText(reason.reward, tr)}</span>` : nothing}
                  ${reason.key ? html`<span data-tip=${keyText(reason.key, tr)}>${keyLabel(reason.key, tr)}</span>` : nothing}
                </span>`
              : nothing
          }`}
        @click=${() => this.emit('wt-open-character', character.key)}
      ></wt-button>
    </li>`
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { plan, budget } = this
    // The choices, and the stored figure among them where it is none of them.
    const choices = EVENING_CHOICES.includes(budget) ? EVENING_CHOICES : [...EVENING_CHOICES, budget].sort((a, b) => a - b)
    // The plan lists what fits first; the first line that does not opens the rest.
    const after = plan.findIndex((entry) => !entry.fits)
    return html`
      <div class="panel-head">
        <span class="panel-step"><wt-icon name="target" size=${IconSize.Md}></wt-icon></span>
        <h2>${tr.t('dash.evening.title')}</h2>
        ${
          plan.length > 0
            ? // What the lines that fit take of the evening.
              html`<span class="panel-head-note"
                >${tr.t('dash.evening.fits', { minutes: tr.formatNumber(planMinutes(plan)), budget: tr.formatNumber(budget) })}</span
              >`
            : nothing
        }
        <wt-field-group
          inline
          size=${ControlSize.Sm}
          class="panel-head-control"
          icon="clock"
          label=${tr.t('dash.evening.budget')}
          data-tip=${tr.t('dash.evening.budgetHint')}
        >
          <wt-select
            size=${ControlSize.Sm}
            .value=${String(budget)}
            .options=${choices.map((each) => ({ value: String(each), label: tr.t('time.minutes', { count: tr.formatNumber(each) }) }))}
            @wt-change=${(event: WtEvent<'wt-change'>) => {
              event.stopPropagation()
              this.emit('wt-config', { eveningMinutes: Number(event.detail) })
            }}
          ></wt-select>
        </wt-field-group>
      </div>
      ${
        plan.length === 0
          ? html`<wt-panel-empty text=${tr.t('dash.evening.empty')}></wt-panel-empty>`
          : html`<ol class="evening">
              ${repeat(
                plan,
                (entry) => entry.character.key,
                (entry, index) =>
                  html`${index === after ? html`<li class="evening-after">${tr.t('dash.evening.after')}</li>` : nothing}${this.line(entry, index)}`
              )}
            </ol>`
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-evening-panel': WtEveningPanel
  }
}
