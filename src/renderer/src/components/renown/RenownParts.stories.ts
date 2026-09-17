import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import './RenownFigure'

const meta: Meta = {
  title: 'Renown/Parts'
}

export default meta

/** One faction as a figure: the ring to the next level, the name, the stage and the way to the next under it. */
export const Figure: StoryObj = {
  render: () =>
    html`<div class="renown-grid">
      <wt-renown-figure
        .figure=${{ factionId: 1, name: 'Rat von Dornogal', initials: 'RD', level: 14, percent: 62, maxed: false, paragon: false, rewardPending: false, stage: 'Stufe 14', current: 1240, max: 2000, hint: 'Ruf 14 · 1.240 / 2.000' }}
      ></wt-renown-figure>
      <wt-renown-figure
        .figure=${{ factionId: 2, name: 'Die Versammlung der Tiefen', initials: 'VT', level: 25, percent: 35, maxed: true, paragon: true, rewardPending: false, stage: 'Paragon', current: 3500, max: 10000, hint: 'Paragon · 3.500 / 10.000' }}
      ></wt-renown-figure>
      <wt-renown-figure
        .figure=${{ factionId: 3, name: 'Hallowfall Arathi', initials: 'HA', level: 25, percent: 100, maxed: true, paragon: true, rewardPending: true, stage: 'Belohnung abholbereit', current: 10000, max: 10000, hint: 'Paragon · Belohnung wartet' }}
      ></wt-renown-figure>
    </div>`
}
