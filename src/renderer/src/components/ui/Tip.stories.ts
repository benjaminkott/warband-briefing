import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import './Tip'

const meta: Meta = {
  title: 'UI/Tip',
  component: 'wt-tip'
}

export default meta

/** Centred on the point that the parent sets. */
export const Tip: StoryObj = {
  render: () =>
    html`<div style="position: relative; height: 60px; width: 240px">
      <wt-tip style="left: 50%; top: 12px">${'Dungeons · 4 von 8'}</wt-tip>
    </div>`
}

/** Two lines, as the gold chart shows a value: the value in the colour of the chart, and the time below. */
export const TwoLines: StoryObj = {
  render: () =>
    html`<div class="step-chart" style="position: relative; height: 72px; width: 240px; margin: 0">
      <wt-tip style="left: 50%; top: 12px">
        <div class="chart-tip-value">1.234.567</div>
        <div class="chart-tip-time">12. Sep. 2026, 14:30</div>
      </wt-tip>
    </div>`
}

/** At the edge of the window, the tip moves back in, so it is not cut off. */
export const AtTheEdge: StoryObj = {
  render: () =>
    html`<div style="position: relative; height: 60px; width: 240px">
      <wt-tip style="left: 0; top: 12px">${'Welt · 0 von 8 Aktivitäten'}</wt-tip>
    </div>`
}
