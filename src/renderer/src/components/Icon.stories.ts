import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing } from 'lit'
import { ICON_NAMES, type IconName } from './Icon'
import './Icon'
import { IconSize } from '../enums/iconSize'

interface Args {
  name: IconName
  size: IconSize
  label: string
}

const meta: Meta<Args> = {
  title: 'Shared/Icon',
  component: 'wt-icon',
  args: { name: 'vault', size: IconSize.Lg, label: '' },
  argTypes: {
    name: { control: 'select', options: ICON_NAMES },
    size: { control: 'select', options: Object.values(IconSize) }
  },
  render: (args) =>
    html`<span style="color: var(--accent)"><wt-icon name=${args.name} size=${args.size} label=${args.label || nothing}></wt-icon></span>`
}

export default meta

export const One: StoryObj<Args> = {}

/** Every glyph the set knows, at the size most of them are drawn. */
export const Sheet: StoryObj<Args> = {
  render: () =>
    html`<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--s3)">
      ${ICON_NAMES.map(
        (name) =>
          html`<div style="display: flex; align-items: center; gap: var(--s2); color: var(--text-dim)">
            <wt-icon name=${name} size=${IconSize.Md}></wt-icon><span class="tiny">${name}</span>
          </div>`
      )}
    </div>`
}
