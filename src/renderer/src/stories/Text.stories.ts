import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { ClassToken, classColor } from '../enums/classToken'
import '../components/Icon'
import { IconSize } from '../enums/iconSize'

/**
 * The text rules of the stylesheet, not an element: the classes a template
 * puts on a span, the inks the tokens define, the type scale. One place to
 * see that a colour reads on both grounds.
 */
const meta: Meta = {
  title: 'Foundations/Text'
}

export default meta

/** A row of the sheet: what to write, and how it looks. */
const row = (name: string, sample: unknown) => html`
  <code class="tiny" style="justify-self: start">${name}</code>
  <div>${sample}</div>
`

const sheet = (rows: unknown[]) =>
  html`<div
    style="display: grid; grid-template-columns: max-content 1fr; gap: var(--s2) var(--s5); align-items: baseline; max-width: 640px"
  >
    ${rows}
  </div>`

const CLASSES: { name: string; text: string }[] = [
  { name: '(none)', text: 'Mistcrest · Blackmoore · Gnom Magier' },
  { name: '.muted', text: 'Zuletzt gelesen vor 3 Minuten' },
  { name: '.faint', text: 'Stufe 74 · WOW1' },
  { name: '.tiny', text: 'bis Do., 00:32' },
  { name: '.tiny.faint', text: 'Datenquelle: WeeklyKnowledge' },
  { name: '.info-text', text: 'Noch nicht gelesen' },
  { name: '.ok-text', text: 'Vault voll' },
  { name: '.warn-text', text: 'Noch 2 Fächer offen' },
  { name: '.danger-text', text: 'Verfällt beim Reset' },
  { name: '.label', text: 'Diese Woche' },
  { name: '.num', text: '1.234.567 · 12/12 · +14' }
]

/**
 * Every class a span can wear. A severity class sets its `-text` ink on
 * the words and the mark on an icon inside; a lone icon with the class is
 * the mark.
 */
export const Classes: StoryObj = {
  render: () =>
    sheet([
      ...CLASSES.map(({ name, text }) =>
        row(name, html`<span class=${name === '(none)' ? '' : name.replace(/\./g, ' ').trim()}>${text}</span>`)
      ),
      row('.ok-text + .icon', html`<span class="ok-text"><wt-icon name="check" size=${IconSize.Sm}></wt-icon> Addon installiert</span>`),
      row('.warn-text + .icon', html`<span class="warn-text"><wt-icon name="alert" size=${IconSize.Sm}></wt-icon> 2 Fächer offen</span>`),
      row('.icon.ok-text', html`<wt-icon class="ok-text" name="check" size=${IconSize.Sm}></wt-icon>`),
      row('a', html`<a href="#">Auf Raider.IO öffnen</a>`),
      row('code', html`<code>WeeklyKnowledge.lua</code>`)
    ])
}

/**
 * Every ink the tokens define. A severity's `-text` ink also reads on its
 * `-soft` wash, so the pair shows together.
 */
const INKS: { token: string; text: string; wash?: string }[] = [
  { token: '--text', text: 'Der Grundton für Namen und Werte' },
  { token: '--text-dim', text: 'Eine Zeile, die weniger wichtig ist' },
  { token: '--text-faint', text: 'Ein Hinweis am Rand' },
  { token: '--accent', text: 'Der Akzent: ein Link, ein Wert' },
  { token: '--accent-bright', text: 'Der Akzent hell, auf einer Fläche', wash: '--accent-soft' },
  { token: '--gold', text: '1.234.567 Gold' },
  { token: '--info', text: 'Ein Hinweis' },
  { token: '--info-text', text: 'Ein Hinweis, auf grauem Grund', wash: '--info-soft' },
  { token: '--ok', text: 'Erledigt' },
  { token: '--ok-text', text: 'Erledigt, auf grünem Grund', wash: '--ok-soft' },
  { token: '--warn', text: 'Fast geschafft' },
  { token: '--warn-text', text: 'Fast geschafft, auf gelbem Grund', wash: '--warn-soft' },
  { token: '--danger', text: 'Verloren' },
  { token: '--danger-text', text: 'Verloren, auf rotem Grund', wash: '--danger-soft' },
  { token: '--key', text: 'Schlüsselstein +14' },
  { token: '--key-bright', text: 'Schlüsselstein +14, auf lila Grund', wash: '--key-soft' },
  { token: '--alliance', text: 'Allianz' },
  { token: '--horde', text: 'Horde' }
]

/** Every colour text can have, on the ground it is meant for. */
export const Inks: StoryObj = {
  render: () =>
    sheet(
      INKS.map(({ token, text, wash }) =>
        row(
          token,
          html`<span
            style="color: var(${token}); ${wash ? `background: var(${wash}); padding: 1px var(--s2); border-radius: var(--radius-xs)` : ''}"
            >${text}</span
          >`
        )
      )
    )
}

const SCALE = ['micro', 'tiny', 'base', 'body', 'title', 'name', 'figure', 'figure-lg']

/** The type scale, one line for each size token. */
export const Scale: StoryObj = {
  render: () =>
    sheet(
      SCALE.map((step) =>
        row(`--fs-${step}`, html`<span style="font-size: var(--fs-${step}); line-height: var(--lh-tight)">Mistcrest · 1.234 · +14</span>`)
      )
    )
}

/** The class colours as `classColor()` hands them out. */
export const ClassColors: StoryObj = {
  render: () =>
    sheet(
      Object.values(ClassToken).map((token) => row(token, html`<span style="color: ${classColor(token)}">Mistcrest · Blackmoore</span>`))
    )
}

/** Headings and body text as the stylesheet sets them. */
export const Headings: StoryObj = {
  render: () =>
    html`<div style="max-width: 640px">
      <h1>Überschrift 1</h1>
      <h2>Überschrift 2</h2>
      <h3>Überschrift 3</h3>
      <p>
        Fließtext in der Grundgröße. Ein Satz mit einem <a href="#">Link</a>, einem <code>Code</code> und einer
        <span class="muted">gedämpften Stelle</span>.
      </p>
    </div>`
}
