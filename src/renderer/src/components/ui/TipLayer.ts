import { html, nothing, type TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { keyed } from 'lit/directives/keyed.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import { WtElement } from '../../element'
import type { GameTip } from '../../model/gameTip'
import type { ListTip, ListTipHost } from '../../model/listTip'
import './Tip'
import './ListTip'
import '../GameTip'

/** How long the pointer rests on something before its tip shows. */
const SHOW_DELAY = 450
/** After a tip closed, the next one opens at once for this long: reading a row of chips is one gesture, not five waits. */
const WARM_FOR = 300
/** Between the target's edge and the tip. */
const OFFSET = 6
/** The tip keeps this much to the window's edge. */
const MARGIN = 8

/** The `id` the tip carries so the target can point at it. */
const TIP_ID = 'wt-tip-layer-tip'

/**
 * The box of what the pointer is on. A host that is `display: contents`
 * (a `wt-button`) has no box of its own, so its children's boxes stand in
 * for it.
 */
function anchorRect(target: Element): DOMRect {
  const rect = target.getBoundingClientRect()
  if (rect.width > 0 || rect.height > 0 || target.children.length === 0) return rect
  let box: DOMRect | null = null
  for (const child of target.children) {
    const own = anchorRect(child)
    if (own.width === 0 && own.height === 0) continue
    if (!box) box = own
    else {
      const left = Math.min(box.left, own.left)
      const top = Math.min(box.top, own.top)
      box = new DOMRect(left, top, Math.max(box.right, own.right) - left, Math.max(box.bottom, own.bottom) - top)
    }
  }
  return box ?? rect
}

/** The lines a host with `data-game-tip` carries, off its `gameTip` property. */
function gameTipOf(target: Element): GameTip | null {
  return target instanceof WtElement && target.hasAttribute('data-game-tip') ? target.gameTip : null
}

/** The rows a host with `data-list-tip` carries, off its `listTip` property - a `wt-*` host's setter or the `listTip()` directive put both on. */
function listTipOf(target: Element): ListTip | null {
  return target.hasAttribute('data-list-tip') ? ((target as ListTipHost).listTip ?? null) : null
}

/**
 * The app's tooltips, in place of the browser's. Anything with a `data-tip`
 * says its text when the pointer rests on it or the keyboard lands on it:
 * this element listens on the document, and draws one `wt-tip` under the
 * thing - or over it when there is no room beneath - in a layer over the
 * page. One element for the whole window, rendered by the shell; nothing
 * else has to know it exists. A host with a game tip (`data-game-tip`,
 * the lines on its `gameTip`) gets a `wt-game-tip` in the same place: an
 * item's tooltip as the client draws it. A host with a list tip
 * (`data-list-tip`, the rows on its `listTip`) gets a `wt-list-tip`: a
 * heading over rows of label and value.
 *
 * The browser's own bubble is slow, plain and outside the theme; this one
 * wears the tokens, breaks its lines where the text does, and opens at
 * once while the pointer is moving from one tip to the next.
 */
@customElement('wt-tip-layer')
export class WtTipLayer extends WtElement {
  /** What the tip is about, while it shows. */
  @state() accessor target: Element | null = null
  /** The tip stands over the target when it would not fit beneath. */
  @state() accessor above = false

  private timer: ReturnType<typeof setTimeout> | undefined
  /** When the last tip closed, for the warm window. */
  private closedAt = 0
  /** The target the pointer is on, shown or waiting to. */
  private pending: Element | null = null

  override connectedCallback(): void {
    super.connectedCallback()
    this.hostClasses({ 'tip-layer': true })
    document.addEventListener('pointerover', this.onOver)
    document.addEventListener('pointerout', this.onOut)
    document.addEventListener('pointerdown', this.hide, true)
    document.addEventListener('focusin', this.onFocus)
    document.addEventListener('focusout', this.onBlur)
    document.addEventListener('keydown', this.onKey)
    // The target moves under a fixed tip: close rather than follow.
    document.addEventListener('scroll', this.hide, true)
    window.addEventListener('blur', this.hide)
    window.addEventListener('resize', this.hide)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('pointerover', this.onOver)
    document.removeEventListener('pointerout', this.onOut)
    document.removeEventListener('pointerdown', this.hide, true)
    document.removeEventListener('focusin', this.onFocus)
    document.removeEventListener('focusout', this.onBlur)
    document.removeEventListener('keydown', this.onKey)
    document.removeEventListener('scroll', this.hide, true)
    window.removeEventListener('blur', this.hide)
    window.removeEventListener('resize', this.hide)
    this.hide()
  }

  /** The nearest thing with a tip around what an event hit, if any. */
  private tipOf(node: EventTarget | null): Element | null {
    if (!(node instanceof Element)) return null
    const target = node.closest('[data-tip], [data-game-tip], [data-list-tip]')
    return target && (target.getAttribute('data-tip') || gameTipOf(target) || listTipOf(target)) ? target : null
  }

  private onOver = (event: PointerEvent): void => {
    const target = this.tipOf(event.target)
    if (target === this.pending) return
    if (!target) return this.hide()
    this.pending = target
    clearTimeout(this.timer)
    // Warm: a tip has just closed, the pointer is reading its way along.
    if (this.target || Date.now() - this.closedAt < WARM_FOR) this.show(target)
    else this.timer = setTimeout(() => this.show(target), SHOW_DELAY)
  }

  private onOut = (event: PointerEvent): void => {
    // Leaving for a child of the same target is not leaving.
    if (this.pending && event.relatedTarget instanceof Node && this.pending.contains(event.relatedTarget)) return
    if (this.tipOf(event.target) === this.pending) this.hide()
  }

  private onFocus = (event: FocusEvent): void => {
    const target = this.tipOf(event.target)
    // Only a keyboard focus; a click already had the pointer's tip, and
    // a focus that follows a click would bring the tip straight back.
    if (!target || !(event.target as Element).matches(':focus-visible')) return
    this.pending = target
    clearTimeout(this.timer)
    this.show(target)
  }

  private onBlur = (event: FocusEvent): void => {
    if (this.tipOf(event.target) === this.pending) this.hide()
  }

  private onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide()
  }

  private show(target: Element): void {
    this.timer = undefined
    if (!target.isConnected) return this.hide()
    this.above = false
    this.target = target
    target.setAttribute('aria-describedby', TIP_ID)
  }

  private hide = (): void => {
    clearTimeout(this.timer)
    this.timer = undefined
    this.pending = null
    if (!this.target) return
    this.target.removeAttribute('aria-describedby')
    this.target = null
    this.closedAt = Date.now()
  }

  protected override async updated(): Promise<void> {
    // Measured below first, once the tip has drawn its text; flipped above
    // when the window ends before the tip does. Both the tip's render and
    // the flip are microtasks of the same task, so nothing shows in between.
    const target = this.target
    if (!target || this.above) return
    const tip = this.querySelector('wt-tip')
    if (!tip) return
    await tip.updateComplete
    if (this.target !== target) return
    if (tip.getBoundingClientRect().bottom > document.documentElement.clientHeight - MARGIN) this.above = true
  }

  protected override render(): TemplateResult {
    const text = this.target?.getAttribute('data-tip')
    const game = this.target ? gameTipOf(this.target) : null
    const list = this.target ? listTipOf(this.target) : null
    if (!this.target || !(text || game || list)) return html`${nothing}`
    const rect = anchorRect(this.target)
    const style = this.above
      ? { left: `${rect.left + rect.width / 2}px`, bottom: `${document.documentElement.clientHeight - rect.top + OFFSET}px` }
      : { left: `${rect.left + rect.width / 2}px`, top: `${rect.bottom + OFFSET}px` }
    // A fresh tip per target: the shift it works out for itself is for one
    // spot, and must not carry over to the next target with the same text.
    return html`${keyed(
      this.target,
      html`<wt-tip id=${TIP_ID} class=${classMap({ 'hover-tip': true, 'game-tip': game !== null })} role="tooltip" style=${styleMap(style)}
        >${game ? html`<wt-game-tip .tip=${game}></wt-game-tip>` : list ? html`<wt-list-tip .tip=${list}></wt-list-tip>` : text}</wt-tip
      >`
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-tip-layer': WtTipLayer
  }
}
