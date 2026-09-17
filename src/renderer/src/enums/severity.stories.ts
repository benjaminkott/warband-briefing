import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { memberOf } from '../stories/enums'
import { SEVERITY_ICON, Severity } from './severity'
import { ButtonRole } from './buttonRole'
import '../components/Icon'
import '../components/Notice'
import '../components/ui/Button'
import '../components/ui/Chip'
import { IconSize } from './iconSize'

/**
 * The `Severity` enum, not an element: the four words, the mark and the
 * token family of each, and the elements that carry one. A member's value
 * is the stylesheet's word, so `tone=${Severity.Warn}` and `.warn` on a
 * host read the same.
 */
const meta: Meta = {
  title: 'Foundations/Severity'
}

export default meta

const member = (tone: Severity): string => memberOf('Severity', Severity, tone)

/** The four slots of a token family, painted from the tokens themselves. */
const SLOTS = ['', '-text', '-soft', '-line']

const swatch = (token: string) => html`
  <span
    data-tip=${token}
    style="display: inline-block; width: 28px; height: 20px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(${token})"
  ></span>
`

const cell = (content: unknown) => html`<div style="display: flex; align-items: center; gap: var(--s2)">${content}</div>`

/** Each severity as a row: member, value, mark, tokens, and the notice that carries it. */
export const Members: StoryObj = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: max-content max-content max-content max-content 1fr; gap: var(--s3) var(--s5); align-items: center; max-width: 720px"
    >
      <span class="label">Member</span>
      <span class="label">Value</span>
      <span class="label">Mark</span>
      <span class="label">Tokens</span>
      <span class="label">Notice</span>
      ${Object.values(Severity).map(
        (tone) => html`
          <code class="tiny">${member(tone)}</code>
          <code class="tiny faint">'${tone}'</code>
          ${cell(html`<wt-icon name=${SEVERITY_ICON[tone]} size=${IconSize.Md} class=${`${tone}-text`}></wt-icon>`)}
          ${cell(SLOTS.map((slot) => swatch(`--${tone}${slot}`)))}
          <wt-notice tone=${tone}>${`${member(tone)} - ${tone}`}</wt-notice>
        `
      )}
    </div>
  `
}

/** The same severity on every element that takes one: the notice, the chip, the button's `Danger`. */
export const OnElements: StoryObj = {
  render: () => html`
    <div style="display: grid; gap: var(--s3); max-width: 720px">
      ${Object.values(Severity).map(
        (tone) => html`
          <div style="display: flex; align-items: center; gap: var(--s4)">
            <code class="tiny" style="width: 9em">${member(tone)}</code>
            <wt-chip tone=${tone} icon=${SEVERITY_ICON[tone]} label=${tone}></wt-chip>
            <wt-notice tone=${tone} style="flex: 1">${tone}</wt-notice>
            ${
              tone === Severity.Danger
                ? html`<wt-button tone=${Severity.Danger} icon="trash" label="Entfernen"></wt-button>`
                : html`<wt-button tone=${ButtonRole.Default} label="—" disabled></wt-button>`
            }
          </div>
        `
      )}
    </div>
  `
}
