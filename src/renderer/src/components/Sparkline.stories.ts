import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { trend } from '../../../shared/charHistory'
import { formatGoldShort, goldSeries } from '../model/gold'
import { whole } from '../model/format'
import { CHAR_HISTORY, GOLD_HISTORY, MAIN, NOW, translatorFor } from '../stories/fixtures'
import { SPARK_TONES, type SparkTone } from './Sparkline'
import { GoldRange } from '../enums/goldRange'
import { AnyAccount } from '../../../shared/enums/anyAccount'
import { Tint } from '../enums/tint'
import './Sparkline'
import './ui/Card'

interface Args {
  tone: SparkTone
}

/* A figure box the way the stat tile sets it, for the sparkline under the figure. */
const BOX = 'display: flex; flex-direction: column; gap: 6px; padding: var(--pad); max-width: 200px'
const FIGURE = 'font-size: var(--fs-figure-lg); font-weight: 600; line-height: 1; letter-spacing: -0.5px;'

const meta: Meta<Args> = {
  title: 'Shared/Sparkline',
  component: 'wt-sparkline',
  args: { tone: Tint.Gold },
  argTypes: { tone: { control: 'radio', options: SPARK_TONES } }
}

export default meta

/** The same stepped shape as the chart, at tile size: no axis, no ticks. */
export const Gold: StoryObj<Args> = {
  render: (args, context) => {
    const tr = translatorFor(context)
    const series = goldSeries(GOLD_HISTORY, AnyAccount.All, GoldRange.Month)!
    return html`<wt-card style=${BOX}>
      <div class="num" style=${`${FIGURE} color: var(--gold)`}>${formatGoldShort(tr, series.last)}</div>
      <div style="height: 40px"><wt-sparkline .series=${series} tone=${args.tone}></wt-sparkline></div>
    </wt-card>`
  }
}

/** Item level and rating step the same way, in their own colour. */
export const Figures: StoryObj<Args> = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const ilvl = trend(CHAR_HISTORY[MAIN.key], (point) => point.itemLevel, 120, NOW)!
    const rating = trend(CHAR_HISTORY[MAIN.key], (point) => point.rating, 120, NOW)!
    return html`<div style="display: grid; gap: var(--s3); max-width: 200px">
      <wt-card style=${BOX}>
        <div class="num" style=${FIGURE}>${whole(tr, ilvl.samples[ilvl.samples.length - 1]!.value)}</div>
        <div style="height: 40px"><wt-sparkline .series=${ilvl} tone=${Tint.Accent}></wt-sparkline></div>
      </wt-card>
      <wt-card style=${BOX}>
        <div class="num" style=${FIGURE}>${whole(tr, rating.samples[rating.samples.length - 1]!.value)}</div>
        <div style="height: 40px"><wt-sparkline .series=${rating} tone=${Tint.Key}></wt-sparkline></div>
      </wt-card>
    </div>`
  }
}

/** Fewer than two readings: nothing is drawn. */
export const TooFew: StoryObj<Args> = {
  render: () =>
    html`<wt-sparkline .series=${{ samples: [{ at: NOW, value: 1 }], from: NOW, to: NOW, min: 1, max: 1 }}></wt-sparkline>
      <p class="faint tiny">(nothing rendered)</p>`
}
