import { css, LitElement, nothing, type CSSResultGroup, type CSSResultOrNative, type PropertyValues, type TemplateResult } from 'lit'
import { consume } from '@lit/context'
import { state } from 'lit/decorators.js'
import type { Translator } from '../../shared/i18n'
import { DEFAULT_TRANSLATOR, relativeTime, translatorContext } from './i18n'
import { clockContext } from './clock'
import type { SettingsSection } from './enums/settingsSection'
import type { DetailSection } from './enums/detailSection'
import type { Tab } from './enums/tab'
import type { SortDirection } from './enums/sortDirection'
import type { SortKey } from './enums/sortKey'
import type { ViewMode } from './enums/viewMode'
import type { TaskFilter } from './enums/taskFilter'
import type { TaskGrouping } from './enums/taskGrouping'
import type { GoldRange } from './enums/goldRange'
import { HostDisplay } from './enums/hostDisplay'
import type { GameTip } from './model/gameTip'
import type { ListTip } from './model/listTip'
import type { Hit } from './model/search'

/**
 * Anything a template can hold: a nested template, text, a list of either,
 * or nothing. What a component takes where React took `children` - the
 * elements render into the light DOM, where a `<slot>` does nothing, so
 * content is handed over as a property instead.
 */
export type Content = TemplateResult | string | number | typeof nothing | null | undefined | Content[]

/**
 * Whether there is anything to draw: a property of type `Content` is left
 * out as `nothing`, `null` or `undefined`, and an element that wraps its
 * content in a box must not draw the box around any of those.
 */
export function hasContent(value: Content): boolean {
  return value !== undefined && value !== null && value !== nothing
}

/**
 * The events the elements raise, with what each carries. All of them bubble,
 * so a view listens on the child it rendered and the shell listens on the
 * view - a tile's "open this character" reaches the shell through the board
 * without the board re-raising it.
 */

export interface WtEvents {
  /** A character's page is asked for, by key. */
  'wt-open-character': string
  /** The gold view is asked for. */
  'wt-open-gold': undefined
  /** A hit of the top bar's search picked: a character's page, or the place an item sits. */
  'wt-open-hit': Hit
  /** The task list's filter: open tasks, or all of them. */
  'wt-tasks-filter': TaskFilter
  /** The task list's grouping: by character, or by chore. */
  'wt-tasks-grouping': TaskGrouping
  /** A task panel's switch into the pick mode, or out of it. */
  'wt-pick': boolean
  'wt-task-tick': { id: string; subject: string; done: boolean }
  /** A line taken off a week or put back, in the pick mode: whose, which chore, and whether it is off now. */
  'wt-task-skip': { id: string; subject: string; skipped: boolean }
  /** A card's body is opened or closed, with the character's key. */
  /** A tab of the top bar picked. */
  'wt-tab': Tab
  /** Re-read the SavedVariables now. */
  'wt-sync': undefined
  /** A select's or a segmented control's value; also the toolbar's sort key. */
  'wt-change': string
  /** A checkbox, with its new state. */
  'wt-check': boolean
  /** A text field's value after a keystroke. */
  'wt-input': string
  /** Enter in a text field. */
  'wt-submit': undefined
  'wt-query': string
  /** The roster asked to show the characters not played this week or last, or to hide them again. */
  'wt-quiet': boolean
  'wt-sort-column': { sort: SortKey; direction: SortDirection }
  'wt-view': ViewMode
  'wt-account': string
  'wt-range': GoldRange
  /** A section of the settings page picked. */
  'wt-section': SettingsSection
  /** A section of the character page picked. */
  'wt-detail-section': DetailSection
  /** The settings tab asked for, open on a section - the way out of an empty state. */
  'wt-open-settings': SettingsSection
  'wt-back': undefined
  'wt-forward': undefined
  'wt-prev': undefined
  'wt-next': undefined
  'wt-install-update': undefined
  'wt-check-update': undefined
  'wt-choose-wow-path': undefined
  /** Copy the companion addon into the game folder. */
  'wt-install-addon': undefined
  'wt-config': Record<string, unknown>
  'wt-toggle-source': { id: string; enabled: boolean }
  'wt-toggle-character': { key: string; hidden: boolean }
  'wt-toggle-account': { account: string; hidden: boolean }
}

export type WtEvent<K extends keyof WtEvents> = CustomEvent<WtEvents[K]>

/**
 * What every element of the app shares.
 *
 * Renders into the light DOM: the one stylesheet keeps applying, and the
 * element is the box its class describes - `<wt-hint class="hint">` is
 * the `.hint` that `.entry-body .hint` looks for. An element
 * therefore never assigns its whole `class`; it toggles its own names and
 * leaves what the parent put there.
 *
 * A primitive that owns everything it shows - the chip, the icon - renders
 * into a shadow root instead (`static shadow = true`): its look is its
 * `static styles`, keyed on `:host` and the attributes it reflects, and
 * `styles.css` reaches only the host. The tokens come through, since
 * custom properties cross the boundary.
 */
export abstract class WtElement extends LitElement {
  /**
   * What the host is when its class says nothing about display: the box its
   * root used to be (a div, a span), a table row of light DOM cells, or no
   * box at all for an element that only wraps a control it cannot be itself -
   * a button, a label. Set as a
   * class on connect, so a class of the stylesheet's own can still win. A
   * shadow element says its display in `:host` and gets no class - a class
   * of the document would beat `:host`.
   */
  static hostDisplay: HostDisplay = HostDisplay.Block

  /** Render into a shadow root with `static styles`, not into the host. */
  static shadow = false

  /**
   * What every shadow root takes from the document, since `styles.css`
   * stops at the boundary: the box model - a part with a padding and a
   * width would grow past what the same rule outside the root draws - and
   * what a light DOM element sets on itself and expects the sheet to
   * honour: its display (`hostDisplay`) and its tabular figures (`num`).
   * A `wt-format` in a root then draws as it does outside.
   */
  protected static override finalizeStyles(styles?: CSSResultGroup): CSSResultOrNative[] {
    return [
      css`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        .wt-block {
          display: block;
        }

        .wt-inline {
          display: inline;
        }

        .wt-contents {
          display: contents;
        }

        .num {
          font-variant-numeric: tabular-nums;
        }
      `,
      ...super.finalizeStyles(styles)
    ]
  }

  @consume({ context: translatorContext, subscribe: true })
  accessor tr: Translator = DEFAULT_TRANSLATOR

  /** The shell's last tick; a relative time is measured from it, so it moves with the clock. */
  @consume({ context: clockContext, subscribe: true })
  @state()
  accessor clock = Date.now()

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return (this.constructor as typeof WtElement).shadow ? super.createRenderRoot() : this
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.renderRoot === this) this.classList.add(`wt-${(this.constructor as typeof WtElement).hostDisplay}`)
  }

  /**
   * Lit's hook with its argument optional: an element that extends a
   * primitive fills the primitive's properties in from its own here and
   * then calls `super.willUpdate()`, whether or not the primitive has work
   * of its own to do before it renders.
   */
  protected override willUpdate(_changed?: PropertyValues): void {}

  /** "5 minutes ago" style label, localized. */
  protected relativeTime(timestamp: number | null): string {
    return relativeTime(this.tr, timestamp, this.clock)
  }

  /** Switches the host's own class names on or off; the parent's stay. */
  protected hostClasses(classes: Record<string, boolean | string | null | undefined>): void {
    for (const [name, on] of Object.entries(classes)) {
      if (name) this.classList.toggle(name, Boolean(on))
    }
  }

  /**
   * The host's tooltip, or none: an element that works its tip out from
   * its data has to take a stale one off again when the data no longer
   * warrants it. The text goes into `data-tip`, which `wt-tip-layer` reads
   * on hover and focus - never into `title`, whose native bubble the app
   * does not use.
   */
  protected hostTip(tip: string | null | undefined): void {
    if (tip) this.dataset.tip = tip
    else delete this.dataset.tip
  }

  private ownGameTip: GameTip | null = null

  /**
   * The host's tooltip as the game draws it, or none: the lines of an
   * item, which one text cannot carry. `wt-tip-layer` finds the host by
   * the `data-game-tip` attribute the setter puts on and reads the lines
   * off this property when it shows the tip, so a template sets it on any
   * element (`.gameTip=${itemTip(…)}`) and an element sets its own in
   * `willUpdate`. A host with both shows this one.
   */
  get gameTip(): GameTip | null {
    return this.ownGameTip
  }

  set gameTip(tip: GameTip | null) {
    this.ownGameTip = tip
    this.toggleAttribute('data-game-tip', tip !== null)
  }

  private ownListTip: ListTip | null = null

  /**
   * The host's tooltip as a heading over rows of label and value, or
   * none: what one text cannot line up. Wired like `gameTip`, on the
   * `data-list-tip` attribute.
   */
  get listTip(): ListTip | null {
    return this.ownListTip
  }

  set listTip(tip: ListTip | null) {
    this.ownListTip = tip
    this.toggleAttribute('data-list-tip', tip !== null)
  }

  /**
   * Whether the host takes part in layout at all. An element with nothing to
   * say is not an empty box taking a gap in the flex row it sits in - and
   * `hidden` would lose to the display class the host carries, so this is
   * an inline style.
   */
  protected hostPresent(present: boolean): void {
    this.style.display = present ? '' : 'none'
  }

  /** A custom property on the host, or none - the class colour a card paints with. */
  protected hostVar(name: `--${string}`, value: string | null | undefined): void {
    if (value) this.style.setProperty(name, value)
    else this.style.removeProperty(name)
  }

  /** Raises one of the app's events from this element. */
  protected emit<K extends keyof WtEvents>(name: K, ...detail: WtEvents[K] extends undefined ? [] : [WtEvents[K]]): void {
    this.dispatchEvent(new CustomEvent(name, { detail: detail[0], bubbles: true, composed: true }))
  }
}

/** Joins the class names that apply, the way a template wants them. */
export function classes(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}
