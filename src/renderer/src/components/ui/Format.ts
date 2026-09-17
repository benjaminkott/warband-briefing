import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Translator } from '../../../../shared/i18n'
import { WtElement } from '../../element'
import { relativeTime } from '../../i18n'
import { formatDuration, formatMinutes, formatWhen, goldOf, signed, untilReset, whole } from '../../model/format'
import { formatPlayed } from '../../model/overview'
import { HostDisplay } from '../../enums/hostDisplay'
import { FormatKind } from '../../enums/formatKind'

/**
 * How one kind of value reads: the text for a value that is there, which
 * values count as none, and what the tooltip says. A kind is a row here,
 * not a branch in the element.
 */
interface Format {
  text: (tr: Translator, value: number, now: number) => string
  /** A value the kind has nothing to say about; the dash stands for it. Null always is. */
  none?: (value: number) => boolean
  /** The text for a value that is none, where the kind has a word for it. */
  never?: (tr: Translator) => string
  tip?: (tr: Translator, value: number, now: number) => string
  /** Whether the host reads as a figure, with the same digits everywhere. */
  num?: boolean
}

const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
const absolute = (tr: Translator, value: number): string => tr.formatDateTime(value, DATE_TIME)
const zero = (value: number): boolean => value <= 0

const FORMATS = {
  /** A count as it is: grouped, not rounded, and a zero is a zero. */
  [FormatKind.Number]: { text: (tr, value) => tr.formatNumber(value), num: true },
  /** A figure: rounded, and a zero is none - an item level or a score is never zero. */
  [FormatKind.Whole]: { text: (tr, value) => whole(tr, value), none: zero, num: true },
  /** A change with its sign. */
  [FormatKind.Signed]: { text: (tr, value) => signed(tr, value), num: true },
  /** Copper as whole gold. */
  [FormatKind.Gold]: { text: (tr, value) => goldOf(tr, value), none: zero, num: true },
  /** A part of a whole, 0 to 1, as a percentage. */
  [FormatKind.Percent]: { text: (tr, value) => tr.formatNumber(value, { style: 'percent', maximumFractionDigits: 0 }), num: true },
  /** Seconds as "12:34 min". */
  [FormatKind.Duration]: { text: (tr, value) => formatDuration(tr, value), none: zero, num: true },
  /** Minutes as "40 min" or "1 h 30 min": what a step of the week takes. */
  [FormatKind.Minutes]: { text: (tr, value) => formatMinutes(tr, value), none: zero, num: true },
  /** Seconds played as "12 d 4 h": days, hours and minutes, the smallest unit a minute. */
  [FormatKind.Played]: { text: (tr, value) => formatPlayed(tr, value) ?? '', none: zero, num: true },
  [FormatKind.Date]: { text: (tr, value) => tr.formatDateTime(value, { dateStyle: 'medium' }), none: zero },
  [FormatKind.Time]: { text: (tr, value) => tr.formatDateTime(value, { hour: '2-digit', minute: '2-digit' }), none: zero },
  [FormatKind.Datetime]: { text: absolute, none: zero },
  /** "Tue 20:15" - a moment this week. */
  [FormatKind.When]: { text: (tr, value) => formatWhen(tr, value), none: zero, tip: absolute },
  /**
   * "5 minutes ago", measured from the shell's clock. No tooltip of its own:
   * the places that say it explain what the moment means in theirs.
   */
  [FormatKind.Relative]: { text: (tr, value, now) => relativeTime(tr, value, now), none: zero, never: (tr) => tr.t('time.never') },
  /** Time left until a lockout resets; the reset itself is the tooltip. */
  [FormatKind.Until]: { text: (tr, value, now) => untilReset(tr, value, now) ?? '', none: zero, tip: absolute }
} satisfies Record<FormatKind, Format>

const NONE = '—'

/**
 * One value, formatted: a figure, a sum of gold, a duration, a moment. The
 * kind picks the formatter; the element only draws what it says and carries
 * the `.num` class when the value is a figure. A missing value is a dash,
 * or the kind's own word for it ("never").
 */
@customElement('wt-format')
export class WtFormat extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property() accessor kind: FormatKind = FormatKind.Number
  @property({ type: Number }) accessor value: number | null | undefined = null

  protected get format(): Format {
    return FORMATS[this.kind]
  }

  /** Whether the kind has something to say about the value. */
  protected has(value = this.value): value is number {
    return value !== null && value !== undefined && !this.format.none?.(value)
  }

  /** The value as text, or the dash. */
  protected text(value = this.value): string {
    const { format, tr } = this
    if (!this.has(value)) return format.never?.(tr) ?? NONE
    return format.text(tr, value, this.clock)
  }

  protected override willUpdate(): void {
    const { format, tr, value } = this
    this.hostClasses({ num: Boolean(format.num) })
    this.hostTip(format.tip && this.has(value) ? format.tip(tr, value, this.clock) : null)
  }

  protected override render(): TemplateResult {
    return html`${this.text()}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-format': WtFormat
  }
}
