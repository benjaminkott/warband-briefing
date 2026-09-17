import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'
import { dungeonScoreColor, ratingColor, ratingStyle, type DungeonMatrix, type MatrixRow } from '../../model/dashboard'
import { whole } from '../../model/format'
import { keystoneShort } from '../../model/overview'
import { WtElement } from '../../element'
import { classColor } from '../../enums/classToken'
import { FormatKind } from '../../enums/formatKind'
import { MatrixSort } from '../../enums/matrixSort'
import '../ui/Button'
import '../Icon'
import '../ui/Format'
import { IconSize } from '../../enums/iconSize'

/**
 * The roster's season bests, one row per character and one column per
 * dungeon. Read across for a character, down for a dungeon; the faint cell in
 * each row is the key that character should be running next.
 *
 * @fires wt-open-character - A name, with the character's key.
 */
@customElement('wt-best-matrix')
export class WtBestMatrix extends WtElement {
  @property({ attribute: false }) accessor matrix!: DungeonMatrix

  // Which column the rows are ordered by: the total, or one dungeon - "who
  // has the highest Ara-Kara" is the question a column heading gets asked.
  @state() accessor sortBy: MatrixSort | number = MatrixSort.Total

  protected override willUpdate(): void {
    this.hostClasses({ 'matrix-scroll': true })
  }

  private get rows(): MatrixRow[] {
    const sortBy = this.sortBy
    if (sortBy === MatrixSort.Total) return this.matrix.rows
    const level = (row: MatrixRow): number => row.cells.get(sortBy)?.level ?? 0
    return [...this.matrix.rows].sort((a, b) => level(b) - level(a) || b.total - a.total)
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const matrix = this.matrix
    const sortBy = this.sortBy
    const sortMark = (active: boolean): TemplateResult | typeof nothing =>
      active ? html`<wt-icon name="chevronDown" size=${IconSize.Xs} class="sort-caret"></wt-icon>` : nothing

    return html`<table class="matrix">
      <thead>
        <tr>
          <th class="matrix-name"></th>
          ${matrix.dungeons.map(
            (dungeon) =>
              html`<th
                class=${`sortable${sortBy === dungeon.mapChallengeModeId ? ' sorted' : ''}`}
                data-tip=${dungeon.name}
                @click=${() => (this.sortBy = dungeon.mapChallengeModeId)}
              >
                ${keystoneShort(dungeon.name)}${sortMark(sortBy === dungeon.mapChallengeModeId)}
              </th>`
          )}
          <th
            class=${`matrix-total sortable${sortBy === MatrixSort.Total ? ' sorted' : ''}`}
            @click=${() => (this.sortBy = MatrixSort.Total)}
          >
            ${tr.t('dash.matrix.total')}${sortMark(sortBy === MatrixSort.Total)}
          </th>
        </tr>
      </thead>
      <tbody>
        ${repeat(
          this.rows,
          (row) => row.character.key,
          (row) => {
            return html`<tr>
              <td class="matrix-name">
                <wt-button
                  class="char-open matrix-char"
                  label=${row.character.name}
                  style=${styleMap({ color: classColor(row.character.classToken) ?? '' })}
                  data-tip=${tr.t('detail.open')}
                  @click=${() => this.emit('wt-open-character', row.character.key)}
                ></wt-button>
              </td>
              ${matrix.dungeons.map((dungeon) => this.cell(row, dungeon))}
              <td class="matrix-total rated" style=${styleMap(ratingStyle(ratingColor(row.total)) ?? {})}>
                <wt-format kind=${FormatKind.Whole} .value=${row.total}></wt-format>
              </td>
            </tr>`
          }
        )}
      </tbody>
    </table>`
  }

  /** One cell: the level over what the run is worth, coloured by the latter. */
  private cell(row: MatrixRow, dungeon: DungeonMatrix['dungeons'][number]): TemplateResult {
    const tr = this.tr
    const best = row.cells.get(dungeon.mapChallengeModeId)
    const strongest = row.strongest === dungeon.mapChallengeModeId
    if (!best) {
      return html`<td class="matrix-cell empty" data-tip=${`${dungeon.name}: ${tr.t('dash.matrix.missing')}`}>—</td>`
    }
    // Colour by what the run is worth, on the rating's own scale divided by
    // the season's dungeons: 500 points is gold, the share a 4000 rating asks
    // of every dungeon. A run over the timer gets no colour at all, only its
    // points - it counts, but it is not the same run.
    const heat = best.inTime ? dungeonScoreColor(best.score) : null
    return html`<td
      class=${`matrix-cell${best.inTime ? ' timed' : ' overtime'}${strongest ? ' strongest' : ''}${heat ? ' coloured' : ''}`}
      style=${heat ? styleMap({ '--heat': heat }) : nothing}
      data-tip=${[
        tr.t('dash.matrix.cellHint', {
          dungeon: dungeon.name,
          level: best.level,
          state: tr.t(best.inTime ? 'run.timed' : 'dash.matrix.overtime'),
          score: whole(tr, best.score)
        }),
        strongest ? tr.t('dash.matrix.strongestCell') : null
      ]
        .filter(Boolean)
        .join('\n')}
    >
      <!-- The marks sit in the cell's corners, so the level stands at the
           same spot in every cell whether or not there is a mark beside it. -->
      ${!best.inTime ? html`<wt-icon name="clock" size=${IconSize.Xs} class="matrix-clock"></wt-icon>` : nothing}
      ${strongest ? html`<wt-icon name="star" size=${IconSize.Xs} class="matrix-star"></wt-icon>` : nothing}
      <span class="matrix-cell-inner">
        <span class="matrix-level">${best.level}</span>
        <!-- What the run is worth to the rating, under the level. -->
        <wt-format kind=${FormatKind.Whole} .value=${best.score} class="matrix-score"></wt-format>
      </span>
    </td>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-best-matrix': WtBestMatrix
  }
}
