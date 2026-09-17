import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { CalendarEvent, CharacterSnapshot } from '../../../../shared/types'
import { WtCard } from '../ui/Card'
import { eventChip, type Task } from '../../model/tasks'
import { goalChip, type GoalProgress } from '../../model/overview'
import type { IconName } from '../Icon'
import { classColor } from '../../enums/classToken'
import { ControlSize } from '../../enums/controlSize'
import { FormatKind } from '../../enums/formatKind'
import { ratingColor, ratingStyle } from '../../model/dashboard'
import './TaskList'
import '../Icon'
import '../ClassMedallion'
import '../IdentityLine'
import '../ui/DashPanel'
import '../ui/Chip'
import '../ui/Button'
import '../ui/Format'
import '../ui/Chips'
import '../ui/PanelEmpty'
import '../ui/Hint'
import { IconSize } from '../../enums/iconSize'

/**
 * One panel of the task list: a character with its chores, or one chore
 * with every character that has it. The same compact box as a dashboard
 * panel, with a caption line that carries a class medallion in place of
 * the mark when the panel is a character - who it is, before what to do.
 * Under the caption, a character has the card's sub-line in short: who it
 * is, its two figures, how old the lines are. The warband's
 * panel says what the week is under its caption: the calendar's running
 * events, as chips. The lines are a `wt-task-list`.
 *
 * The head carries the switch into the pick mode: in it, the panel draws
 * every chore of its week with a box, and a hint under the head says what
 * the boxes do. The view hands the panel the lines for the mode.
 *
 * @fires wt-open-character - The name or the chevron, with the character's key.
 * @fires wt-pick - The switch into the pick mode (true) or out of it (false).
 */
@customElement('wt-task-group')
export class WtTaskGroup extends WtCard {
  /** The character the panel is, or null for a panel that is one chore. */
  @property({ attribute: false }) accessor character: CharacterSnapshot | null = null
  /** The caption of a chore panel; a character panel takes its name. */
  @property() accessor heading = ''
  @property() accessor icon: IconName = 'scroll'
  /** A word after the caption in quieter type - the realm, where it is worth one. */
  @property() accessor note: string | undefined = undefined
  /** The lines, already filtered to what the list shows. */
  @property({ attribute: false }) accessor tasks: Task[] = []
  /** The character's goals with their progress: a strip of chips under the head, not lines. */
  @property({ attribute: false }) accessor goals: GoalProgress[] = []
  /** The calendar's running events, on the warband's panel: what the week is, before what it owes. */
  @property({ attribute: false }) accessor events: CalendarEvent[] = []
  @property({ type: Number }) accessor done = 0
  @property({ type: Number }) accessor total = 0
  /** The roster by key, so a line of a chore panel can name its character. */
  @property({ attribute: false }) accessor characters: Map<string, CharacterSnapshot> = new Map()
  /** A panel of different chores, one character each: every line says what to do. */
  @property({ type: Boolean }) accessor mixed = false
  /** The pick mode: the head's switch is lit, the lines have boxes. */
  @property({ type: Boolean }) accessor picking = false

  protected override willUpdate(): void {
    super.willUpdate()
    this.hostClasses({ panel: true, 'dash-panel': true, 'task-group': true, 'task-group-done': this.done === this.total })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { character, tasks } = this
    const color = character ? classColor(character.classToken) : null
    return html`
      <div class="dash-head">
        ${
          character
            ? html`<wt-class-medallion .character=${character} size="22"></wt-class-medallion>
                <h2 style=${color ? styleMap({ color }) : nothing}>
                  <wt-button
                    class="char-open task-group-name"
                    label=${character.name}
                    @click=${() => this.emit('wt-open-character', character.key)}
                  ></wt-button>
                </h2>`
            : html`<wt-icon name=${this.icon} size=${IconSize.Sm}></wt-icon>
                <h2>${this.heading}</h2>`
        }
        ${this.note ? html`<span class="dash-head-note">${this.note}</span>` : nothing}
        ${
          this.total > 0
            ? html`<span class="dash-head-aside"
                ><wt-format .value=${this.done}></wt-format>/<wt-format .value=${this.total}></wt-format
              ></span>`
            : nothing
        }
        <wt-button
          class="task-pick-switch"
          icon="pick"
          icon-only
          size=${ControlSize.Sm}
          ghost
          ?active=${this.picking}
          data-tip=${this.picking ? tr.t('tasks.pick.done') : tr.t('tasks.pick')}
          @click=${() => this.emit('wt-pick', !this.picking)}
        ></wt-button>
        ${
          character
            ? html`<wt-button
                icon="chevronRight"
                icon-only
                size=${ControlSize.Sm}
                ghost
                data-tip=${tr.t('dash.openCharacter')}
                @click=${() => this.emit('wt-open-character', character.key)}
              ></wt-button>`
            : nothing
        }
      </div>
      ${
        character
          ? // The summary in one line, so the head keeps its words whole:
            // who, the two figures a player compares, how old the lines are -
            // the game wrote them at this character's last logout or /reload,
            // and nothing since has reached the file.
            html`<div class="task-group-sub">
              <wt-identity-line .character=${character} .parts=${[character.spec, character.className, character.realm]}></wt-identity-line>
              ${
                character.itemLevel
                  ? html`<span
                      ><wt-format kind=${FormatKind.Whole} .value=${character.itemLevel}></wt-format> ${tr.t('card.itemLevel')}</span
                    >`
                  : nothing
              }
              ${
                character.mythicRating
                  ? html`<wt-format
                      kind=${FormatKind.Whole}
                      class="rated"
                      .value=${character.mythicRating}
                      style=${styleMap(ratingStyle(ratingColor(character.mythicRating)) ?? {})}
                    ></wt-format>`
                  : nothing
              }
              <span class="task-group-stand" data-tip=${tr.t('tasks.standHint')}
                >${tr.t('tasks.stand', { time: this.relativeTime(character.weeklyUpdatedAt) })}</span
              >
            </div>`
          : nothing
      }
      ${
        this.events.length > 0
          ? // An event is no line: nothing is done with it, it is the week's frame.
            html`<wt-chips class="task-events">
              ${this.events.map((event) => {
                const chip = eventChip(tr, event)
                return html`<wt-chip small icon=${chip.icon ?? nothing} label=${chip.label} note=${chip.note ?? nothing}></wt-chip>`
              })}
            </wt-chips>`
          : nothing
      }
      ${
        this.picking
          ? // What the boxes do now, said once over the lines.
            html`<wt-hint icon="pick" .text=${tr.t('tasks.pick.body')}></wt-hint>`
          : nothing
      }
      ${
        this.goals.length > 0
          ? // Where the character stands against its goals: a figure each, the
            // sum of lines below, so it is read before them and not among them.
            html`<wt-chips class="task-goals">
              ${this.goals.map((goal) => {
                const chip = goalChip(tr, goal)
                return html`<wt-chip
                  small
                  tone=${chip.tone ?? nothing}
                  icon=${chip.icon ?? nothing}
                  label=${chip.label}
                  note=${chip.note ?? nothing}
                  ?numeric-note=${chip.numericNote}
                  data-tip=${chip.tip ?? nothing}
                ></wt-chip>`
              })}
            </wt-chips>`
          : nothing
      }
      ${
        tasks.length === 0
          ? html`<wt-panel-empty text=${tr.t('tasks.nothingOpen')}></wt-panel-empty>`
          : // A character's lines in their sections; a chore's lines name their characters.
            html`<wt-task-list
              .tasks=${tasks}
              ?sectioned=${character !== null}
              ?mixed=${this.mixed}
              ?picking=${this.picking}
              .characters=${this.characters}
            ></wt-task-list>`
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-task-group': WtTaskGroup
  }
}
