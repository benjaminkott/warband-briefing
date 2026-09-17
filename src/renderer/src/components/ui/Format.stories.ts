import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { ratingColor, ratingStyle } from '../../model/dashboard'
import { NEXT_RESET_AT, NOW } from '../../stories/fixtures'
import { FormatKind } from '../../enums/formatKind'
import './Format'

interface Args {
  kind: FormatKind
  value: number | null
}

const KINDS: FormatKind[] = [
  FormatKind.Number,
  FormatKind.Whole,
  FormatKind.Signed,
  FormatKind.Gold,
  FormatKind.Percent,
  FormatKind.Duration,
  FormatKind.Played,
  FormatKind.Date,
  FormatKind.Time,
  FormatKind.Datetime,
  FormatKind.When,
  FormatKind.Relative,
  FormatKind.Until
]

const meta: Meta<Args> = {
  title: 'UI/Format',
  component: 'wt-format',
  args: { kind: FormatKind.Number, value: 1_234_567 },
  argTypes: {
    kind: { control: 'select', options: KINDS },
    value: { control: { type: 'number' } }
  },
  render: (args) => html`<wt-format kind=${args.kind} .value=${args.value}></wt-format>`
}

export default meta

/** A count as it is: grouped, not rounded. */
export const Count: StoryObj<Args> = {}

/** A figure: rounded, and a zero is none. */
export const Whole: StoryObj<Args> = { args: { kind: FormatKind.Whole, value: 627.6 } }

/** A change with its sign. */
export const Signed: StoryObj<Args> = { args: { kind: FormatKind.Signed, value: 12 } }

/** Copper as whole gold. */
export const Gold: StoryObj<Args> = { args: { kind: FormatKind.Gold, value: 1_234_567_890 } }

/** A part of a whole, 0 to 1. */
export const Percent: StoryObj<Args> = { args: { kind: FormatKind.Percent, value: 0.42 } }

/** Seconds as minutes and seconds. */
export const Duration: StoryObj<Args> = { args: { kind: FormatKind.Duration, value: 1_534 } }

/** Time played, in days and hours. */
export const Played: StoryObj<Args> = { args: { kind: FormatKind.Played, value: 7_534_000 } }

/** A moment this week: the weekday and the time, the full date in the tooltip. */
export const When: StoryObj<Args> = { args: { kind: FormatKind.When, value: NOW - 26 * 3_600_000 } }

/** Measured from the shell's clock, so it moves as time passes. */
export const Relative: StoryObj<Args> = { args: { kind: FormatKind.Relative, value: NOW - 4 * 60_000 } }

/** Time left until the reset, the reset itself in the tooltip. */
export const Until: StoryObj<Args> = { args: { kind: FormatKind.Until, value: NEXT_RESET_AT } }

/** No value: a dash, or the kind's own word for it. */
export const None: StoryObj<Args> = { args: { kind: FormatKind.Whole, value: null } }

/**
 * A Mythic+ rating in its colour: the `rated` class and the `--heat` the
 * maths hand out, the same scale as the keys from 2000 up. Below the scale
 * the figure keeps the text colour around it; null is a dash.
 */
export const Rated: StoryObj<Args> = {
  render: () =>
    html`<div class="num" style="display: flex; gap: var(--s3); font-size: var(--fs-figure)">
      ${[null, 1_402, 2_005, 2_412, 2_841, 3_320, 3_680].map(
        (rating) =>
          html`<wt-format
            kind=${FormatKind.Whole}
            class="rated"
            .value=${rating}
            style=${styleMap(ratingStyle(ratingColor(rating)) ?? {})}
          ></wt-format>`
      )}
    </div>`
}

/** Every kind on one value each. */
export const Kinds: StoryObj<Args> = {
  render: () => {
    const sample: Record<FormatKind, number> = {
      number: 1_234_567,
      whole: 627.6,
      signed: -3,
      gold: 1_234_567_890,
      percent: 0.42,
      duration: 1_534,
      minutes: 95,
      played: 7_534_000,
      date: NOW,
      time: NOW,
      datetime: NOW,
      when: NOW - 26 * 3_600_000,
      relative: NOW - 4 * 60_000,
      until: NEXT_RESET_AT
    }
    return html`<div style="display: grid; grid-template-columns: max-content 1fr; gap: var(--s2) var(--s5); align-items: baseline">
      ${KINDS.map((kind) => html`<code class="tiny">${kind}</code><span><wt-format kind=${kind} .value=${sample[kind]}></wt-format></span>`)}
    </div>`
  }
}
