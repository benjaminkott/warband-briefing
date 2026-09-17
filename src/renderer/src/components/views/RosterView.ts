import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import type { AppConfig, CharacterHistory, CharacterSnapshot, Goal, GoldSummary, SeasonDungeon } from '../../../../shared/types'
import { DISPLAY_DEFAULTS, type DisplayFlags } from '../../../../shared/display'
import { DEFAULT_PREFS, type ViewPrefs } from '../../prefs'
import type { GoldSeries } from '../../model/gold'
import { activeRoster, dungeonMatrix, rosterRows, weekTotals, type RosterRow } from '../../model/dashboard'
import { openCount } from '../../model/tasks'
import { goalChip, multiRealm } from '../../model/overview'
import type { CustomTaskState } from '../../../../shared/customTasks'
import type { Translator } from '../../../../shared/i18n'
import { WtElement } from '../../element'
import { memoLast } from '../../memo'
import { Region } from '../../../../shared/enums/region'
import { ControlSize } from '../../enums/controlSize'
import { ViewMode } from '../../enums/viewMode'
import '../CharacterCard'
import '../CharacterTable'
import '../EmptyState'
import '../RosterToolbar'
import '../vault/VaultBlock'
import '../dashboard/BestMatrix'
import '../dashboard/CharacterTile'
import '../dashboard/KpiRow'
import '../detail/DetailTasks'
import '../ui/Button'
import '../ui/Card'
import '../ui/Chip'
import '../ui/DashPanel'
import '../ui/Chips'
import '../ui/PanelEmpty'

/**
 * The roster tab: the account as a board.
 *
 * The week summed in figures; the toolbar - search, the shape; the
 * roster in that shape - a grid of tiles, a list of rows in the plan's
 * order, or one table in the order of the column last clicked; then the
 * season's bests. The shell filters and sorts; this view draws.
 *
 * One character on the roster is the player with a single character. The
 * roster's tools - who first, the shapes, the filters - are noise for
 * them; the board shows the character large instead, with its list.
 *
 * @fires wt-query - The search text.
 * @fires wt-quiet - Show the characters not played this week or last, or hide them again.
 * @fires wt-sort-column - The sort key and direction, from a table header.
 * @fires wt-view - Tiles, rows or table.
 * @fires wt-open-character - A character's page asked for.
 * @fires wt-open-gold - The gold view asked for.
 */
@customElement('wt-roster-view')
export class WtRosterView extends WtElement {
  /** The roster minus what the user hid: what the figures count. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  /** What the search, the filter and the sort left of it, in order. */
  @property({ attribute: false }) accessor visible: CharacterSnapshot[] = []
  /** What the played filter leaves out. */
  @property({ type: Number, attribute: 'quiet-count' }) accessor quietCount = 0
  @property({ attribute: false }) accessor prefs: ViewPrefs = DEFAULT_PREFS
  @property() accessor query = ''
  @property({ attribute: false }) accessor gold: GoldSummary | null = null
  /** The month's gold series over the counted accounts, worked out once by the shell. */
  @property({ attribute: false }) accessor goldMonth: GoldSeries | null = null
  @property({ attribute: false }) accessor history: CharacterHistory = {}
  @property({ attribute: false }) accessor hiddenKeys: Set<string> = new Set()
  @property({ attribute: false }) accessor goals: Goal[] = []
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS
  /** The season's dungeons: the matrix's columns, and the one never run the step names. */
  @property({ attribute: false }) accessor dungeons: SeasonDungeon[] = []
  /** The user's own chores and their ticks, for the one-character board's list. */
  @property({ attribute: false }) accessor custom: CustomTaskState | null = null
  /** The player's own minimums of the supplies, for the one-character board's list. */
  @property({ attribute: false }) accessor supplyMinimums: AppConfig['supplyMinimums'] = {}
  @property({ type: Number, attribute: 'max-level' }) accessor maxLevel = 0
  @property({ type: Number, attribute: 'reset-at' }) accessor resetAt = 0
  @property({ type: Number, attribute: 'next-reset-at' }) accessor nextResetAt = 0
  @property() accessor region: Region = Region.Eu
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false
  /** Whether the characters not played this week or last are in the roster. */
  @property({ type: Boolean, attribute: 'show-quiet' }) accessor showQuiet = false

  // The board's maths, once per change of what it reads - not once per tick.
  private rowsOf = memoLast(rosterRows)
  private activeOf = memoLast(activeRoster)
  private activeRowsOf = memoLast(rosterRows)
  private openTasksOf = memoLast(
    (
      tr: Translator,
      rows: RosterRow[],
      flags: DisplayFlags,
      custom: CustomTaskState | null,
      minimums: AppConfig['supplyMinimums'],
      now: number
    ) => rows.reduce((sum, row) => sum + openCount(tr, row, flags, custom, minimums, now), 0)
  )
  private matrixOf = memoLast(dungeonMatrix)

  protected override willUpdate(): void {
    // An empty board is the empty state alone, without the board's own layout.
    this.hostClasses({ dash: this.characters.length > 0 })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { characters, visible, prefs, query, goals, flags, maxLevel, resetAt, nextResetAt, dungeons } = this

    if (characters.length === 0) {
      return html`<wt-empty-state icon="users" heading=${tr.t('overview.empty.title')}>
        <p>${tr.t('overview.empty.body')}</p>
      </wt-empty-state>`
    }

    const solo = characters.length === 1
    const shown = visible
    // The rows in the order the shell sorted them: rosterRows orders by
    // urgency, which is the plan's order and only one of the sort keys.
    const byKey = new Map(this.rowsOf(shown, goals, maxLevel, resetAt, tr, flags, dungeons).map((row) => [row.character.key, row]))
    const rows = shown.map((character) => byKey.get(character.key)!)
    // The figures describe the week, and only a character seen this week has
    // one - so no filter above can move them.
    const active = this.activeOf(characters, maxLevel)
    // The open lines of the list over the counted characters: the list's own count.
    const activeRows = this.activeRowsOf(active, goals, maxLevel, resetAt, tr, flags, dungeons)
    const openTasks = this.openTasksOf(tr, activeRows, flags, this.custom, this.supplyMinimums, this.clock)
    // Season-long, so the whole roster - not just this week's - has a row.
    const matrix = flags.matrix ? this.matrixOf(characters, tr, dungeons) : null
    // A single realm puts the same word on every tile, which is noise.
    const showRealm = multiRealm(shown)
    const searching = query.trim() !== ''

    return html`
      <wt-kpi-row
        .totals=${weekTotals(active, goals, flags)}
        active-count=${active.length}
        ?solo=${solo}
        .goals=${goals}
        .unclaimed=${rows.filter((row) => row.unclaimed)}
        .flags=${flags}
        next-reset-at=${nextResetAt}
        open-tasks=${openTasks}
        .gold=${this.gold}
        .series=${this.goldMonth}
      ></wt-kpi-row>

      ${
        solo
          ? this.soloBoard(rosterRows(characters, goals, maxLevel, resetAt, tr, flags, dungeons)[0]!)
          : html`<wt-roster-toolbar view=${prefs.view} .shown=${rows.length} .total=${characters.length}></wt-roster-toolbar>

              ${
                rows.length === 0
                  ? html`<wt-empty-state
                      icon=${searching ? 'search' : 'users'}
                      heading=${searching ? tr.t('overview.noMatch.title') : tr.t('overview.empty.title')}
                    >
                      <p>${searching ? tr.t('overview.noMatch.body') : tr.t('overview.empty.body')}</p>
                      ${
                        searching
                          ? html`<div class="row">
                              <wt-button
                                icon="close"
                                label=${tr.t('overview.clearSearch')}
                                @click=${() => this.emit('wt-query', '')}
                              ></wt-button>
                            </div>`
                          : nothing
                      }
                    </wt-empty-state>`
                  : this.roster(rows, showRealm)
              }

              <!-- Last, not first: what is on screen matters more than what is not. -->
              ${
                this.quietCount > 0
                  ? html`<p class="dash-quiet faint">
                      ${tr.plural('dash.quiet', this.quietCount)}
                      <wt-button
                        ghost
                        size=${ControlSize.Sm}
                        label=${this.showQuiet ? tr.t('dash.hideQuiet') : tr.t('dash.showQuiet')}
                        @click=${() => this.emit('wt-quiet', !this.showQuiet)}
                      ></wt-button>
                    </p>`
                  : nothing
              }`
      }
      ${
        flags.matrix
          ? html`<wt-dash-panel icon="dungeon" heading=${tr.t('dash.matrix.title')}>
              ${
                matrix
                  ? html`<wt-best-matrix .matrix=${matrix}></wt-best-matrix>`
                  : html`<wt-panel-empty to-sources text=${tr.t('dash.matrix.empty')}></wt-panel-empty>`
              }
            </wt-dash-panel>`
          : nothing
      }
    `
  }

  /** The roster in the shape the pref asks for. */
  private roster(rows: RosterRow[], showRealm: boolean): TemplateResult {
    const { prefs } = this
    if (prefs.view === ViewMode.Table) {
      return html`<wt-character-table
        .resetAt=${this.resetAt}
        .characters=${rows.map((row) => row.character)}
        .hiddenKeys=${this.hiddenKeys}
        sort=${prefs.sort}
        direction=${prefs.direction}
        .maxLevel=${this.maxLevel}
        .goals=${this.goals}
        region=${this.region}
        ?show-account=${this.showAccount}
        .history=${this.history}
        .flags=${this.flags}
        .custom=${this.custom}
        .supplyMinimums=${this.supplyMinimums}
        .dungeons=${this.dungeons}
      ></wt-character-table>`
    }
    if (prefs.view === ViewMode.Rows) {
      return html`<div class="char-grid">
        ${repeat(
          rows,
          (row) => row.character.key,
          (row) =>
            html`<wt-character-card
              .resetAt=${this.resetAt}
              .character=${row.character}
              ?hidden-char=${this.hiddenKeys.has(row.character.key)}
              .maxLevel=${this.maxLevel}
              .goals=${this.goals}
              ?show-account=${this.showAccount}
              .history=${this.history[row.character.key]}
              .flags=${this.flags}
              .dungeons=${this.dungeons}
            ></wt-character-card>`
        )}
      </div>`
    }
    return html`<div class="tile-grid">
      ${repeat(
        rows,
        (row) => row.character.key,
        (row) => html`<wt-character-tile .row=${row} ?show-realm=${showRealm}></wt-character-tile>`
      )}
    </div>`
  }

  /**
   * The one character, large: its band with the step, the vault under it,
   * and the week's list beside it - the same elements as its page, so the
   * board and the page never disagree.
   */
  private soloBoard(row: RosterRow): TemplateResult {
    const tr = this.tr
    const { character } = row
    return html`<div class="dash-row dash-solo">
      <wt-card class="panel dash-panel dash-solo-character">
        <wt-character-card
          .resetAt=${this.resetAt}
          .character=${character}
          .maxLevel=${this.maxLevel}
          .goals=${this.goals}
          .history=${this.history[character.key]}
          .flags=${this.flags}
          .dungeons=${this.dungeons}
        ></wt-character-card>
        ${
          row.levelling
            ? html`<wt-panel-empty text=${tr.t('card.levellingHint')}></wt-panel-empty>`
            : html`<wt-vault-block .character=${character} .progress=${row.progress} ?unclaimed=${row.unclaimed}></wt-vault-block> ${
                  row.progress.goals.length > 0 && !character.stale
                    ? html`<wt-chips class="goal-strip">
                        ${row.progress.goals.map((goal) => {
                          const chip = goalChip(tr, goal)
                          return html`<wt-chip
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
                }`
        }
      </wt-card>
      <wt-detail-tasks
        .character=${character}
        .goals=${this.goals}
        .maxLevel=${this.maxLevel}
        .resetAt=${this.resetAt}
        .flags=${this.flags}
        .custom=${this.custom}
        .supplyMinimums=${this.supplyMinimums}
        beside-vault
      ></wt-detail-tasks>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-roster-view': WtRosterView
  }
}
