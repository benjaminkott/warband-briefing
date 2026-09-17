import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { classes, hasContent, WtElement, type Content } from '../../element'
import type { IconName } from '../Icon'
import { HostDisplay } from '../../enums/hostDisplay'
import { CONTROL_ICON, ControlSize } from '../../enums/controlSize'
import { Severity } from '../../enums/severity'
import { ButtonRole } from '../../enums/buttonRole'
import '../Icon'

/** What a button says: its role, or the `Danger` severity - a loss it can cause. */
export type ButtonTone = ButtonRole | Severity.Danger

/**
 * The one button. Every clickable control in the app is this, so a primary
 * action looks the same on the setup screen and in the settings, and a mark
 * sits at the same offset before every label.
 *
 * The host is `display: contents`: a custom element cannot be a `<button>`,
 * so the real one sits inside and takes the stylesheet's button rules, while
 * `data-tip` and `disabled` are set on the host. A click bubbles up as itself.
 */
@customElement('wt-button')
export class WtButton extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Contents
  /** Plain text as an attribute, or a template as a property. */
  @property() accessor label: Content = nothing
  @property() accessor icon: IconName | undefined = undefined
  /** The size sets the height, the padding and the mark; a place never sizes the mark itself. */
  @property() accessor size: ControlSize = ControlSize.Md
  /** The tone and the quietness are two axes: a danger button can be filled or quiet, and so can a primary one. */
  @property() accessor tone: ButtonTone = ButtonRole.Default
  /** Quiet text without a box, for an action beside content; the tone only colours it. */
  @property({ type: Boolean }) accessor ghost = false
  /** A mark alone, in the square box. */
  @property({ type: Boolean, attribute: 'icon-only' }) accessor iconOnly = false
  /** The pressed state of a switch in a segmented control. */
  @property({ type: Boolean }) accessor active = false
  @property({ type: Boolean }) accessor disabled = false
  /** The mark spins while the button waits on something. */
  @property({ type: Boolean }) accessor spinning = false
  /** For a button that opens a menu: whether the menu stands open, for assistive tech. */
  @property({ attribute: false }) accessor expanded: boolean | undefined = undefined
  /**
   * The tooltip the parent put on the host, watched so the button re-renders
   * with it: a button with no words of its own is named by its tip, the way
   * a native `title` would have named it.
   */
  @property({ attribute: 'data-tip' }) accessor tip: string | undefined = undefined

  /**
   * The classes a subclass gives its button for its own shape and state -
   * a character tile is a card, a name is a word. A place has no say: what
   * a button looks like in a place is the place's rule on `> button`.
   */
  protected buttonClasses(): Array<string | false | undefined> {
    return []
  }

  /** No words of its own: a mark alone, or nothing at all. */
  private get wordless(): boolean {
    return !hasContent(this.label) || this.label === ''
  }

  protected override render(): TemplateResult {
    return html`<button
      type="button"
      class=${classes(this.tone !== ButtonRole.Default && this.tone, this.size !== ControlSize.Md && this.size, this.ghost && 'ghost', this.iconOnly && 'icon-button', this.active && 'active', ...this.buttonClasses())}
      ?disabled=${this.disabled}
      aria-label=${this.wordless ? (this.tip ?? nothing) : nothing}
      aria-expanded=${this.expanded === undefined ? nothing : String(this.expanded)}
    >
      ${this.icon ? html`<wt-icon name=${this.icon} size=${CONTROL_ICON[this.size]} class=${classMap({ spin: this.spinning })}></wt-icon>` : nothing}${this.label}
    </button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-button': WtButton
  }
}
