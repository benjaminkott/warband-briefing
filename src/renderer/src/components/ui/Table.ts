import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classes, WtElement } from '../../element'
import { TableKind } from '../../enums/tableKind'

export interface TableColumn {
  label: string
  /** A figure column, right-aligned in tabular figures. */
  num?: boolean
  className?: string
}

/**
 * The two tables of the app: the settings' plain list - quests, goals, a
 * remove button at the end of each row - and the character page's table,
 * which sits in a scroll box that keeps it from widening its panel. The
 * head is drawn from the columns, or left out when there are none. The
 * rows are the table's children, each a `wt-row` of `wt-cell`s: the
 * parser drops a `tr` that is not inside a `table`, so the rows are
 * elements of their own and take their place in the table's flat tree.
 * The table is a CSS table of divs, not a `table` element: Chromium lays
 * rows slotted into a `tbody` out beside the table, not in it, while a
 * `display: table-row-group` box takes them and shares its columns with
 * the head. The roles say what the divs are. The table and its head are
 * the table's own stylesheet; the cells are in the light DOM, so their
 * rules are in `styles.css`, keyed on the tag and the kind
 * (`wt-table[kind='detail'] wt-cell`).
 */
@customElement('wt-table')
export class WtTable extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: block;
    }

    /* Wider than the panel with a season's worth of dungeons; the panel
       never grows to fit, the table scrolls inside it. */
    :host([kind='detail']) {
      overflow-x: auto;
    }

    .table {
      display: table;
      width: 100%;
      border-collapse: collapse;
    }

    .head {
      display: table-header-group;
    }

    .row {
      display: table-row;
    }

    .body {
      display: table-row-group;
    }

    :host([kind='plain']) .table {
      font-size: var(--fs-base);
      margin-bottom: var(--s3);
    }

    /* A plain table: text to the left, figures to the right, a hairline
       between rows. Unlike the dashboard's matrix nothing here is a heat
       map, so the cells carry no colour of their own - only a word does. */
    :host([kind='detail']) .table {
      font-size: var(--fs-base);
      font-variant-numeric: tabular-nums;
    }

    ::slotted(wt-row) {
      display: table-row;
    }

    /* The app's uppercase caption, as every table head sets it. */
    .th {
      display: table-cell;
      text-align: left;
      vertical-align: middle;
      border-bottom: 1px solid var(--border);
      font-size: var(--fs-tiny);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: var(--track-caps);
      color: var(--text-faint);
    }

    :host([kind='plain']) .th {
      padding: var(--s2);
    }

    :host([kind='detail']) .th {
      padding: var(--s1) var(--s2);
      white-space: nowrap;
      vertical-align: top;
      font-size: var(--fs-micro);
    }

    :host([kind='detail']) .th:first-child {
      padding-left: 0;
    }

    :host([kind='detail']) .th:last-child {
      padding-right: 0;
    }

    :host([kind='detail']) .th.num {
      text-align: right;
    }

    /* The widths the settings' columns take; a cell of the same class
       follows in styles.css. */
    .th.row-action {
      width: 44px;
      text-align: right;
    }

    .th.col-profession,
    .th.col-gear,
    .th.col-keys {
      width: 1%;
      white-space: nowrap;
    }

    .th.col-gear {
      text-align: center;
    }

    .th.col-id {
      width: 110px;
    }
  `

  @property({ reflect: true }) accessor kind: TableKind = TableKind.Plain
  @property({ attribute: false }) accessor columns: TableColumn[] | null = null

  protected override render(): TemplateResult {
    const columns = this.columns
    return html`<div class="table" role="table">
      ${
        columns
          ? html`<div class="head" role="rowgroup">
              <div class="row" role="row">
                ${columns.map(
                  (column) =>
                    html`<div class=${classes('th', column.num && 'num', column.className)} role="columnheader">${column.label}</div>`
                )}
              </div>
            </div>`
          : nothing
      }
      <div class="body" role="rowgroup"><slot></slot></div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-table': WtTable
  }
}
