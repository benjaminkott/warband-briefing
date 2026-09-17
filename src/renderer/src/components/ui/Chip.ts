import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { hasContent, WtElement, type Content } from '../../element'
import type { IconName } from '../Icon'
import { Severity } from '../../enums/severity'
import { Tint } from '../../enums/tint'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * The chip's colour, named after the token it takes, not after what the
 * chip says: a severity - `ok` for a thing that is finished, `warn` for one
 * that wants a look, `danger` for a loss, `info` for the plain chip - or
 * a tint: `Accent` for the one thing to shout about, `Key` for a
 * keystone, `Quiet` for a mark that must not draw the eye. The tone is an
 * attribute of the host, and the tone is the only thing that makes one chip
 * look unlike another.
 */
export type ChipTone = Severity | Exclude<Tint, Tint.Gold>

/** Every tone, for a control that offers them. */
export const CHIP_TONES: readonly ChipTone[] = [...Object.values(Severity), Tint.Accent, Tint.Key, Tint.Quiet]

/**
 * A chip worked out as data, without a DOM: one field for each property of
 * the chip, and the tooltip. A model beside a view returns one for a run,
 * a lockout, a state word; the template feeds it to `wt-chip` field by field.
 */
export interface ChipModel {
  label: string
  note?: string
  icon?: IconName
  tone?: ChipTone
  numeric?: boolean
  numericNote?: boolean
  tip?: string
}

/**
 * The chip: the one box for every short thing in a line - a lockout, a
 * run, a currency, a state word, an account beside a name. A mark before
 * the label, a quieter figure behind it, and the tone that says whether the
 * entry is done. It renders into a shadow root and carries its look in its
 * own stylesheet: the host is the box, its attributes (`tone`, `small`,
 * `numeric`) say which chip it is, and `styles.css` reaches only the host -
 * a `data-tip` on it is the tooltip, a parent's class still applies to it.
 */
@customElement('wt-chip')
export class WtChip extends WtElement {
  static override shadow = true

  /*
   * One chip, every job: a run, a lockout, a currency, a goal, an area a
   * source supplies, an event of the week, the state word beside a name,
   * the account it came from. The geometry is said once; the tones change
   * colour and nothing else, so a line that mixes jobs still reads as one
   * line.
   */
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--s2);
      flex: 0 0 auto;
      height: var(--chip-h);
      padding: 0 var(--chip-px);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-sunken);
      font-size: var(--fs-tiny);
      color: var(--text-dim);
      white-space: nowrap;
    }

    /* A shade smaller, for a row that is a footnote to a panel rather than
       a block of its own. */
    :host([small]) {
      height: var(--chip-h-sm);
      padding: 0 var(--s2);
      font-size: var(--fs-micro);
      max-width: 100%;
    }

    /* Figures read as figures: same digits everywhere they are compared. */
    :host([numeric]),
    :host([numeric-note]) .note {
      font-variant-numeric: tabular-nums;
    }

    /* The tones, one token family each. Finished work is not news: \`ok\`
       lifts the box and keeps the tick green, so it stays legible and
       quiet. Anything still open gets the eye in \`warn\`, a loss in
       \`danger\`. \`accent\` is for the one thing worth shouting about - an
       uncollected vault. \`key\` is the keystone's own colour. A \`quiet\`
       mark - the clock on a run over the timer - must not read as a
       warning. */
    :host([tone='ok']) {
      border-color: var(--border-strong);
      background: var(--bg-lift);
      color: var(--text);
    }

    :host([tone='ok']) wt-icon {
      color: var(--ok);
    }

    :host([tone='warn']) {
      border-color: var(--warn-line);
      background: var(--warn-soft);
      color: var(--warn-text);
    }

    :host([tone='warn']) wt-icon {
      color: var(--warn);
    }

    :host([tone='danger']) {
      border-color: var(--danger-line);
      background: var(--danger-soft);
      color: var(--danger-text);
    }

    :host([tone='danger']) wt-icon {
      color: var(--danger);
    }

    :host([tone='accent']) {
      border-color: var(--accent);
      background: var(--accent-soft);
      color: var(--accent-bright);
    }

    :host([tone='key']) {
      border-color: var(--key-line);
      background: var(--key-soft);
      color: var(--key);
    }

    :host([tone='key']) wt-icon {
      color: var(--key);
    }

    :host([tone='quiet']) wt-icon {
      color: var(--text-faint);
    }

    strong {
      font-weight: 600;
      color: var(--text);
    }

    /* The client's own progress summary, set after the label a shade
       quieter so the chip still reads as a name first. Never wraps: a row
       keeps its height whatever the client calls the dungeon. */
    .note {
      margin-left: var(--s0);
      color: var(--text-dim);
      font-size: var(--fs-micro);
      letter-spacing: 0.03em;
      white-space: nowrap;
    }
  `

  /** Plain text as an attribute, or a template as a property. */
  @property() accessor label: Content = nothing
  @property() accessor icon: IconName | undefined = undefined
  /** The figure behind the label - a count, a progress, a dungeon. */
  @property() accessor note: Content = nothing
  /** Reflected: the stylesheet keys the colours on it. */
  @property({ reflect: true }) accessor tone: ChipTone | undefined = undefined
  /** The tighter chip of a caption line. */
  @property({ type: Boolean, reflect: true }) accessor small = false
  /** Tabular figures for a chip that is a number - a keystone level. */
  @property({ type: Boolean, reflect: true }) accessor numeric = false
  /** Tabular figures for the note alone. */
  @property({ type: Boolean, reflect: true, attribute: 'numeric-note' }) accessor numericNote = false

  protected override render(): TemplateResult {
    return html`${this.icon ? html`<wt-icon name=${this.icon} size=${IconSize.Xs}></wt-icon>` : nothing}${this.label}${
      hasContent(this.note) ? html`<span class="note">${this.note}</span>` : nothing
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-chip': WtChip
  }
}
