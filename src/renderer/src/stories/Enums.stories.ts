import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html, nothing, type TemplateResult } from 'lit'
import { ENUMS, memberOf, type EnumEntry } from './enums'
import { MAIN, translatorFor } from './fixtures'
import { stateChip, type CharacterState } from '../model/overview'
import type { Translator } from '../../../shared/i18n'
import { classColor } from '../enums/classToken'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'
import { WowheadKind, wowheadUrl } from '../enums/wowheadKind'
import { Place } from '../enums/place'
import { StateWord } from '../enums/stateWord'
import { TINT_VAR } from '../enums/tint'
import { FormatKind } from '../enums/formatKind'
import '../components/BrandMark'
import '../components/CharacterLinks'
import '../components/ClassGlyph'
import '../components/FactionTag'
import '../components/ui/Format'
import '../components/Notice'
import '../components/StatTile'
import '../components/ui/Bar'
import '../components/ui/Button'
import '../components/ui/Checkbox'
import '../components/ui/Chip'
import '../components/ui/ExtLink'
import '../components/ui/Input'

/**
 * Every string enum of the renderer on one page: its members, their
 * values, and - where an element takes the member - what it looks like.
 * The rules the catalog holds them to: the value is the word the
 * stylesheet, the store or the template already uses; a member is written
 * in PascalCase; no literal stands where a member can.
 */
const meta: Meta = {
  title: 'Foundations/Enums'
}

export default meta

/** The character state that yields each state word. */
const STATE_OF: Record<StateWord, CharacterState> = {
  [StateWord.Claim]: { unclaimed: true, levelling: false, inactive: false, betweenWeeks: false },
  [StateWord.Levelling]: { unclaimed: false, levelling: true, inactive: false, betweenWeeks: false },
  [StateWord.Inactive]: { unclaimed: false, levelling: false, inactive: true, betweenWeeks: false },
  [StateWord.BetweenWeeks]: { unclaimed: false, levelling: false, inactive: false, betweenWeeks: true },
  [StateWord.Done]: { unclaimed: false, levelling: false, inactive: false, betweenWeeks: false }
}

/** The class a name wears for its place, on top of `char-open`. */
const NAME_CLASS: Record<Place, string> = { [Place.Card]: 'card-name', [Place.Table]: 'table-name', [Place.Matrix]: 'matrix-char' }

/** One member on the element that takes it; nothing for an enum without a visible sample. */
const SAMPLES: Record<string, (value: string, tr: Translator) => TemplateResult> = {
  Severity: (v) => html`<wt-notice tone=${v}>${v}</wt-notice>`,
  ClassToken: (v) => html`<wt-class-glyph token=${v} size="20" style="color: ${classColor(v)}"></wt-class-glyph>`,
  ControlSize: (v) => html`<wt-button size=${v} icon="check" label="Speichern"></wt-button>`,
  ButtonRole: (v) => html`<wt-button tone=${v} label=${v}></wt-button>`,
  BarKind: (v) => html`<wt-bar kind=${v} percent="60" style="width: 120px"></wt-bar>`,
  CheckboxKind: (v) => html`<wt-checkbox kind=${v} label=${v} checked></wt-checkbox>`,
  InputWidth: (v) => html`<wt-input width=${v} placeholder=${v}></wt-input>`,
  Tint: (v) =>
    html`<span
        style="display: inline-block; width: 28px; height: 20px; border-radius: var(--radius-sm); background: ${TINT_VAR[v as keyof typeof TINT_VAR]}"
      ></span>
      <wt-chip tone=${v} label=${v}></wt-chip>`,
  StatKind: (v) => html`<wt-stat-tile kind=${v} .value=${42} .label=${v} icon="scroll"></wt-stat-tile>`,
  Place: (v) =>
    html`<wt-button
        class=${classMap({ 'char-open': true, [NAME_CLASS[v as Place]]: true })}
        label=${MAIN.name}
        style=${styleMap({ color: classColor(MAIN.classToken) ?? '' })}
      ></wt-button
      >${v === Place.Matrix ? nothing : html` <wt-character-links .character=${MAIN} place=${v}></wt-character-links>`}`,
  BrandId: (v) => html`<wt-brand-mark brand=${v} size="16"></wt-brand-mark>`,
  FormatKind: (v) => html`<wt-format kind=${v} .value=${v === FormatKind.Percent ? 0.42 : 1_234_567}></wt-format>`,
  FactionSide: (v) => html`<wt-faction-tag faction=${v}></wt-faction-tag>`,
  WowheadKind: (v) =>
    html`<wt-ext-link
      class="faint tiny ext-link"
      href=${wowheadUrl(v as WowheadKind, 3008)}
      site="Wowhead"
      label="3008"
      mark
    ></wt-ext-link>`,
  StateWord: (v, tr) => {
    const chip = stateChip(tr, STATE_OF[v as StateWord], v === StateWord.Done, v === StateWord.Levelling ? 63 : 80)
    return chip
      ? html`<wt-chip
          tone=${chip.tone ?? nothing}
          icon=${chip.icon ?? nothing}
          label=${chip.label}
          data-tip=${chip.tip ?? nothing}
        ></wt-chip>`
      : html`${nothing}`
  }
}

const section = (entry: EnumEntry, tr: Translator) => html`
  <section style="display: grid; gap: var(--s2)">
    <h3 style="margin: 0; display: flex; align-items: baseline; gap: var(--s3)">
      <code>${entry.name}</code>
      <code class="tiny faint">${entry.module}</code>
    </h3>
    <p class="muted" style="margin: 0">${entry.about}</p>
    <div style="display: grid; grid-template-columns: max-content max-content 1fr; gap: var(--s2) var(--s5); align-items: center">
      ${Object.values(entry.values).map(
        (value) => html`
          <code class="tiny">${memberOf(entry.name, entry.values, value)}</code>
          <code class="tiny faint">'${value}'</code>
          <div>${SAMPLES[entry.name]?.(value, tr) ?? nothing}</div>
        `
      )}
    </div>
  </section>
`

/** The whole catalog, one section for each enum. */
export const Catalog: StoryObj = {
  render: (_args, context) => {
    const tr = translatorFor(context)
    return html`<div style="display: grid; gap: var(--s6); max-width: 720px">${ENUMS.map((entry) => section(entry, tr))}</div>`
  }
}
