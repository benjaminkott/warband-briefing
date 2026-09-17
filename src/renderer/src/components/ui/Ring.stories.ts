import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import type { RingGroup } from './Ring'
import './Ring'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

interface Args {
  size: number
}

/** Three groups: one complete, one at half, one empty. */
const GROUPS: RingGroup[] = [
  { percent: 100, label: 'Raids · 6 von 6' },
  { percent: 50, label: 'Dungeons · 4 von 8' },
  { percent: 0, label: 'Welt · 0 von 8' }
]

const meta: Meta<Args> = {
  title: 'UI/Ring',
  component: 'wt-ring',
  args: { size: 96 },
  argTypes: {
    size: { control: { type: 'range', min: 24, max: 200 } }
  },
  render: (args) => html`<wt-ring .groups=${GROUPS} size=${args.size}><span class="num">5/9</span></wt-ring>`
}

export default meta

/** One arc for each group, each filled to its percent. Move the pointer on an arc to see its label. */
export const Groups: StoryObj<Args> = {}

/** A single group is a closed progress ring. */
export const OneGroup: StoryObj<Args> = {
  render: (args) => html`<wt-ring .groups=${[{ percent: 62, label: '62 %' }]} size=${args.size}><span class="num">62 %</span></wt-ring>`
}

/** Five groups are still five arcs. The gap keeps its size in stroke widths. */
export const ManyGroups: StoryObj<Args> = {
  render: (args) =>
    html`<wt-ring .groups=${[100, 80, 35, 10, 0].map((percent) => ({ percent, label: `${percent} %` }))} size=${args.size}></wt-ring>`
}

/**
 * The middle shows `content`, here an icon in the accent colour, so it is
 * part of the ring.
 */
export const WithIcon: StoryObj<Args> = {
  render: (args) =>
    html`<wt-ring .groups=${GROUPS} size=${args.size}>
      <wt-icon name="vault" size=${IconSize.Xl} style="color: var(--accent)"></wt-icon>
    </wt-ring>`
}

/** A figure with a caption. the ring stacks the lines and centres them. */
export const WithFigure: StoryObj<Args> = {
  render: (args) =>
    html`<wt-ring .groups=${[{ percent: 72, label: '2.870 / 4.000' }]} size=${args.size}>
      <span class="num" style="font-size: var(--fs-title); font-weight: 600">72 %</span><span class="faint tiny">Ruf</span>
    </wt-ring>`
}

/** A figure at the bottom of the ring, for example a level or a count. The middle stays free for the icon. */
export const WithBadge: StoryObj<Args> = {
  render: (args) =>
    html`<wt-ring .groups=${GROUPS} size=${args.size} badge="5/9">
      <wt-icon name="vault" size=${IconSize.Xl} style="color: var(--accent)"></wt-icon>
    </wt-ring>`
}

/** On a plate, as the game shows a faction: the ring is set into a dark disc with a rim, and the level is on the rim. */
export const OnAPlate: StoryObj<Args> = {
  render: (args) =>
    html`<div style="display: flex; gap: var(--s5); align-items: center">
      <wt-ring .groups=${[{ percent: 64, label: 'Ruf · 2.560 / 4.000' }]} size=${args.size} disc badge="10">
        <wt-icon name="shield" size=${IconSize.Xl} style="color: var(--accent)"></wt-icon>
      </wt-ring>
      <wt-ring .groups=${GROUPS} size=${args.size} disc badge="5/9">
        <wt-icon name="vault" size=${IconSize.Xl} style="color: var(--accent)"></wt-icon>
      </wt-ring>
      <wt-ring .groups=${[{ percent: 30, label: '30 %' }]} size="40" disc badge="2"></wt-ring>
    </div>`
}

/**
 * The colour is `--ring-color` on the host or on a parent. Here it is a class
 * colour. The bright end is mixed with white, and the glow is mixed with
 * transparent.
 */
export const InAnotherColour: StoryObj<Args> = {
  render: (args) =>
    html`<div style="display: flex; gap: var(--s5); align-items: center">
      ${[
        ['#c41e3a', 'Krieger'],
        ['#3fc7eb', 'Magier'],
        ['#aad372', 'Jäger']
      ].map(
        ([color, name]) =>
          html`<wt-ring
            .groups=${[{ percent: 72, label: name }]}
            size=${args.size}
            disc
            badge="16"
            style=${`--ring-color: ${color}; --ring-color-bright: color-mix(in srgb, ${color} 65%, white); --ring-glow: color-mix(in srgb, ${color} 45%, transparent)`}
          ></wt-ring>`
      )}
    </div>`
}

/** No content. The ring alone is the figure. */
export const Empty: StoryObj<Args> = {
  render: (args) => html`<wt-ring .groups=${GROUPS} size=${args.size}></wt-ring>`
}

/** The sizes that the app uses: the tile and the row of the dashboard. */
export const Sizes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; gap: var(--s5); align-items: center">
      ${[96, 64, 40, 24].map((size) => html`<wt-ring .groups=${GROUPS} size=${size}></wt-ring>`)}
    </div>`
}
