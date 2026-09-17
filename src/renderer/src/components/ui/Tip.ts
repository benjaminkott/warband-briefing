import { css, html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'

/**
 * The floating tip: a small raised surface with a text about the element
 * under the pointer, for example a value on the gold chart or a row of the
 * vault ring. The text is the tip's children. The parent sets the position
 * (`left`, `top`, or `bottom`). The tip centres itself on that point. When
 * the centred position puts a part of the tip outside the window, the tip
 * moves back in, for example at a ring at the left edge of the dashboard
 * rows. The surface is the tip's own stylesheet; a class of the parent on
 * the host adds to it (`hover-tip` for the reading size of a tooltip), and
 * an element that draws a tip inside its own shadow root places it there.
 */
@customElement('wt-tip')
export class WtTip extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      position: absolute;
      z-index: 2;
      transform: translateX(calc(-50% + var(--tip-shift, 0px)));
      /* Sized by the text, not by the room to the right of the point: an
         absolute box with only a left would shrink at the window's edge and
         wrap a short tip before the shift moves it back in. */
      width: max-content;
      padding: var(--s2);
      background: var(--bg-float);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-lift);
      color: var(--text);
      white-space: nowrap;
      pointer-events: none;
    }
  `

  // A slotted element (`wt-list-tip`, `wt-game-tip`) draws after the tip
  // has: the tip is measured again when its size changes, so the shift is
  // for the box the content fills, not the empty one.
  private readonly sizer = new ResizeObserver(() => this.place())

  override connectedCallback(): void {
    super.connectedCallback()
    this.sizer.observe(this)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.sizer.disconnect()
  }

  protected override updated(): void {
    this.place()
  }

  /** Moves the tip back into the window where the centred position leaves it. */
  private place(): void {
    // Measure from the centred position, so the shift for the last content
    // does not change the measurement for the next.
    this.hostVar('--tip-shift', null)
    const margin = 8
    const rect = this.getBoundingClientRect()
    const shift = Math.max(margin - rect.left, 0) || Math.min(document.documentElement.clientWidth - margin - rect.right, 0)
    this.hostVar('--tip-shift', shift ? `${Math.round(shift)}px` : null)
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-tip': WtTip
  }
}
