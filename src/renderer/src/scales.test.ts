/**
 * Every distance, type size, line height, tracking and radius in the
 * renderer is a step of a scale in `styles.css` - a page whose gaps are
 * 6, 7, 9 and 13 reads as unaligned however carefully each box was
 * placed. This test reads the stylesheet and the `static styles` of every
 * element and lists each declaration of those properties that writes a
 * number where a token belongs. The scales themselves, in `:root`, are
 * the one place a number is written.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

/** The properties whose value is a step of a scale. */
const SCALED = /^(gap|row-gap|column-gap|padding(-[a-z]+)?|margin(-[a-z]+)?|font-size|line-height|letter-spacing|border-radius)$/

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) yield* files(full)
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.stories.ts')) yield full
  }
}

/** The `css\`…\`` blocks of a module: the element's own sheet. */
function sheetsOf(text: string): string[] {
  return [...text.matchAll(/css`([^`]*)`/g)].map((m) => m[1])
}

/** The stylesheet without its `:root` blocks, where the scales are set. */
function withoutRoot(css: string): string {
  return css.replace(/^:root[^{]*\{[^}]*\}/gm, '')
}

/**
 * A value is on a scale when every number in it is a token, a zero, a
 * factor in a `calc()`, a hairline (`1px`, the width of a line) or a half
 * (`50%`, the round).
 */
function offScale(value: string): boolean {
  const bare = value
    .replace(/var\(--[a-z0-9-]+\)/g, '')
    .replace(/calc\(|\)/g, '')
    .replace(/-?1px|50%|1em/g, '')
    .replace(/(^|[\s(*/+-])(0|1|2|-1)(?=$|[\s)*/+-])/g, ' ')
  return /\d/.test(bare)
}

function* declarations(css: string): Generator<{ property: string; value: string }> {
  for (const m of css.matchAll(/^\s*([a-z-]+)\s*:\s*([^;{]+);/gm)) {
    const [, property, value] = m
    if (SCALED.test(property)) yield { property, value: value.trim() }
  }
}

function offenders(css: string, where: string): string[] {
  const out: string[] = []
  for (const { property, value } of declarations(css)) {
    if (offScale(value)) out.push(`${where}: ${property}: ${value}`)
  }
  return out
}

it('the stylesheet writes its distances, sizes and radii as tokens', () => {
  const css = readFileSync(path.join(ROOT, 'styles.css'), 'utf8')
  expect(offenders(withoutRoot(css), 'styles.css')).toEqual([])
})

it('every element sheet writes its distances, sizes and radii as tokens', () => {
  const out: string[] = []
  for (const file of files(path.join(ROOT, 'components'))) {
    const text = readFileSync(file, 'utf8')
    for (const sheet of sheetsOf(text)) out.push(...offenders(sheet, path.relative(ROOT, file)))
  }
  expect(out).toEqual([])
})
