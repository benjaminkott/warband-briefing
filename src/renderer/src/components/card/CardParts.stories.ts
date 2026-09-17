import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { trend } from '../../../../shared/charHistory'
import { CHAR_HISTORY, MAIN, NOW, translatorFor } from '../../stories/fixtures'
import { ratingColor, ratingStyle } from '../../model/dashboard'
import { Tint } from '../../enums/tint'
import { FormatKind } from '../../enums/formatKind'
import '../Keystone'
import '../ui/Format'
import './CardFigure'

const meta: Meta = {
  title: 'Card/Parts'
}

export default meta

/** The four headline figures of the head band: a number, its trend, its unit. */
export const Figures: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    const ilvl = trend(CHAR_HISTORY[MAIN.key], (point) => point.itemLevel, 30, NOW)
    const rating = trend(CHAR_HISTORY[MAIN.key], (point) => point.rating, 30, NOW)
    return html`<div class="card-figures" style="max-width: 480px">
      <wt-card-figure
        .value=${MAIN.itemLevel}
        unit=${tr.t('card.itemLevel')}
        .series=${ilvl}
        tone=${Tint.Accent}
        days="30"
      ></wt-card-figure>
      <wt-card-figure
        .value=${html`<wt-format kind=${FormatKind.Whole} class="rated" .value=${MAIN.mythicRating} style=${styleMap(ratingStyle(ratingColor(MAIN.mythicRating)) ?? {})}></wt-format>`}
        unit=${tr.t('card.score')}
        .series=${rating}
        tone=${Tint.Key}
        days="30"
      ></wt-card-figure>
      <wt-card-figure
        .value=${html`<wt-keystone class="card-key" .keystone=${MAIN.keystone}></wt-keystone>`}
        unit=${tr.t('table.key')}
      ></wt-card-figure>
      <wt-card-figure kind=${FormatKind.Number} .value=${5} of="9" unit=${tr.t('table.vault')}></wt-card-figure>
      <wt-card-figure .value=${null} unit=${tr.t('table.vault')}></wt-card-figure>
    </div>`
  }
}
