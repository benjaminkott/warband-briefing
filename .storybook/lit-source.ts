import { nothing } from 'lit'

/**
 * The code block of a docs page shows what a story wrote, not what the DOM
 * holds after the render. Storybook's own snippet is `innerHTML` of the
 * rendered tree: the decorators' wrappers around it, a boolean attribute as
 * `small=""`, and no property binding at all, because `.note=${…}` never
 * reaches an attribute. This module writes the Lit template back out from
 * its `strings` and `values`: a bound attribute becomes `name="value"`, a
 * bound boolean is there or not, a property or an event keeps its `${…}`
 * with a short literal, and a nested `html` template is printed in place.
 */

/** A binding at the end of a static part: the whitespace, the sigil, the name, an open quote. */
const BINDING = /(\s+)([.?@]?)([\w-]+)=(["']?)$/

/** A literal longer than this collapses to `[…]` or `{…}`. */
const LITERAL_WIDTH = 60
/** A list or object with more entries than this collapses without a look inside. */
const LITERAL_ENTRIES = 8

interface Template {
  _$litType$: 1 | 2
  strings: readonly string[]
  values: readonly unknown[]
}

interface Directive {
  _$litDirective$: unknown
  values: readonly unknown[]
}

/** The story context the transform sees: the story's own render function and its args. */
export interface SourceContext {
  args: Record<string, unknown>
  originalStoryFn?: (args: Record<string, unknown>, context: SourceContext) => unknown
}

/** The story's template as source: the decorators' wrappers are not part of it. */
export function storySource(context: SourceContext): string {
  if (!context.originalStoryFn) return ''
  return litSource(context.originalStoryFn(context.args, context))
}

/** A template result, or what a render function returns, as Lit source text. */
export function litSource(value: unknown): string {
  return child(value, '')
}

function isTemplate(value: unknown): value is Template {
  return typeof value === 'object' && value !== null && '_$litType$' in value && 'strings' in value
}

function isDirective(value: unknown): value is Directive {
  return typeof value === 'object' && value !== null && '_$litDirective$' in value
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

/** A value in child position, with each line after the first under `indent`. */
function child(value: unknown, indent: string): string {
  if (isTemplate(value)) return template(value).replaceAll('\n', `\n${indent}`)
  if (Array.isArray(value)) {
    const parts = value.map((item) => child(item, indent)).filter((part) => part !== '')
    return parts.join(value.some(isTemplate) ? `\n${indent}` : '')
  }
  if (value === nothing || value == null) return ''
  if (isPrimitive(value)) return String(value)
  return '${…}'
}

/** The template dedented: the first line at column 0, the others relative to it. */
function template(result: Template): string {
  const { strings, values } = result
  let out = ''
  let closingQuote = ''
  for (let i = 0; i < strings.length; i++) {
    let part = strings[i]!
    if (closingQuote && part.startsWith(closingQuote)) part = part.slice(1)
    closingQuote = ''
    if (i === values.length) {
      out += part
      break
    }
    const value = values[i]
    const binding = BINDING.exec(part)
    if (!binding) {
      out += part
      out += child(value, indentOf(out))
      continue
    }
    const [, space, sigil, name, quote] = binding
    closingQuote = quote!
    out += part.slice(0, binding.index)
    if (sigil === '?') {
      if (value) out += `${space}${name}`
    } else if (sigil === '') {
      const plain = attributeValue(value)
      if (plain === undefined) continue
      if (isPrimitive(plain)) out += `${space}${name}="${String(plain).replaceAll('"', '&quot;')}"`
      else out += `${space}${name}=\${${literal(plain, indentOf(out + space))}}`
    } else {
      out += `${space}${sigil}${name}=\${${literal(value, indentOf(out + space))}}`
    }
  }
  return dedent(out)
}

/** What an attribute binding sets, or `undefined` when it sets nothing; `ifDefined(x)` is `x`. */
function attributeValue(value: unknown): unknown {
  if (isDirective(value) && value.values.length === 1 && (isPrimitive(value.values[0]) || value.values[0] == null))
    return attributeValue(value.values[0])
  if (value === nothing || value == null) return undefined
  return value
}

/** The whitespace at the start of the last line of `text`. */
function indentOf(text: string): string {
  return /(?:^|\n)([ \t]*)[^\n]*$/.exec(text)?.[1] ?? ''
}

/** A short JavaScript literal for a `${…}`; a wide or deep value collapses to its shape. */
function literal(value: unknown, indent: string): string {
  if (value === nothing) return 'nothing'
  if (value == null) return String(value)
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'function') return value.name || '() => …'
  if (isTemplate(value)) {
    const tag = value._$litType$ === 2 ? 'svg' : 'html'
    return `${tag}\`${template(value).replaceAll('\n', `\n${indent}`)}\``
  }
  if (value instanceof Date) return `new Date('${value.toISOString()}')`
  if (Array.isArray(value)) {
    if (value.length > LITERAL_ENTRIES) return '[…]'
    const full = `[${value.map((item) => literal(item, indent)).join(', ')}]`
    return full.length <= LITERAL_WIDTH ? full : '[…]'
  }
  if (isDirective(value)) return '…'
  if (typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    const entries = Object.entries(value)
    if (entries.length > LITERAL_ENTRIES) return '{…}'
    if (entries.length === 0) return '{}'
    const full = `{ ${entries.map(([key, item]) => `${key}: ${literal(item, indent)}`).join(', ')} }`
    return full.length <= LITERAL_WIDTH ? full : '{…}'
  }
  return '…'
}

/**
 * Take the indentation of the source file off. A template that starts on
 * the `html\`` line keeps its first line as it is and the other lines lose
 * their common indent; a template that starts on the next line loses the
 * common indent of every line. A blank last line goes.
 */
function dedent(text: string): string {
  const lines = text.split('\n')
  if (lines.length > 1 && lines.at(-1)!.trim() === '') lines.pop()
  const firstOnOwnLine = lines[0]!.trim() === ''
  if (firstOnOwnLine) lines.shift()
  const measured = firstOnOwnLine ? lines : lines.slice(1)
  const width = Math.min(...measured.filter((line) => line.trim() !== '').map((line) => /^[ \t]*/.exec(line)![0].length))
  if (!Number.isFinite(width) || width === 0) return lines.join('\n')
  return lines
    .map((line, i) => (i === 0 && !firstOnOwnLine ? line : line.slice(Math.min(width, /^[ \t]*/.exec(line)![0].length))))
    .join('\n')
}
