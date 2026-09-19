import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot, Goal } from '../../../../shared/types'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../../shared/display'
import type { CustomTaskState } from '../../../../shared/customTasks'
import type { Translator } from '../../../../shared/i18n'
import { rosterRows, type RosterRow } from '../../model/dashboard'
import { characterTasks, counted } from '../../model/tasks'
import { memoLast } from '../../memo'
import { WtDetailPanel } from './DetailPanel'
import { TaskState } from '../../enums/taskState'
import { TaskKind } from '../../enums/taskKind'
import '../ui/DashPanel'
import '../tasks/TaskList'
import '../ui/PanelEmpty'

/**
 * The character's week as the task list has it: every chore with its box,
 * the same lines in the same sections, the same reasons, the same skips -
 * so the page and the list never disagree about what is left. Beside the
 * vault block, which says "2 more bosses" on every row, the panel leaves
 * the vault rows to the block (`beside-vault`); the reward to claim stays,
 * it is a step.
 */
@customElement('wt-detail-tasks')
export class WtDetailTasks extends WtDetailPanel {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  @property({ attribute: false }) accessor goals: Goal[] = []
  @property({ type: Number, attribute: 'max-level' }) accessor maxLevel = 0
  @property({ type: Number, attribute: 'reset-at' }) accessor resetAt = 0
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS
  @property({ attribute: false }) accessor custom: CustomTaskState | null = null
  /** The player's own minimums of the supplies, by group id. */
  @property({ attribute: false }) accessor supplyMinimums: AppConfig['supplyMinimums'] = {}
  /** The vault block stands beside the panel: its rows are not lines here as well. */
  @property({ type: Boolean, attribute: 'beside-vault' }) accessor besideVault = false

  // Once per change of what the panel reads; the clock is an input so a
  // cooldown that runs out gets its line within the minute.
  private rowOf = memoLast(
    (character: CharacterSnapshot, goals: Goal[], maxLevel: number, resetAt: number, tr: Translator, flags: DisplayFlags): RosterRow =>
      rosterRows([character], goals, maxLevel, resetAt, tr, flags)[0]!
  )
  private tasksOf = memoLast(characterTasks)

  protected override willUpdate(): void {
    const tr = this.tr
    const row = this.rowOf(this.character, this.goals, this.maxLevel, this.resetAt, tr, this.flags)
    const all = this.tasksOf(tr, row, this.flags, this.custom, this.supplyMinimums, this.clock)
    const tasks = this.besideVault ? all.filter((task) => task.kind !== TaskKind.Vault) : all
    const asked = counted(tasks)
    const done = asked.filter((task) => task.state === TaskState.Done).length
    this.icon = 'tasks'
    this.heading = tr.t('detail.tasks.title')
    this.aside = asked.length > 0 ? `${done}/${asked.length}` : undefined
    this.content =
      tasks.length === 0
        ? html`<wt-panel-empty text=${tr.t(row.levelling ? 'card.levellingHint' : 'tasks.nothingOpen')}></wt-panel-empty>`
        : html`<wt-task-list .tasks=${tasks} sectioned></wt-task-list>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-tasks': WtDetailTasks
  }
}
