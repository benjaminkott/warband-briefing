import { html, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { WtElement } from '../element'
import { HostDisplay } from '../enums/hostDisplay'
import { IconKind } from '../../../shared/enums/iconKind'

/**
 * The game's own icon of a thing: an item, a currency, a recipe, a
 * profession, a class. The host is the `.game-icon` box, the picture fills
 * it. The address names what the thing is and its id
 * (`wt-icon://item/274374`); the main process resolves it through the
 * lexicon (`icons.ts`) and answers with the picture, or with nothing - and
 * with nothing the element takes no room, so a name without an icon stands
 * where it stood. Until the picture is there the host is a quiet square
 * in its place (the `loading` class): the text does not move when the
 * picture arrives, and a reader sees that one is on its way.
 *
 * Storybook has no main process: `WtGameIcon.resolve` is where its mock
 * puts a resolver of its own.
 */
@customElement('wt-game-icon')
export class WtGameIcon extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  /** The address of an icon; the app's is the scheme the main process answers. */
  static resolve: (kind: IconKind, ref: string | number) => string = (kind, ref) => `wt-icon://${kind}/${ref}`

  @property() accessor kind: IconKind = IconKind.Item
  /** The id of the thing, or the class token; none draws nothing. */
  @property() accessor ref: string | number | null = null
  /** A length; a bare number is pixels. */
  @property() accessor size: number | string = '1em'
  /** The address that came back with nothing; the element hides until the address changes. */
  @state() private accessor failed: string | null = null
  /** The address whose picture is there. */
  @state() private accessor loaded: string | null = null

  private get src(): string | null {
    return this.ref === null || this.ref === '' ? null : WtGameIcon.resolve(this.kind, this.ref)
  }

  protected override willUpdate(): void {
    const src = this.src
    this.hostClasses({
      'game-icon': true,
      loading: src !== null && src !== this.loaded && src !== this.failed,
      ready: src !== null && src === this.loaded
    })
    // An attribute is a string; a bare number in it is still pixels.
    this.hostVar('--icon-size', /^\d+(\.\d+)?$/.test(String(this.size)) ? `${this.size}px` : String(this.size))
    this.hostPresent(src !== null && src !== this.failed)
  }

  protected override render(): TemplateResult {
    const src = this.src
    if (src === null) return html``
    return html`<img src=${src} alt="" aria-hidden="true" @load=${() => (this.loaded = src)} @error=${() => (this.failed = src)} />`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-game-icon': WtGameIcon
  }
}
