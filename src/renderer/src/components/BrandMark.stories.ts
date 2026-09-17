import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { brandColor } from './BrandMark'
import { BrandId } from '../enums/brandId'
import './BrandMark'

interface Args {
  brand: BrandId
  size: number
}

const meta: Meta<Args> = {
  title: 'Shared/BrandMark',
  component: 'wt-brand-mark',
  args: { brand: BrandId.RaiderIo, size: 24 },
  argTypes: { brand: { control: 'radio', options: Object.values(BrandId) }, size: { control: { type: 'range', min: 12, max: 64 } } },
  render: (args) => html`<wt-brand-mark brand=${args.brand} size=${args.size}></wt-brand-mark>`
}

export default meta

/** One site's own icon; a link row is read by recognition. */
export const One: StoryObj<Args> = {}

/** All four, each on the edge colour its tile takes on hover. */
export const All: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; gap: var(--s4)">
      ${Object.values(BrandId).map(
        (id) =>
          html`<span style="display: inline-flex; flex-direction: column; align-items: center; gap: var(--s2); color: ${brandColor(id)}">
            <wt-brand-mark brand=${id} size="32"></wt-brand-mark><span class="tiny">${id}</span>
          </span>`
      )}
    </div>`
}
