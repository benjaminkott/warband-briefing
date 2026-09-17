import { nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { classColor, type ClassToken } from '../../enums/classToken'

/**
 * The card: the one raised box of the app. A character card, a figure tile,
 * a settings panel, the table's frame - each says what goes inside; the
 * surface itself is this element. The host is the `.card`, so the parent's
 * class adds to it and `.dash > .card` keeps matching.
 *
 * The content is the card's children: a template, other elements, plain
 * markup - anything, without a property for it. The card is the one element
 * with a shadow root, and that root holds nothing but the slot the children
 * fall into. The children themselves stay in the light DOM, so the one
 * `styles.css` keeps applying to them.
 *
 * A card that leads somewhere (`link`) gets the pointer, the hover and the
 * sweep on its edge, the same on every way in. A card about a character
 * takes the character's class as its `color` and paints its edge in that
 * class's colour: the sweep, the band on the left. The element that is a
 * card extends this one and fills `link` and `color` in from its own data;
 * what it renders goes into the light DOM as well and falls into the slot.
 */
@customElement('wt-card')
export class WtCard extends WtElement {
  /** The card opens something: a view, a character, its own body. */
  @property({ type: Boolean }) accessor link = false
  /** The class whose colour the edge takes; the accent when there is none. */
  @property() accessor color: ClassToken | undefined = undefined

  /**
   * The shadow root is the slot only. What the element renders goes into the
   * light DOM, where the children given by the parent already are, so both
   * fall into the slot and `styles.css` reaches both. It renders in front of
   * those children: a panel's head sits above the body it was given. A card
   * that owns its inside and takes its parts through named slots - the stat
   * tile - says `static shadow = true` and renders into a root of its own;
   * the surface stays the host's, from `.card` in `styles.css`.
   */
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    if ((this.constructor as typeof WtElement).shadow) return super.createRenderRoot()
    this.attachShadow({ mode: 'open' }).append(document.createElement('slot'))
    this.renderOptions.renderBefore = this.firstChild
    return this
  }

  protected override willUpdate(): void {
    this.hostClasses({ card: true, 'card-link': this.link })
    // The stylesheet reads the colour where it draws the edge, so it is a
    // custom property on the host, not a style on one part.
    this.hostVar('--class-color', classColor(this.color))
  }

  protected override render(): TemplateResult | typeof nothing {
    return nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-card': WtCard
  }
}
