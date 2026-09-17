import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtCard } from './ui/Card'
import type { IconName } from './Icon'
import { Severity } from '../enums/severity'
import { Tint } from '../enums/tint'
import { StatKind } from '../enums/statKind'
import './ui/Bar'
import './ui/Format'
import './ui/Trend'
import './Icon'
import { IconSize } from '../enums/iconSize'

/** Colours the figure: gold for gold, the warning ink for what needs doing. */
export type StatTone = Tint.Gold | Severity.Warn

export const STAT_TONES: readonly StatTone[] = [Tint.Gold, Severity.Warn]

/** One figure of a duration with its unit - "3d 14h" is two of these. */
export interface FigurePart {
  value: number
  unit: string
}

/**
 * What a tile can show as its figure: a number, which the tile formats
 * itself, the parts of a duration, or - for the rare text figure ("now") -
 * a string. A figure that is an element (a rated score) is a child in the
 * `value` slot.
 */
export type Figure = FigurePart[] | number | string

/** How the figure moved: the change, and the days it took when known. */
export interface StatTrend {
  change: number
  days?: number
}

/**
 * A figure and its caption in a box. Every figure box in the app is this one
 * element, and it formats its own numbers: the figure, an optional "/ of" or
 * unit beside it, the caption with its mark under it, and a third line for
 * a bar, the trend or a quieter note.
 *
 * The parts are attributes where they are plain text - `label`, `foot`,
 * `unit` - and named slots where they are more: a caption with the names
 * of characters in it is a child with `slot="label"`, a note with a mark
 * a child with `slot="foot"`, a figure that is an element a child with
 * `slot="value"`. The tile renders into a shadow root of its own and holds
 * the rules of its parts; the surface is the host's `.card`, and the one
 * state that recolours the surface (`claim`) is the sheet's rule on the
 * host, since `.card` sets the border there.
 *
 * A box that leads somewhere (`link`) behaves like a button - the same box,
 * plus a pointer, a tab stop and the keys - and raises a plain `click`. A
 * box about a reward that is lost at the reset (`claim`) is coloured whole,
 * like the character tile; `tone` colours the figure alone.
 */
@customElement('wt-stat-tile')
export class WtStatTile extends WtCard {
  static override shadow = true

  static override styles = css`
    /* One card wherever a figure sits in one - the summary bar, the gold
       view, the board - with the padding of the character tile. The box
       has no height of its own: the row stretches every tile to its
       tallest, and a tile fills that from both ends - the figure and its
       caption at the top, the bar or the note at the foot - so a row
       without third lines stays flat and one with them lines them up. */
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
      min-width: 0;
      min-height: 0;
      padding: var(--pad);
    }

    .value {
      display: inline-flex;
      align-items: baseline;
      gap: var(--s2);
      font-size: var(--fs-figure-lg);
      font-weight: 600;
      line-height: var(--lh-none);
      letter-spacing: var(--track-tight);
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    :host([tone='gold']) .value {
      color: var(--gold);
    }

    :host([tone='warn']) .value {
      color: var(--warn-text);
    }

    :host([claim]) .value,
    :host([claim]) .label {
      color: var(--warn-text);
    }

    /* The whole a figure is part of ("/ 27") and a unit ("3d 14h",
       "2.324.008 G") step down beside the figure; the digits stay in the
       tile type. A figure and its unit are one word, so the unit sits at
       the same distance whether the figure stands alone or is one half of
       a duration. */
    .of,
    .unit {
      font-size: var(--fs-body);
      font-weight: 500;
      letter-spacing: 0;
      color: var(--text-faint);
    }

    .of {
      font-variant-numeric: tabular-nums;
    }

    .figure {
      white-space: nowrap;
    }

    .unit {
      margin-left: var(--s1);
    }

    /* One line, cut with an ellipsis rather than wrapped, so the caption
       can never push the foot out of a box whose height is not its own. */
    .label {
      font-size: var(--fs-tiny);
      line-height: var(--s5);
      color: var(--text-dim);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .label > wt-icon {
      margin-right: var(--s2);
    }

    /* The third line sits at the foot whatever the row's height, so the
       bars and notes of a row line up with each other. The bar is lifted
       to the middle of the note line a neighbour has in its place. */
    wt-bar {
      margin-top: auto;
      margin-bottom: var(--s2);
    }

    .foot {
      display: flex;
      align-items: center;
      gap: var(--s2);
      margin-top: auto;
      font-size: var(--fs-tiny);
      line-height: var(--s5);
      color: var(--text-faint);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* The trend the way the card band draws it under its figures. */
    wt-trend {
      font-weight: 500;
    }

    /* The cell is the one kind that is no box: the hero band draws it
       bare, wide enough for any of its figures, so item level, score and
       gold sit at the same three x-positions from page to page. The
       caption is the app's uppercase caption, one notch smaller. */
    :host([kind='cell']) {
      min-width: 76px;
      padding: 0;
      gap: 0;
      line-height: var(--lh-tight);
    }

    :host([kind='cell']) .value {
      display: block;
      font-weight: 500;
      line-height: inherit;
      letter-spacing: var(--track-tight);
    }

    :host([kind='cell']) .label {
      display: flex;
      align-items: center;
      gap: var(--s1);
      margin-top: var(--s1);
      font-size: var(--fs-micro);
      font-weight: 600;
      line-height: inherit;
      text-transform: uppercase;
      letter-spacing: var(--track-caps);
      color: var(--text-faint);
    }

    :host([kind='cell']) .label > wt-icon {
      margin-right: 0;
    }
  `

  @property({ reflect: true }) accessor kind: StatKind = StatKind.Tile
  @property() accessor icon: IconName | undefined = undefined
  /** The caption; a richer one is a child in the `label` slot. */
  @property() accessor label: string | undefined = undefined
  @property({ attribute: false }) accessor value: Figure = ''
  /** The whole the figure is a part of - "/ 27"; a number is formatted like the figure. */
  @property({ attribute: false }) accessor of: number | string | undefined = undefined
  /** The unit of a single figure, stepped down beside it - "2.324.008 G". */
  @property() accessor unit: string | undefined = undefined
  /** 0..1, drawn as a bar in the third line. */
  @property({ type: Number }) accessor bar: number | undefined = undefined
  /** How the figure moved, drawn in the third line as an arrow and the change. */
  @property({ attribute: false }) accessor trend: StatTrend | undefined = undefined
  /** A quieter note in the third line, after the trend if there is one; a richer one is a child in the `foot` slot. */
  @property() accessor foot: string | undefined = undefined
  @property({ reflect: true }) accessor tone: StatTone | undefined = undefined
  @property({ type: Boolean, reflect: true }) accessor claim = false

  constructor() {
    super()
    this.addEventListener('keydown', (event) => {
      if (!this.link || (event.key !== 'Enter' && event.key !== ' ')) return
      event.preventDefault()
      this.click()
    })
  }

  protected override willUpdate(): void {
    const tile = this.kind === StatKind.Tile
    super.willUpdate()
    // The cell is the one kind that is no box: the hero band draws it bare.
    this.hostClasses({ card: tile, 'card-link': tile && this.link })
    if (this.link) {
      this.setAttribute('role', 'button')
      this.tabIndex = 0
    } else {
      this.removeAttribute('role')
      this.removeAttribute('tabindex')
    }
  }

  /** A figure and its unit as one word, so the unit sits at one distance everywhere. */
  private word(value: TemplateResult | string, unit: string | undefined): TemplateResult {
    return html`<span class="figure">${value}${unit ? html`<span class="unit">${unit}</span>` : nothing}</span>`
  }

  private figure(): TemplateResult | TemplateResult[] | string {
    const { value, unit } = this
    if (Array.isArray(value)) return value.map((part) => this.word(html`<wt-format .value=${part.value}></wt-format>`, part.unit))
    const text = typeof value === 'number' ? html`<wt-format .value=${value}></wt-format>` : value
    return unit ? this.word(text, unit) : text
  }

  protected override render(): TemplateResult {
    const { trend, of } = this
    // The third line is in the tree when a foot was given as a child too:
    // a slot only takes what is there, so the line is drawn whenever the
    // tile has a trend or a foot of either kind.
    const third = trend !== undefined || this.foot !== undefined || this.querySelector('[slot="foot"]') !== null
    return html`
      <div class="value">
        <slot name="value">${this.figure()}</slot>
        ${
          of !== undefined
            ? html`<span class="of">/ ${typeof of === 'number' ? html`<wt-format .value=${of}></wt-format>` : of}</span>`
            : nothing
        }
      </div>
      <div class="label">
        ${this.icon ? html`<wt-icon name=${this.icon} size=${IconSize.Xs}></wt-icon>` : nothing}<slot name="label">${this.label}</slot>
      </div>
      ${this.bar !== undefined ? html`<wt-bar percent=${this.bar * 100}></wt-bar>` : nothing}
      ${
        third
          ? html`<div class="foot">
              ${trend ? html`<wt-trend .change=${trend.change} .days=${trend.days}></wt-trend>` : nothing}<slot name="foot"
                >${this.foot}</slot
              >
            </div>`
          : nothing
      }
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-stat-tile': WtStatTile
  }
}
