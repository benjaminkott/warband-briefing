import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import { WtElement } from '../element'
import { lineColor, type GameTip } from '../model/gameTip'

/**
 * A tooltip as the game draws it: the client's lines one under the other,
 * a right text on the same line as its left one, each in the colour the
 * client gave it, and a note under them in the app's own voice. The first
 * line is the item's name, in the quality's colour, and reads as the
 * heading. `wt-tip-layer` puts it inside its `wt-tip` when the pointer
 * rests on a host with a game tip; the tip's surface is dark in both
 * themes, since the client's colours were chosen for one (`.game-tip` in
 * the stylesheet).
 */
@customElement('wt-game-tip')
export class WtGameTip extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: block;
      min-width: 180px;
      max-width: 320px;
      font-size: var(--fs-tiny);
      line-height: var(--lh-text);
      color: var(--game-tip-text);
    }
    .line {
      display: flex;
      justify-content: space-between;
      gap: var(--s4);
      white-space: pre-line;
    }
    .line:first-child {
      font-size: var(--fs-base);
      font-weight: 600;
    }
    /* A blank line is the gap the game leaves between the parts of a tooltip. */
    .line.blank {
      height: 0.6em;
    }
    .right {
      text-align: right;
      flex: none;
    }
    .note {
      display: block;
      margin-top: var(--s2);
      padding-top: var(--s1);
      border-top: 1px solid var(--game-tip-line);
      color: var(--game-tip-text-dim);
      white-space: pre-line;
    }
  `

  @property({ attribute: false }) accessor tip: GameTip | null = null

  protected override render(): TemplateResult {
    const tip = this.tip
    if (!tip) return html`${nothing}`
    return html`${tip.lines.map((line) => {
      const left = lineColor(line.leftColor)
      const right = lineColor(line.rightColor)
      return html`<div class=${classMap({ line: true, blank: !line.left && !line.right })}>
        ${line.left ? html`<span class="left" style=${left ? styleMap({ color: left }) : nothing}>${line.left}</span>` : nothing}
        ${line.right ? html`<span class="right" style=${right ? styleMap({ color: right }) : nothing}>${line.right}</span>` : nothing}
      </div>`
    })}${tip.note ? html`<span class="note">${tip.note}</span>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-game-tip': WtGameTip
  }
}
