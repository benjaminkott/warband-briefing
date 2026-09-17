import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { MAIN, ROSTER } from '../stories/fixtures'
import './Keystone'

const meta: Meta = {
  title: 'Shared/Keystone',
  component: 'wt-keystone'
}

export default meta

/** The level in the key colour, the dungeon's initials beside it; the full name is the tooltip. */
export const One: StoryObj = {
  render: () =>
    html`<span class="num" style="font-size: var(--fs-figure)"
      ><wt-keystone class="card-key" .keystone=${MAIN.keystone}></wt-keystone
    ></span>`
}

/** The three places: the card band, the tile, the roster row - and the dash for a character without a key. */
export const Places: StoryObj = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s3)">
      <span class="num" style="font-size: var(--fs-figure)"><wt-keystone class="card-key" .keystone=${MAIN.keystone}></wt-keystone></span>
      <span class="tile-figures num"><wt-keystone class="tile-key" .keystone=${MAIN.keystone}></wt-keystone></span>
      <span class="todo-figures"><wt-keystone class="todo-key" .keystone=${MAIN.keystone}></wt-keystone></span>
      <span class="num"
        ><wt-keystone class="card-key" .keystone=${{ name: '', level: 9 }}></wt-keystone>
        <span class="faint tiny">(a key with no dungeon known)</span></span
      >
      <span class="num"><wt-keystone class="card-key" .keystone=${null}></wt-keystone> <span class="faint tiny">(none)</span></span>
    </div>`
}

/** Every character of the fixture roster. */
export const Roster: StoryObj = {
  render: () =>
    html`<div style="display: flex; flex-direction: column; gap: var(--s2)">
      ${ROSTER.map(
        (character) =>
          html`<div style="display: flex; gap: var(--s4)">
            <span style="width: 8em">${character.name}</span
            ><span class="num"><wt-keystone class="card-key" .keystone=${character.keystone}></wt-keystone></span>
          </div>`
      )}
    </div>`
}
