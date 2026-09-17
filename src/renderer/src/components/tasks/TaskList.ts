import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { CharacterSnapshot } from '../../../../shared/types'
import { WtElement, type WtEvent } from '../../element'
import { manualTick, skipSubject, taskRow, taskSections, type Task } from '../../model/tasks'
import { isListTip, listTip } from '../../model/listTip'
import { classColor } from '../../enums/classToken'
import { CheckboxKind } from '../../enums/checkboxKind'
import { FormatKind } from '../../enums/formatKind'
import '../ui/Checkbox'
import '../Icon'
import '../Reward'
import '../ui/Format'
import { IconSize } from '../../enums/iconSize'

/**
 * A run of task lines: one character's chores in their sections, each
 * with a count - a plan, not a wall - or one chore's lines across the
 * roster, each naming its character. The panel of the list and the
 * character's page draw the same run, so a line reads the same wherever
 * it stands.
 *
 * A line is the box, the mark of its kind, what to do, what it takes in
 * minutes, the figure it is measured in, and what it pays. Only an own
 * chore's box takes a hand; every other box is the sources' word - until
 * the pick mode, where every box is the player's and says whether the
 * line is on the character's week at all (`skips.ts`).
 *
 * @fires wt-task-tick - An own chore ticked or unticked, with the tick.
 * @fires wt-task-skip - A line taken off a week or put back, in the pick mode.
 */
@customElement('wt-task-list')
export class WtTaskList extends WtElement {
  /** The lines, already filtered to what the list shows. */
  @property({ attribute: false }) accessor tasks: Task[] = []
  /** One character's lines: drawn in their sections. Off, the lines are one flat run that names each character. */
  @property({ type: Boolean }) accessor sectioned = false
  /** The roster by key, so a line of a flat run can name its character. */
  @property({ attribute: false }) accessor characters: Map<string, CharacterSnapshot> = new Map()
  /** A flat run of different chores: every line says what to do, not only where it differs from a caption. */
  @property({ type: Boolean }) accessor mixed = false
  /** The pick mode: the boxes say what is on the week, and a line taken off is drawn dim. */
  @property({ type: Boolean }) accessor picking = false

  protected override willUpdate(): void {
    this.hostClasses({ 'task-list': !this.sectioned })
  }

  private line(task: Task, who: CharacterSnapshot | null): TemplateResult {
    const tr = this.tr
    const line = taskRow(tr, task, who !== null && !this.mixed, this.picking)
    // The tip goes on the words the line shows: the label, or the name
    // where the caption already says what to do.
    const text = isListTip(task.tip) ? nothing : (task.tip ?? nothing)
    const rows = isListTip(task.tip) ? task.tip : null
    // In the pick mode the line's state steps back: the box is a choice,
    // in the accent, and a line taken off is dim rather than struck through.
    return html`<wt-checkbox
      class=${classMap({ 'task-ready': line.ready && !this.picking, 'task-done': line.done && !this.picking, 'task-pick': this.picking, 'task-skipped': task.skipped })}
      kind=${CheckboxKind.TaskRow}
      ?checked=${line.checked}
      ?disabled=${!line.takesHand}
      ?off=${line.done && !this.picking}
      control-tip=${line.tip}
      .label=${html`<wt-icon name=${task.icon} size=${IconSize.Sm}></wt-icon>
        ${
          who
            ? html`<span
                class="task-who"
                style=${styleMap({ color: classColor(who.classToken) ?? '' })}
                data-tip=${line.showLabel ? nothing : text}
                ${listTip(line.showLabel ? null : rows)}
                >${who.name}</span
              >`
            : nothing
        }
        ${line.showLabel ? html`<span class="task-label" data-tip=${text} ${listTip(rows)}>${task.label}</span>` : nothing}
        ${line.ready ? html`<span class="tiny warn-text">${tr.t('task.ready')}</span>` : nothing}
        ${
          task.minutes !== null && !line.done
            ? // The price beside the ask; a done line has paid it.
              html`<wt-format
                class="task-minutes"
                kind=${FormatKind.Minutes}
                .value=${task.minutes}
                data-tip=${tr.t('tasks.minutesHint')}
              ></wt-format>`
            : nothing
        }
        ${task.note ? html`<span class="task-note num">${task.note}</span>` : nothing}
        <wt-reward class="task-reward" .reward=${task.reward}></wt-reward>`}
      @wt-check=${(event: WtEvent<'wt-check'>) => {
        // A tick goes up as the user's decision; the box itself follows
        // the config on the next render, not the click. In the pick mode
        // it is the line's place on the week, else an own chore's tick.
        event.stopPropagation()
        if (this.picking) {
          this.emit('wt-task-skip', { id: task.id, subject: skipSubject(task), skipped: !event.detail })
          return
        }
        const tick = manualTick(task, event.detail)
        if (tick) this.emit('wt-task-tick', tick)
      }}
    ></wt-checkbox>`
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    if (this.sectioned) {
      return html`${taskSections(this.tasks).map(
        (section) =>
          html`<div class="task-section">
            <div class="task-section-head">
              <span>${tr.t(section.labelKey)}</span>
              <span class="task-section-count num"
                ><wt-format .value=${section.done}></wt-format>/<wt-format .value=${section.total}></wt-format
              ></span>
            </div>
            <div class="task-list">
              ${repeat(
                section.tasks,
                (task) => task.key,
                (task) => this.line(task, null)
              )}
            </div>
          </div>`
      )}`
    }
    return html`${repeat(
      this.tasks,
      (task) => task.key,
      (task) => this.line(task, !task.characterKey ? null : (this.characters.get(task.characterKey) ?? null))
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-task-list': WtTaskList
  }
}
