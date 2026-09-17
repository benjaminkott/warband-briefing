/**
 * Tests for the docs' code block: a story's Lit template written back out
 * as source, with its bindings, without the decorators' wrappers.
 */

import { expect, it } from 'vitest'
import { litSource, storySource } from './lit-source'
import { html, nothing, svg } from 'lit'
import { ifDefined } from 'lit/directives/if-defined.js'
import { classMap } from 'lit/directives/class-map.js'

// Attributes: a bound string is quoted, a bound `nothing` is not there, a
// bound boolean is a bare name or nothing.
it('an args story reads as its template with the values filled in', () => {
  const icon: string | undefined = undefined
  expect(
    litSource(
      html`<wt-chip
        label=${'Vault-Fächer'}
        icon=${icon ?? nothing}
        .note=${'5/6'}
        tone=${'warn'}
        ?small=${false}
        ?numeric=${true}
      ></wt-chip>`
    )
  ).toBe(`<wt-chip
  label="Vault-Fächer"
  .note=\${'5/6'}
  tone="warn"
  numeric
></wt-chip>`)
})
it('a quoted binding keeps one pair of quotes', () => {
  expect(litSource(html`<a href="${'x'}" class="${nothing}">y</a>`)).toBe('<a href="x">y</a>')
})
it('a number is an attribute value', () => {
  expect(litSource(html`<wt-bar value=${3}></wt-bar>`)).toBe('<wt-bar value="3"></wt-bar>')
})
it('a quote in a value is escaped', () => {
  expect(litSource(html`<i data-tip=${'say "hi"'}></i>`)).toBe('<i data-tip="say &quot;hi&quot;"></i>')
})
it('ifDefined shows the value it wraps', () => {
  expect(litSource(html`<i a=${ifDefined('x')} b=${ifDefined(undefined)}></i>`)).toBe('<i a="x"></i>')
})
it('a partial attribute value is text in place', () => {
  expect(litSource(html`<i style="color: ${'red'}; ${'x'}"></i>`)).toBe('<i style="color: red; x"></i>')
})

// Properties and events keep the `${…}` with a short literal.
it('a property takes a literal', () => {
  expect(litSource(html`<i .items=${['a', 'b']} .n=${2} .on=${true} .none=${null}></i>`)).toBe(
    "<i .items=${['a', 'b']} .n=${2} .on=${true} .none=${null}></i>"
  )
})
it('a small object is spelled out', () => {
  expect(litSource(html`<i .character=${{ name: 'Nyx', level: 80 }}></i>`)).toBe("<i .character=${{ name: 'Nyx', level: 80 }}></i>")
})
it('a wide object collapses', () => {
  expect(litSource(html`<i .character=${{ name: 'Nyxaria', realm: 'Blackmoore', className: 'Magier', level: 80 }}></i>`)).toBe(
    '<i .character=${{…}}></i>'
  )
})
it('a long list collapses', () => {
  expect(litSource(html`<i .rows=${Array.from({ length: 20 }, (_, i) => i)}></i>`)).toBe('<i .rows=${[…]}></i>')
})
it('a named function is its name', () => {
  expect(litSource(html`<i @click=${function onClick() {}}></i>`)).toBe('<i @click=${onClick}></i>')
})
it('a date is a date', () => {
  expect(litSource(html`<i .at=${new Date('2026-03-11T06:00:00.000Z')}></i>`)).toBe("<i .at=${new Date('2026-03-11T06:00:00.000Z')}></i>")
})
it('a directive in a property is a gap', () => {
  expect(litSource(html`<i class=${classMap({ a: true })}></i>`)).toBe('<i class=${…}></i>')
})

// Children: text, nested templates, lists of templates.
it('a text child is text', () => {
  expect(litSource(html`<b>${'Nyx'} ${3}${nothing}${null}</b>`)).toBe('<b>Nyx 3</b>')
})
// prettier-ignore
it('a nested template sits on the line it is on', () => {
  expect(litSource(html`<div class="row">
    ${['a', 'b'].map((label) => html`<wt-chip label=${label}></wt-chip>`)}
  </div>`)).toBe(`<div class="row">
  <wt-chip label="a"></wt-chip>
  <wt-chip label="b"></wt-chip>
</div>`)
})
// prettier-ignore
it('a nested multi-line template is indented with its line', () => {
  expect(litSource(html`<div>
    ${html`<p>
      one
    </p>`}
  </div>`)).toBe(`<div>
  <p>
    one
  </p>
</div>`)
})
// prettier-ignore
it('a template in a property is printed in place', () => {
  expect(litSource(html`<wt-card .content=${html`<b>x</b>`} .footer=${html`<i>
      y
    </i>`}></wt-card>`)).toBe(`<wt-card .content=\${html\`<b>x</b>\`} .footer=\${html\`<i>
  y
</i>\`}></wt-card>`)
})
it('an svg template is svg', () => {
  expect(litSource(html`<i .icon=${svg`<circle r="1"></circle>`}></i>`)).toBe('<i .icon=${svg`<circle r="1"></circle>`}></i>')
})
it('a template that starts on its own line loses the common indent', () => {
  expect(
    litSource(html`
      <ul>
        <li>a</li>
      </ul>
    `)
  ).toBe(`<ul>
  <li>a</li>
</ul>`)
})
it('a list of strings is one text', () => {
  expect(litSource(html`<b>${['a', 'b']}</b>`)).toBe('<b>ab</b>')
})
it('a render that returns nothing is empty', () => {
  expect(litSource(nothing)).toBe('')
})

// The story hook: the story's own render, not the decorated one.
it('storySource calls the story render with its args', () => {
  expect(storySource({ args: { label: 'x' }, originalStoryFn: (args) => html`<wt-chip label=${args.label}></wt-chip>` })).toBe(
    '<wt-chip label="x"></wt-chip>'
  )
})
it('storySource without a render is empty', () => {
  expect(storySource({ args: {} })).toBe('')
})
