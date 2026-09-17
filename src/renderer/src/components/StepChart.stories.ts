import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { trend } from '../../../shared/charHistory'
import { goldSeries } from '../model/gold'
import { whole } from '../model/format'
import { formatGoldShort } from '../model/gold'
import { CHAR_HISTORY, GOLD_HISTORY, MAIN, NOW, translatorFor } from '../stories/fixtures'
import { SPARK_TONES, type SparkTone } from './Sparkline'
import { GoldRange } from '../enums/goldRange'
import { AnyAccount } from '../../../shared/enums/anyAccount'
import { Tint } from '../enums/tint'
import { timeLabel } from './StepChart'
import './StepChart'
import './ui/Card'

interface Args {
  tone: SparkTone
}

const meta: Meta<Args> = {
  title: 'Shared/StepChart',
  component: 'wt-step-chart',
  args: { tone: Tint.Gold },
  argTypes: { tone: { control: 'radio', options: SPARK_TONES } }
}

export default meta

/** Ninety days of gold, the way the gold view draws it - axis, ticks and the crosshair on hover, the figures abbreviated as gold. */
export const Gold: StoryObj<Args> = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const series = goldSeries(GOLD_HISTORY, AnyAccount.All, GoldRange.Quarter)!
    return html`<wt-card class="panel gold-panel">
      <wt-step-chart
        .series=${series}
        tone=${Tint.Gold}
        .format=${(value: number) => formatGoldShort(tr, value)}
        label=${tr.t('gold.chart.summary', {
          from: formatGoldShort(tr, series.first),
          to: formatGoldShort(tr, series.last),
          since: timeLabel(tr, series.from, Math.max(1, series.to - series.from))
        })}
      ></wt-step-chart>
    </wt-card>`
  }
}

/** A character's rating over the season, in the keystone colour. */
export const Rating: StoryObj<Args> = {
  args: { tone: Tint.Key },
  render: (args, context) => {
    const tr = translatorFor(context)
    const series = trend(CHAR_HISTORY[MAIN.key], (point) => point.rating, 365, NOW)!
    return html`<wt-card class="panel">
      <wt-step-chart .series=${series} tone=${args.tone} .format=${(v: number) => whole(tr, v)} label="Rating"></wt-step-chart>
    </wt-card>`
  }
}
