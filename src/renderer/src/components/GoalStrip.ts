import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { goalChip, type GoalProgress } from '../model/overview'
import './ui/Chip'
import './ui/Chips'

/**
 * The user's weekly goals against one character: one chip for each, the
 * progress behind the words, the tick once the goal is met.
 *
 * The roster scrolls past a dozen characters and every one of them is asked
 * for another slot until the vault is full - so the line the user drew has
 * to be on the entry itself, or a goal that is reached reads like a goal
 * that is not. The board, the card, the tile and the character page all draw
 * the same strip; `small` is the tile's, where the strip sits under figures
 * rather than beside a vault.
 *
 * A character with no goals, or one describing last week, has nothing to
 * say here and takes no gap.
 */
@customElement('wt-goal-strip')
export class WtGoalStrip extends WtElement {
  @property({ attribute: false }) accessor goals: GoalProgress[] = []
  /** The chips a shade smaller, for an entry that is already dense. */
  @property({ type: Boolean }) accessor small = false

  protected override willUpdate(): void {
    this.hostClasses({ 'goal-strip': true })
    this.hostPresent(this.goals.length > 0)
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    return html`<wt-chips
      >${this.goals.map((goal) => {
        const chip = goalChip(tr, goal)
        return html`<wt-chip
          ?small=${this.small}
          tone=${chip.tone ?? nothing}
          icon=${chip.icon ?? nothing}
          label=${chip.label}
          note=${chip.note ?? nothing}
          ?numeric-note=${chip.numericNote}
          data-tip=${chip.tip ?? nothing}
        ></wt-chip>`
      })}</wt-chips
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-goal-strip': WtGoalStrip
  }
}
