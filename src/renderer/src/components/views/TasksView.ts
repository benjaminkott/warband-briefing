import { html, nothing, type TemplateResult } from 'lit'
import { multiRealm } from '../../model/overview'
import { customElement, property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import type { AppConfig, CharacterSnapshot, Goal, WeeklyEvents, WeeklyQuestDef } from '../../../../shared/types'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../../shared/display'
import type { CustomTaskState } from '../../../../shared/customTasks'
import { withoutSkips, type TaskSkips } from '../../../../shared/skips'
import { playedRoster } from '../../model/dashboard'
import { eveningPlan } from '../../model/plan'
import { DEFAULT_EVENING_MINUTES } from '../../../../shared/effort'
import { WtElement, type WtEvent } from '../../element'
import { memoLast } from '../../memo'
import {
  accountTasks,
  effectiveGrouping,
  filterTasks,
  groupingsFor,
  pickAccount,
  pickList,
  runningEvents,
  splitShared,
  tasksByCharacter,
  tasksByChore,
  taskTotals,
  type CharacterTasks
} from '../../model/tasks'
import { TaskFilter } from '../../enums/taskFilter'
import { TaskState } from '../../enums/taskState'
import { TaskGrouping } from '../../enums/taskGrouping'
import { Severity } from '../../enums/severity'
import { ControlSize } from '../../enums/controlSize'
import '../EmptyState'
import '../Notice'
import '../dashboard/EveningPanel'
import '../tasks/TaskGroup'
import '../ui/Bar'
import '../ui/Button'
import '../ui/Select'
import '../ui/FieldGroup'
import '../ui/Segmented'

/**
 * The task tab: the week as a list to work through.
 *
 * A line across the top counts the week; under it one panel per character
 * with every chore the sources know, most urgent character first - or, turned
 * round, one panel per chore with every character that has it, for a night
 * of running the same key on every alt. Every box is the sources' word: the
 * list is read out of the game's data after each sync, and nothing on it is
 * ticked by hand.
 *
 * The roster is the dashboard's: the characters played this week or last,
 * with the quiet rest a click away. A character without a single chore has
 * no panel. The warband's panel comes first, with what the week is - the
 * calendar's running events - under its caption.
 *
 * What is on the list at all is the player's choice, made on the list: a
 * panel in the pick mode draws every chore there is, each with a
 * box, and a line unticked is off the character's week (`skips.ts`) - off
 * the list, the count and the plan - until it is ticked again. The mode is
 * the panel's own, switched in its head, so the rest of the list stays
 * what it is.
 *
 * @fires wt-tasks-filter - Open lines only, or all of them.
 * @fires wt-tasks-grouping - By character, or by chore.
 * @fires wt-open-character - A panel's caption, with the character's key.
 * @fires wt-config - The evening's budget, from the plan's own select.
 * @fires wt-task-skip - A line taken off a week or put back, in the pick mode.
 */
/** The keys of the panels that are no character and no one chore, in the pick set. */
const WARBAND_PANEL = 'warband'
const SINGLES_PANEL = 'singles'

@customElement('wt-tasks-view')
export class WtTasksView extends WtElement {
  /** The roster the list covers: hidden characters already removed. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  /** Weekly quests done once for the whole account this week. */
  @property({ attribute: false }) accessor accountQuests: WeeklyQuestDef[] = []
  /** The calendar's events, where a source reported them. */
  @property({ attribute: false }) accessor events: WeeklyEvents | null = null
  @property({ attribute: false }) accessor goals: Goal[] = []
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS
  @property({ type: Number, attribute: 'max-level' }) accessor maxLevel = 0
  @property({ type: Number, attribute: 'reset-at' }) accessor resetAt = 0
  @property() accessor filter: TaskFilter = TaskFilter.All
  /** The user's choice; `null` leaves it to the roster's size. */
  @property({ attribute: false }) accessor grouping: TaskGrouping | null = null
  /** Whether the game runs; the list then describes the last logout, and says so. */
  @property({ attribute: false }) accessor gameRunning: boolean | null = null
  /** The user's own chores and their ticks; null draws the list without them. */
  @property({ attribute: false }) accessor custom: CustomTaskState | null = null
  /** The evening "Tonight" plans for, in minutes. */
  @property({ type: Number, attribute: 'evening-minutes' }) accessor eveningMinutes = DEFAULT_EVENING_MINUTES
  /** The player's own minimums of the supplies, by group id. */
  @property({ attribute: false }) accessor supplyMinimums: AppConfig['supplyMinimums'] = {}
  /** The chores taken off each week, for the pick mode to mark them; the roster carries them stamped on. */
  @property({ attribute: false }) accessor skips: TaskSkips = {}

  // The quiet part of the roster is out of the way by default but never gone.
  @state() accessor showQuiet = false
  /** The panels in the pick mode, by the key of what they are: a character's key, a chore's id, or the warband. */
  @property({ attribute: false }) accessor picking: ReadonlySet<string> = new Set()

  // The list's maths, once per change of what it reads - not once per tick
  // of the clock. The clock is an input on purpose: a cooldown runs out
  // between two reads, and the line for it appears within the minute.
  private playedOf = memoLast(playedRoster)
  private byCharacterOf = memoLast(tasksByCharacter)
  private accountOf = memoLast(accountTasks)
  // The pick mode's own list: the roster with nothing taken off, its lines
  // marked. Memos of their own, so a panel in the mode does not empty the
  // list's.
  private offeredOf = memoLast(withoutSkips)
  private offeredByCharacterOf = memoLast(tasksByCharacter)
  private pickListOf = memoLast(pickList)
  private owedOf = memoLast(accountTasks)
  private pickAccountOf = memoLast(pickAccount)
  private rowsOf = memoLast((byCharacter: CharacterTasks[]) => byCharacter.map((entry) => entry.row))
  private planOf = memoLast(eveningPlan)

  protected override willUpdate(): void {
    // One character: its panel takes the width of two columns, not a third of the stage.
    this.hostClasses({ tasks: true, 'tasks-solo': this.characters.length === 1 })
  }

  /** A panel's switch into the pick mode, or out of it. */
  private pick(key: string, on: boolean): void {
    const next = new Set(this.picking)
    if (on) next.add(key)
    else next.delete(key)
    this.picking = next
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { characters, goals, flags, maxLevel, resetAt, picking, filter } = this
    const grouping = effectiveGrouping(this.grouping, characters.length)
    const groupings = groupingsFor(characters.length)

    const played = this.playedOf(characters, resetAt)
    const quiet = characters.length - played.length
    const shown = this.showQuiet ? characters : played
    const byCharacter = this.byCharacterOf(tr, shown, goals, maxLevel, resetAt, flags, this.custom, this.supplyMinimums, this.clock)
    // A panel in the pick mode lists its week with nothing taken off, the
    // lines the player took off marked; outside the mode, those lines are
    // not built. The whole pick list is built once any panel is in the mode.
    const picks = picking.size > 0
    const picked = picks
      ? this.pickListOf(
          this.offeredByCharacterOf(
            tr,
            this.offeredOf(shown),
            goals,
            maxLevel,
            resetAt,
            flags,
            this.custom,
            this.supplyMinimums,
            this.clock
          ),
          this.skips
        )
      : byCharacter
    const pickedByKey = new Map(picked.map((entry) => [entry.character.key, entry]))
    // The warband's own chores come from every character the account has,
    // whether or not it is on the list: a paragon reward is the same reward
    // whoever last saw it.
    const account = this.accountOf(tr, characters, this.accountQuests, this.custom, this.skips)
    const pickingWarband = picking.has(WARBAND_PANEL)
    const pickedAccount = pickingWarband
      ? this.pickAccountOf(this.owedOf(tr, characters, this.accountQuests, this.custom, null), this.skips)
      : account
    // Only what is still running. An empty list stays empty: the events
    // are its frame, not its lines. A panel in the pick mode has no events:
    // an event is nothing to pick.
    const running = flags.events ? runningEvents(this.events, this.clock) : []

    if (byCharacter.length === 0 && account.total === 0) {
      return html`<wt-empty-state icon="tasks" heading=${tr.t('tasks.empty.title')}><p>${tr.t('tasks.empty.body')}</p></wt-empty-state>`
    }

    const totals = taskTotals([...byCharacter, account])
    const percent = totals.total > 0 ? (totals.done / totals.total) * 100 : 0
    // A single realm puts the same word on every panel, which is noise.
    const showRealm = multiRealm(shown)
    const byKey = new Map(characters.map((character) => [character.key, character]))
    const accountLines = pickingWarband ? pickedAccount.tasks : filterTasks(account.tasks, filter)

    let panels: TemplateResult
    let finished: string[] = []
    if (grouping === TaskGrouping.Character) {
      const open = byCharacter.filter((entry) => filter === TaskFilter.All || entry.done < entry.total)
      // Done for the week: off the list, named under it.
      finished = byCharacter.filter((entry) => !open.includes(entry)).map((entry) => entry.character.name)
      panels = html`${repeat(
        open,
        (entry) => entry.character.key,
        (entry) => {
          const key = entry.character.key
          const on = picking.has(key)
          return html`<wt-task-group
            .character=${entry.character}
            note=${showRealm ? entry.character.realm : nothing}
            .tasks=${on ? (pickedByKey.get(key)?.tasks ?? []) : filterTasks(entry.tasks, filter)}
            .goals=${entry.row.progress.goals}
            done=${entry.done}
            total=${entry.total}
            ?picking=${on}
            @wt-pick=${(event: WtEvent<'wt-pick'>) => this.pick(key, event.detail)}
          ></wt-task-group>`
        }
      )}`
    } else {
      // The chores two or more share, a panel each; the ones one character
      // has alone, together in one panel at the end, each line named.
      const { shared, singles } = splitShared(tasksByChore(byCharacter))
      const pickedChores = picks ? new Map(tasksByChore(picked).map((chore) => [chore.id, chore])) : new Map()
      const chores = shared.filter((chore) => filter === TaskFilter.All || chore.done < chore.total)
      const pickingSingles = picking.has(SINGLES_PANEL)
      const single = pickingSingles ? splitShared(tasksByChore(picked)).singles : filterTasks(singles, filter)
      panels = html`${repeat(
        chores,
        (chore) => chore.id,
        (chore) => {
          const on = picking.has(chore.id)
          return html`<wt-task-group
            heading=${chore.label}
            icon=${chore.icon}
            .tasks=${on ? (pickedChores.get(chore.id)?.tasks ?? []) : filterTasks(chore.tasks, filter)}
            done=${chore.done}
            total=${chore.total}
            .characters=${byKey}
            ?picking=${on}
            @wt-pick=${(event: WtEvent<'wt-pick'>) => this.pick(chore.id, event.detail)}
          ></wt-task-group>`
        }
      )}${
        single.length > 0
          ? html`<wt-task-group
              heading=${tr.t('tasks.group.single')}
              icon="users"
              .tasks=${single}
              done=${singles.filter((task) => !task.skipped && task.state === TaskState.Done).length}
              total=${singles.filter((task) => !task.skipped).length}
              .characters=${byKey}
              mixed
              ?picking=${pickingSingles}
              @wt-pick=${(event: WtEvent<'wt-pick'>) => this.pick(SINGLES_PANEL, event.detail)}
            ></wt-task-group>`
          : nothing
      }`
    }

    return html`
      <div class="toolbar">
        <wt-segmented
          .value=${filter}
          .options=${[
            { value: TaskFilter.Open, label: tr.t('tasks.filter.open') },
            { value: TaskFilter.All, label: tr.t('tasks.filter.all') }
          ]}
          @wt-change=${(event: WtEvent<'wt-change'>) => {
            event.stopPropagation()
            this.emit('wt-tasks-filter', event.detail as TaskFilter)
          }}
        ></wt-segmented>
        <!-- The same shape as the overview's bar: the filter on the left, the
             count and the view switch together on the right, on whichever
             line the wrap leaves them. -->
        <div class="toolbar-end">
          <span class="task-progress muted">
            <span class="count-label"
              >${tr.t('tasks.progress', { done: tr.formatNumber(totals.done), total: tr.formatNumber(totals.total) })}</span
            >
            <wt-bar percent=${percent}></wt-bar>
          </span>
          <!-- One grouping is no choice: with one character the switch is not drawn. -->
          ${
            groupings.length > 1
              ? html`<wt-segmented
                  .value=${grouping}
                  .options=${[
                    { value: TaskGrouping.Character, label: tr.t('tasks.group.character'), icon: 'users' },
                    { value: TaskGrouping.Chore, label: tr.t('tasks.group.chore'), icon: 'tasks' }
                  ].filter((option) => groupings.includes(option.value as TaskGrouping))}
                  @wt-change=${(event: WtEvent<'wt-change'>) => {
                    event.stopPropagation()
                    this.emit('wt-tasks-grouping', event.detail as TaskGrouping)
                  }}
                ></wt-segmented>`
              : nothing
          }
        </div>
      </div>

      ${
        this.gameRunning
          ? // The one honest answer to "the app shows my key as still open":
            // the game writes its files at logout and /reload, not before.
            html`<wt-notice tone=${Severity.Info}>${tr.t('tasks.gameRunning')}</wt-notice>`
          : nothing
      }

      <!-- The briefing itself: who first, and why. One character has no
           "who first" (E4): its one panel says the step on its own. -->
      ${
        flags.evening && characters.length > 1
          ? html`<wt-evening-panel
              class="task-evening"
              .plan=${this.planOf(this.rowsOf(byCharacter), tr, flags, this.eveningMinutes)}
              budget=${this.eveningMinutes}
              ?show-realm=${showRealm}
            ></wt-evening-panel>`
          : nothing
      }

      <!-- The panels flow in columns, the warband first. -->
      <div class="task-groups">
        ${
          accountLines.length > 0 || running.length > 0
            ? html`<wt-task-group
                heading=${tr.t('tasks.warband')}
                icon="medal"
                .events=${pickingWarband ? [] : running}
                .tasks=${accountLines}
                done=${account.done}
                total=${account.total}
                ?picking=${pickingWarband}
                @wt-pick=${(event: WtEvent<'wt-pick'>) => this.pick(WARBAND_PANEL, event.detail)}
              ></wt-task-group>`
            : nothing
        }
        ${panels}
      </div>

      ${
        finished.length > 0
          ? html`<p class="task-finished faint">${tr.plural('tasks.allDone', finished.length, { names: finished.join(', ') })}</p>`
          : nothing
      }
      ${
        quiet > 0
          ? html`<p class="dash-quiet faint">
              ${tr.plural('dash.quiet', quiet)}
              <wt-button
                ghost
                size=${ControlSize.Sm}
                label=${this.showQuiet ? tr.t('dash.hideQuiet') : tr.t('dash.showQuiet')}
                @click=${() => (this.showQuiet = !this.showQuiet)}
              ></wt-button>
            </p>`
          : nothing
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-tasks-view': WtTasksView
  }
}
