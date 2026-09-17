/**
 * The shape of `components/`, as AGENTS.md says it: one element for each
 * file, the file named as its class without the `Wt` (`DetailBags.ts` holds
 * `WtDetailBags`, which is `wt-detail-bags`), a model beside a view is
 * `model.ts`, and every file without an element is one of those models. A
 * file that grows a second element is red here, not a debt that waits.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const ROOT = path.dirname(fileURLToPath(import.meta.url))

function* sources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) yield* sources(full)
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.stories.ts')) yield full
  }
}

interface Element {
  tag: string
  className: string
}

/** The elements a file declares: each tag with the class it is on. */
function elements(file: string): Element[] {
  const text = readFileSync(file, 'utf8')
  return Array.from(text.matchAll(/@customElement\('([^']+)'\)\s*export class (\w+)/g), (m) => ({
    tag: m[1]!,
    className: m[2]!
  }))
}

/** `WtDetailBags` as the tag is written: `wt-detail-bags`. */
function kebab(className: string): string {
  return className.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()).slice(1)
}

it('one element for each file', () => {
  const crowded = Array.from(sources(ROOT))
    .filter((file) => elements(file).length > 1)
    .map(
      (file) =>
        `${path.relative(ROOT, file)}: ${elements(file)
          .map((e) => e.tag)
          .join(', ')}`
    )
  expect(crowded).toEqual([])
})

it('the file is named as its class, the tag is the class in kebab case; a file without an element is a model', () => {
  for (const file of sources(ROOT)) {
    const name = path.basename(file, '.ts')
    const [element] = elements(file)
    if (!element) {
      expect(name, file).toBe('model')
      continue
    }
    expect(element.className, file).toBe(`Wt${name}`)
    expect(element.tag, file).toBe(kebab(element.className))
  }
})
