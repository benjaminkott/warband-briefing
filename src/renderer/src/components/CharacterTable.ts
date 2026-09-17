import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classColor } from '../enums/classToken'
import { styleMap } from 'lit/directives/style-map.js'
import { repeat } from 'lit/directives/repeat.js'
import { classMap } from 'lit/directives/class-map.js'
import type { AppConfig, CharacterHistory, CharacterSnapshot, Goal, SeasonDungeon } from '../../../shared/types'
import type { CustomTaskState } from '../../../shared/customTasks'
import type { TranslationKey } from '../../../shared/i18n'
import { DISPLAY_DEFAULTS, TREND_DAYS, type DisplayFlags } from '../../../shared/display'
import { accountsOf, defaultDirection, keystoneShort, multiRealm, tokenAmount } from '../model/overview'
import { seasonToken, type SeasonCurrency } from '../../../shared/seasonCatalog'
import { memoLast } from '../memo'
import { WtCard } from './ui/Card'
import type { IconName } from './Icon'
import { tableRows, type TableFigure, type TableRow } from './table/model'
import { isListTip, listTip, type ListTip } from '../model/listTip'
import { Region } from '../../../shared/enums/region'
import { SortDirection } from '../enums/sortDirection'
import { SortKey } from '../enums/sortKey'
import { StateWord } from '../enums/stateWord'
import { Place } from '../enums/place'
import { Tint } from '../enums/tint'
import { FormatKind } from '../enums/formatKind'
import './CharacterLinks'
import './ui/Button'
import './ClassMedallion'
import './ui/Chip'
import './StepNote'
import './ui/Bar'
import './ui/Chip'
import './ui/Format'
import './ui/Trend'
import './Icon'
import { IconSize } from '../enums/iconSize'

interface Column {
  id: string
  /** The head's word; the token column takes the catalog's instead. */
  key?: TranslationKey
  /** Columns without a sort key are context only. */
  sort?: SortKey
  numeric?: boolean
}

const COLUMNS: Column[] = [
  { id: 'character', key: 'table.character', sort: SortKey.Name },
  { id: 'account', key: 'table.account' },
  { id: 'ilvl', key: 'table.ilvl', sort: SortKey.Ilvl, numeric: true },
  { id: 'score', key: 'table.score', sort: SortKey.Score, numeric: true },
  { id: 'key', key: 'table.key', sort: SortKey.Key },
  { id: 'vault', key: 'table.vault', sort: SortKey.Vault },
  /** The season's token: how many a character holds, under the catalog's word. */
  { id: 'token', numeric: true },
  { id: 'runs', key: 'table.runs', numeric: true },
  { id: 'raids', key: 'table.raids' },
  { id: 'weeklies', key: 'table.weeklies' },
  { id: 'gear', key: 'table.gear', sort: SortKey.Gear },
  { id: 'open', key: 'table.open', sort: SortKey.Todo },
  { id: 'gold', key: 'table.gold', sort: SortKey.Gold, numeric: true },
  { id: 'played', key: 'table.played', sort: SortKey.Played, numeric: true },
  { id: 'seen', key: 'table.seen', sort: SortKey.Updated },
  { id: 'links', key: 'table.actions' }
]

/**
 * One row per character - the view for comparing a full roster at a glance.
 * The cards carry the same numbers; `table/model.ts` works the rows out and
 * the element only draws them.
 *
 * @fires wt-sort-column - A header click, with the sort key and direction.
 * @fires wt-open-character - A name, with the character's key.
 */
@customElement('wt-character-table')
export class WtCharacterTable extends WtCard {
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  @property({ attribute: false }) accessor hiddenKeys: Set<string> = new Set()
  /** The season's dungeons, so the step can name the one never run. */
  @property({ attribute: false }) accessor dungeons: SeasonDungeon[] = []
  /** Item level and rating readings per character, for the arrows beside the figures. */
  @property({ attribute: false }) accessor history: CharacterHistory = {}
  /** Which of the optional columns the table adds. */
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS
  @property() accessor sort: SortKey = SortKey.Vault
  @property() accessor direction: SortDirection = SortDirection.Desc
  /** Level cap of the roster; below it there are no weekly tasks. */
  @property({ type: Number, attribute: 'max-level' }) accessor maxLevel = 0
  /** Start of the current week, which is what "not played yet" is measured from. */
  @property({ type: Number, attribute: 'reset-at' }) accessor resetAt = 0
  /** The user's weekly targets, measured against every character. */
  @property({ attribute: false }) accessor goals: Goal[] = []
  /** Region to build the external links with when a source did not report one. */
  @property() accessor region: Region = Region.Eu
  /** Only worth a column once a second WTF account is in play. */
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false
  /** The user's own chores and their ticks, for the lines the tasks cell counts. */
  @property({ attribute: false }) accessor custom: CustomTaskState | null = null
  /** The player's own minimums of the supplies, for the errands the tasks cell counts. */
  @property({ attribute: false }) accessor supplyMinimums: AppConfig['supplyMinimums'] = {}

  // The rows are worked out once per change of what they read, not once per
  // tick of the clock.
  private rowsOf = memoLast(
    (
      characters: CharacterSnapshot[],
      hiddenKeys: Set<string>,
      history: CharacterHistory,
      flags: DisplayFlags,
      goals: Goal[],
      maxLevel: number,
      resetAt: number,
      now: number,
      custom: CustomTaskState | null,
      minimums: AppConfig['supplyMinimums'],
      dungeons: SeasonDungeon[]
    ) => tableRows(this.tr, { characters, hiddenKeys, history, flags, goals, maxLevel, resetAt, now, custom, minimums, dungeons })
  )

  protected override willUpdate(): void {
    super.willUpdate()
    this.hostClasses({ 'table-wrap': true })
  }

  private headerClick(column: Column): void {
    if (!column.sort) return
    const next =
      column.sort === this.sort
        ? this.direction === SortDirection.Asc
          ? SortDirection.Desc
          : SortDirection.Asc
        : defaultDirection(column.sort)
    this.emit('wt-sort-column', { sort: column.sort, direction: next })
  }

  protected override render(): TemplateResult {
    const { characters, flags, showAccount } = this
    const rows = this.rowsOf(
      characters,
      this.hiddenKeys,
      this.history,
      flags,
      this.goals,
      this.maxLevel,
      this.resetAt,
      this.clock,
      this.custom,
      this.supplyMinimums,
      this.dungeons
    )
    // On a single-realm roster the realm is the same word on every row - noise.
    const showRealm = multiRealm(characters)
    const token = seasonToken()
    const columns = COLUMNS.filter((column) => (column.id !== 'account' || showAccount) && (column.id !== 'token' || token !== null))

    return html`<table class="char-table">
      <thead>
        <tr>
          ${columns.map((column) => this.head(column))}
        </tr>
      </thead>
      <tbody>
        ${repeat(
          rows,
          (row) => row.character.key,
          (row) => this.row(row, showRealm, token)
        )}
      </tbody>
    </table>`
  }

  /** A column's head: a button where the column sorts, so the keyboard reaches it too. */
  private head(column: Column): TemplateResult {
    const tr = this.tr
    const sorted = column.sort === this.sort
    const ascending = this.direction === SortDirection.Asc
    const inner = html`${column.key ? tr.t(column.key) : (seasonToken()?.figure ?? '')}${
      sorted
        ? html`<wt-icon name=${ascending ? 'chevronUp' : 'chevronDown'} size=${IconSize.Xs} class="sort-caret"></wt-icon>`
        : column.sort
          ? html`<wt-icon name="chevronDown" size=${IconSize.Xs} class="sort-hint"></wt-icon>`
          : nothing
    }`
    return html`<th
      class=${classMap({ num: Boolean(column.numeric), sortable: Boolean(column.sort), sorted })}
      aria-sort=${sorted ? (ascending ? 'ascending' : 'descending') : nothing}
    >
      ${
        column.sort
          ? html`<button type="button" class="th-inner" @click=${() => this.headerClick(column)}>${inner}</button>`
          : html`<span class="th-inner">${inner}</span>`
      }
    </th>`
  }

  /**
   * A figure with which way it moved this month. The arrow alone, not a
   * line: a table cell is a number first, and a line under every number
   * would make the column a chart.
   */
  private figure(figure: TableFigure): TemplateResult {
    return html`<span class="table-figure"
      ><wt-format kind=${FormatKind.Whole} .value=${figure.value}></wt-format>${
        figure.change !== 0 ? html`<wt-trend .change=${figure.change} days=${TREND_DAYS} arrow></wt-trend>` : nothing
      }</span
    >`
  }

  /** Something still to do in a cell, or the tick that says there is nothing. The tip is a sentence (the gear's) or rows (the lines'). */
  private openCount(count: number, iconName: IconName, tip: string | ListTip, okTip?: string): TemplateResult {
    return count > 0
      ? html`<span
          class="table-open warn-text"
          data-tip=${isListTip(tip) ? nothing : tip}
          ${listTip(isListTip(tip) ? tip : null)}
          tabindex="0"
          ><wt-icon name=${iconName} size=${IconSize.Xs}></wt-icon> ${count}</span
        >`
      : html`<wt-icon class="ok-text" name="check" size=${IconSize.Xs} data-tip=${okTip ?? nothing}></wt-icon>`
  }

  private row(row: TableRow, showRealm: boolean, token: SeasonCurrency | null): TemplateResult {
    const tr = this.tr
    const { character, state, progress, kills, tasks, gear, word, chip, step } = row
    const { levelling, unclaimed, inactive } = state
    const { region, showAccount } = this
    // A character still levelling holds none worth a count.
    const amount = levelling ? null : tokenAmount(character)
    return html`<tr class=${classMap({ stale: inactive, claim: unclaimed, levelling, 'hidden-char': row.hidden })}>
      <td>
        <!-- A flex row, so the mark, the name and the trailing notes
             share one centre line instead of a text baseline. -->
        <div class="table-identity">
          <wt-class-medallion .character=${character} size="22"></wt-class-medallion>
          <wt-button
            class="char-open table-name"
            label=${character.name}
            style=${styleMap({ color: classColor(character.classToken) ?? '' })}
            data-tip=${tr.t('detail.open')}
            @click=${() => this.emit('wt-open-character', character.key)}
          ></wt-button>
          ${levelling ? html`<span class="faint tiny table-note">${tr.t('card.level', { level: character.level })}</span>` : nothing}
          ${showRealm ? html`<span class="faint tiny table-note">${character.realm}</span>` : nothing}
        </div>
      </td>
      ${showAccount ? html`<td class="tiny muted">${accountsOf(character).join(', ')}</td>` : nothing}
      <td class="num">${this.figure(row.itemLevel)}</td>
      <td class="num">${this.figure(row.rating)}</td>
      <td>
        ${
          character.keystone
            ? // Which dungeon it is decides whether tonight's key is worth
              // running, so it belongs on the row rather than in a tooltip
              // - abbreviated, because the column sits between two numbers.
              html`<wt-chip
                tone=${Tint.Key}
                icon="keystone"
                .label=${`+${character.keystone.level}`}
                .note=${character.keystone.name ? keystoneShort(character.keystone.name) : undefined}
                data-tip=${character.keystone.name || tr.t('keystone.generic')}
              ></wt-chip>`
            : html`<wt-format class="faint"></wt-format>`
        }
      </td>
      <td>
        ${
          levelling || progress.vaultTotal === 0
            ? html`<wt-format class="faint"></wt-format>`
            : html`<div class="table-vault">
                <span class="table-vault-count"
                  ><wt-format .value=${progress.vaultUnlocked}></wt-format>/<wt-format .value=${progress.vaultTotal}></wt-format
                ></span>
                <wt-bar percent=${progress.ratio * 100}></wt-bar>
              </div>`
        }
      </td>
      ${
        token
          ? html`<td class="num" data-tip=${token.name}>
              ${amount === null ? html`<wt-format class="faint"></wt-format>` : html`<wt-format .value=${amount}></wt-format>`}
            </td>`
          : nothing
      }
      <td class="num">
        ${character.mythicRuns.length > 0 ? html`<wt-format .value=${character.mythicRuns.length}></wt-format>` : html`<wt-format class="faint"></wt-format>`}
      </td>
      <td class="tiny">
        ${
          row.raidTip === null
            ? html`<wt-format class="faint"></wt-format>`
            : // An unknown total (see the card's chips) shows the kills
              // alone rather than "4/0".
              html`<span ${listTip(row.raidTip)} tabindex="0"
                ><wt-format .value=${kills.defeated}></wt-format>${
                  kills.total > 0 ? html`/<wt-format .value=${kills.total}></wt-format>` : nothing
                }</span
              >`
        }
      </td>
      <td class="tiny">${tasks ? this.openCount(tasks.open, 'scroll', tasks.tip) : html`<wt-format class="faint"></wt-format>`}</td>
      <td class="tiny">
        ${!gear.known || levelling ? html`<wt-format class="faint"></wt-format>` : this.openCount(gear.issues, 'shield', row.gearTip, tr.t('table.gearOk'))}
      </td>
      <td class="tiny">
        <!-- The pill says the week's state; past that, the cell names the
             step the plan picks, the way the tile and the card do. The level
             is already on the name, so a levelling row shows a dash instead. -->
        ${
          word === StateWord.Levelling
            ? html`<wt-format class="faint"></wt-format>`
            : chip
              ? html`<wt-chip
                  tone=${chip.tone ?? nothing}
                  icon=${chip.icon ?? nothing}
                  label=${chip.label}
                  data-tip=${chip.tip ?? nothing}
                ></wt-chip>`
              : html`<wt-step-note class="gap-note" .step=${step} size=${IconSize.Xs}></wt-step-note>`
        }
      </td>
      <td class="num"><wt-format kind=${FormatKind.Gold} .value=${character.money}></wt-format></td>
      <td class="num tiny muted"><wt-format kind=${FormatKind.Played} .value=${character.playedTotal}></wt-format></td>
      <td class="tiny muted"><wt-format kind=${FormatKind.Relative} .value=${character.weeklyUpdatedAt}></wt-format></td>
      <td>
        <wt-character-links .character=${character} region=${region} place=${Place.Table} size="17"></wt-character-links>
      </td>
    </tr>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-character-table': WtCharacterTable
  }
}
