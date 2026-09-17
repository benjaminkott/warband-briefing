import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { IconKind } from '../../../shared/enums/iconKind'
import { ClassToken } from '../enums/classToken'
import './GameIcon'

interface Args {
  kind: IconKind
  ref: string
  size: number
}

const meta: Meta<Args> = {
  title: 'Shared/GameIcon',
  component: 'wt-game-icon',
  args: { kind: IconKind.Item, ref: '212008', size: 32 },
  argTypes: {
    kind: { control: 'select', options: Object.values(IconKind) },
    size: { control: { type: 'range', min: 12, max: 96 } }
  },
  render: (args) => html`<wt-game-icon kind=${args.kind} ref=${args.ref} size=${args.size}></wt-game-icon>`
}

export default meta

/** The game's icon of one id. Storybook resolves it by the fixture's names; the app asks its main process. */
export const One: StoryObj<Args> = {}

/** Every class, named by its token: the game's own class icons. */
export const Classes: StoryObj<Args> = {
  render: () =>
    html`<div style="display: flex; flex-wrap: wrap; gap: var(--s4)">
      ${Object.values(ClassToken).map(
        (token) =>
          html`<span style="display: inline-flex; flex-direction: column; align-items: center; gap: var(--s2)">
            <wt-game-icon kind=${IconKind.Class} ref=${token} size="32"></wt-game-icon><span class="tiny">${token}</span>
          </span>`
      )}
    </div>`
}

/** An item, a currency, a recipe, a profession, side by side with a name, the way a row shows them. */
export const Kinds: StoryObj<Args> = {
  render: () =>
    html`<div style="display: grid; gap: var(--s2)">
      <span style="display: inline-flex; align-items: center; gap: var(--s2)"
        ><wt-game-icon kind=${IconKind.Item} ref="212000" size="18"></wt-game-icon>Crown of Consuming Radiance</span
      >
      <span style="display: inline-flex; align-items: center; gap: var(--s2)"
        ><wt-game-icon kind=${IconKind.Currency} ref="3444" size="18"></wt-game-icon>Champion Mistcrest</span
      >
      <span style="display: inline-flex; align-items: center; gap: var(--s2)"
        ><wt-game-icon kind=${IconKind.Recipe} ref="430619" size="18"></wt-game-icon>Transmute: Awakened Fire</span
      >
      <span style="display: inline-flex; align-items: center; gap: var(--s2)"
        ><wt-game-icon kind=${IconKind.Profession} ref="171" size="18"></wt-game-icon>Alchemy</span
      >
    </div>`
}

/** An id nobody has an icon for: the element takes no room, the name stands where it stood. */
export const Unknown: StoryObj<Args> = {
  render: () =>
    html`<span style="display: inline-flex; align-items: center; gap: var(--s2)"
      ><wt-game-icon kind=${IconKind.Item} ref="1" size="18"></wt-game-icon>An item without an icon</span
    >`
}
