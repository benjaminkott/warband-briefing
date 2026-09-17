import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { memberOf } from '../stories/enums'
import { CLASS_ABBR, CLASS_COLORS, ClassToken, classColor } from './classToken'
import '../components/ClassGlyph'

/**
 * The `ClassToken` enum, not an element: the thirteen classes the app knows
 * a colour for. A member's value is the English token the addons save, so a
 * snapshot's token compares to a member directly. The colour is the
 * stylesheet's token with Blizzard's own colour as the fallback - the light
 * theme tones down what was made for a dark client.
 */
const meta: Meta = {
  title: 'Foundations/Class colours'
}

export default meta

const member = (token: ClassToken): string => memberOf('ClassToken', ClassToken, token)

const swatch = (color: string, tip: string) => html`
  <span
    data-tip=${tip}
    style="display: inline-block; width: 28px; height: 20px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: ${color}"
  ></span>
`

/** Each class as a row: member, value, abbreviation, glyph, the theme's colour beside Blizzard's own. */
export const Members: StoryObj = {
  render: () => html`
    <div
      style="display: grid; grid-template-columns: max-content max-content max-content max-content max-content 1fr; gap: var(--s2) var(--s5); align-items: center; max-width: 720px"
    >
      <span class="label">Member</span>
      <span class="label">Value</span>
      <span class="label">Abbr.</span>
      <span class="label">Glyph</span>
      <span class="label">Theme · Blizzard</span>
      <span class="label">Name</span>
      ${Object.values(ClassToken).map(
        (token) => html`
          <code class="tiny">${member(token)}</code>
          <code class="tiny faint">'${token}'</code>
          <span class="num">${CLASS_ABBR[token]}</span>
          <wt-class-glyph token=${token} size="20" style="color: ${classColor(token)}"></wt-class-glyph>
          <span style="display: inline-flex; gap: var(--s1)"
            >${swatch(classColor(token) ?? '', `--class-${token.toLowerCase()}`)}${swatch(CLASS_COLORS[token], CLASS_COLORS[token])}</span
          >
          <span style="color: ${classColor(token)}">Mistcrest · Blackmoore</span>
        `
      )}
    </div>
  `
}
