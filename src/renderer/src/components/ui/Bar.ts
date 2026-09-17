import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { WtElement } from '../../element'
import { BarKind } from '../../enums/barKind'

/**
 * A progress bar: a track and the share of it that is filled, in percent.
 * The vault count, a renown level, the reset countdown and the xp of a
 * levelling character all draw the same shape. The host is the track, and
 * the track, the fill and the three kinds are the bar's own stylesheet, so
 * a bar inside another element's root looks the same as one on the page.
 * Where a bar sits - as a column of a row, at the foot of a tile - is the
 * parent's rule in `styles.css`, keyed on the tag. A parent colours the
 * fill of a slot bar with `--bar-fill`, as the vault does for a slot that
 * is in.
 */
@customElement('wt-bar')
export class WtBar extends WtElement {
  static override shadow = true

  static override styles = css`
    /* A progress bar, wherever one sits: under a figure, in a table cell,
       across a list row. The callers only ever zero the margin. */
    :host {
      display: block;
      position: relative;
      height: var(--s1);
      margin-top: var(--s2);
      background: var(--border);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }

    .fill {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-bright));
      border-radius: var(--radius-pill);
      transition: width 0.25s;
    }

    :host([warn]) .fill {
      background: linear-gradient(90deg, var(--warn), var(--warn-text));
    }

    /* Rested xp: a band that starts where the fill ends. */
    .rested {
      position: absolute;
      top: 0;
      height: 100%;
      background: var(--accent-line);
    }

    /* Renown and concentration: the bar inside a chip is the way to the
       next level, set after the label in the chip's line. */
    :host([kind='chip-bar']) {
      display: inline-block;
      width: var(--s7);
      height: var(--s1);
      margin: 0 0 0 var(--s0);
      background: var(--border-strong);
    }

    :host([kind='chip-bar']) .fill {
      background: var(--accent);
    }

    /* The bar the vault draws under a slot: dim while the row is filling,
       lit in the class of the reward once the slot is in. */
    :host([kind='slot-bar']) {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: var(--s0);
      margin: 0;
      background: var(--slot-track);
      border-radius: 0;
    }

    :host([kind='slot-bar']) .fill {
      background: var(--bar-fill, var(--text-faint));
      border-radius: 0;
      transition: width 0.18s;
    }
  `

  @property({ type: Number }) accessor percent = 0
  @property({ reflect: true }) accessor kind: BarKind = BarKind.Bar
  /** The fill in the warning ink - a concentration bar at its cap. */
  @property({ type: Boolean, reflect: true }) accessor warn = false
  /**
   * Rested xp as a share of the level, in percent: a band that starts where
   * the fill ends and stops at the end of the track. The bar knows how the
   * band rides on it; the card only says how much of each there is.
   */
  @property({ type: Number }) accessor rested = 0

  protected override render(): TemplateResult {
    const { percent, rested } = this
    const width = `${Math.round(Math.max(0, Math.min(percent, 100)))}%`
    return html`<span class="fill" style=${styleMap({ width })}></span>${
        rested > 0
          ? html`<span class="rested" style=${styleMap({ left: `${percent}%`, width: `${Math.min(rested, 100 - percent)}%` })}></span>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-bar': WtBar
  }
}
