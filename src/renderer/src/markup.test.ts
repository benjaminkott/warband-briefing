/**
 * Content goes to an element as its children, never through a property. A
 * binding such as `.badge=${html`<wt-chip …>`}` or `.content=${html`<span
 * class="muted">…`}` hands markup to a property; the markup belongs between
 * the element's tags, where its slot takes it. This test lists every
 * property binding in the renderer whose expression holds an `html` or
 * `svg` template. The debt is counted down: `BUDGET` is what remains, a
 * new one fails the test, a paid one lowers the number.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

/** The property bindings that still carry markup. */
const BUDGET = 55

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) yield* files(full)
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) yield full
  }
}

/**
 * Reads the `${…}` expression that starts at `from` (the index of `{`) and
 * returns its text. Braces in code, template literals with nested `${…}`
 * and quoted strings are followed, so the end is the matching brace.
 */
function expression(text: string, from: number): string {
  // One frame for each `${`: a brace count of its own, so a block body
  // inside a nested template does not close the outer expression.
  const modes: string[] = ['code']
  const depths = [0]
  let i = from + 1
  for (; i < text.length; i++) {
    const c = text[i]
    const mode = modes[modes.length - 1]
    if (mode === 'code') {
      if (c === '{') depths[depths.length - 1]++
      else if (c === '}') {
        if (depths[depths.length - 1] === 0) {
          modes.pop()
          depths.pop()
          if (modes.length === 0) break
        } else depths[depths.length - 1]--
      } else if (c === '`') modes.push('template')
      else if (c === "'" || c === '"') modes.push(c)
    } else if (mode === 'template') {
      if (c === '\\') i++
      else if (c === '`') modes.pop()
      else if (c === '$' && text[i + 1] === '{') {
        modes.push('code')
        depths.push(0)
        i++
      }
    } else if (c === '\\') i++
    else if (c === mode) modes.pop()
  }
  return text.slice(from + 1, i)
}

const PROPERTY = /\.([A-Za-z_$][\w$]*)=\$\{/g
const TEMPLATE = /\b(html|svg)`/

it(`${BUDGET} property bindings carry markup, and no more`, () => {
  const findings: string[] = []
  for (const file of files(ROOT)) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(PROPERTY)) {
      const expr = expression(text, match.index + match[0].length - 1)
      if (!TEMPLATE.test(expr)) continue
      const line = text.slice(0, match.index).split('\n').length
      const head = expr.replace(/\s+/g, ' ').trim().slice(0, 70)
      findings.push(`${path.relative(ROOT, file)}:${line}  .${match[1]}=\${${head}${expr.length > 70 ? '…' : ''}}`)
    }
  }
  expect(findings, `content goes in as children; lower BUDGET when one is paid:\n${findings.join('\n')}`).toHaveLength(BUDGET)
})
