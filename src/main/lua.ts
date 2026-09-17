/**
 * Minimal parser for the Lua subset that WoW writes into SavedVariables files.
 *
 * A SavedVariables file is a sequence of top-level assignments:
 *   VarName = <value>
 * where <value> is a table constructor, string, number, boolean or nil.
 * Tables mix array-style entries with `["key"] = value` / `[7] = value` entries,
 * and the writer emits `-- [n]` trailing comments that we simply skip.
 */

export type LuaValue = string | number | boolean | null | LuaTable
export interface LuaTable {
  /** Positional entries (1-based in Lua, stored 0-based here). */
  array: LuaValue[]
  /** Keyed entries; numeric keys are stringified. */
  map: Record<string, LuaValue>
}

export function isTable(v: LuaValue | undefined): v is LuaTable {
  return !!v && typeof v === 'object' && 'array' in (v as LuaTable)
}

class Parser {
  private i = 0
  constructor(private readonly s: string) {}

  parseFile(): Record<string, LuaValue> {
    const out: Record<string, LuaValue> = {}
    this.ws()
    while (this.i < this.s.length) {
      const name = this.identifier()
      if (!name) break
      this.ws()
      this.expect('=')
      this.ws()
      out[name] = this.value()
      this.ws()
      // WoW separates top-level assignments with newlines, but tolerate `;`.
      if (this.peek() === ';') {
        this.i++
        this.ws()
      }
    }
    return out
  }

  private peek(): string {
    return this.s[this.i] ?? ''
  }

  private expect(ch: string): void {
    if (this.s[this.i] !== ch) {
      throw new Error(`Expected '${ch}' at offset ${this.i}, found '${this.peek()}'`)
    }
    this.i++
  }

  /** Skip whitespace and comments. */
  private ws(): void {
    for (;;) {
      const c = this.s[this.i]
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        this.i++
        continue
      }
      if (c === '-' && this.s[this.i + 1] === '-') {
        this.i += 2
        // Long comment --[[ ... ]] / --[==[ ... ]==]
        const long = this.tryLongBracket()
        if (long !== null) continue
        while (this.i < this.s.length && this.s[this.i] !== '\n') this.i++
        continue
      }
      return
    }
  }

  /** Reads a `[[ ... ]]` / `[==[ ... ]==]` block if one starts here. */
  private tryLongBracket(): string | null {
    if (this.s[this.i] !== '[') return null
    let j = this.i + 1
    let eq = 0
    while (this.s[j] === '=') {
      eq++
      j++
    }
    if (this.s[j] !== '[') return null
    j++
    if (this.s[j] === '\n') j++
    const close = ']' + '='.repeat(eq) + ']'
    const end = this.s.indexOf(close, j)
    if (end === -1) throw new Error(`Unterminated long bracket at offset ${this.i}`)
    const body = this.s.slice(j, end)
    this.i = end + close.length
    return body
  }

  private identifier(): string | null {
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(this.s.slice(this.i))
    if (!m) return null
    this.i += m[0].length
    return m[0]
  }

  private value(): LuaValue {
    const c = this.peek()
    if (c === '{') return this.table()
    if (c === '"' || c === "'") return this.string()
    if (c === '[') {
      const long = this.tryLongBracket()
      if (long !== null) return long
    }
    const rest = this.s.slice(this.i)
    if (/^true\b/.test(rest)) {
      this.i += 4
      return true
    }
    if (/^false\b/.test(rest)) {
      this.i += 5
      return false
    }
    if (/^nil\b/.test(rest)) {
      this.i += 3
      return null
    }
    return this.number()
  }

  private number(): number {
    const rest = this.s.slice(this.i)
    const m =
      /^-?0[xX][0-9a-fA-F]+(\.[0-9a-fA-F]*)?([pP][-+]?\d+)?/.exec(rest) ??
      /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(rest) ??
      /^-?(inf|nan)\b/.exec(rest)
    if (!m) throw new Error(`Expected a value at offset ${this.i}, found '${rest.slice(0, 20)}'`)
    this.i += m[0].length
    const text = m[0]
    if (/inf$/.test(text)) return text.startsWith('-') ? -Infinity : Infinity
    if (/nan$/.test(text)) return NaN
    return Number(text)
  }

  private string(): string {
    const quote = this.s[this.i]
    this.i++
    let out = ''
    while (this.i < this.s.length) {
      const c = this.s[this.i]
      if (c === '\\') {
        this.i++
        const e = this.s[this.i]
        switch (e) {
          case 'n':
            out += '\n'
            this.i++
            break
          case 't':
            out += '\t'
            this.i++
            break
          case 'r':
            out += '\r'
            this.i++
            break
          case 'a':
            out += '\x07'
            this.i++
            break
          case 'b':
            out += '\b'
            this.i++
            break
          case 'f':
            out += '\f'
            this.i++
            break
          case 'v':
            out += '\v'
            this.i++
            break
          case '\\':
            out += '\\'
            this.i++
            break
          case '"':
            out += '"'
            this.i++
            break
          case "'":
            out += "'"
            this.i++
            break
          case '\n':
            out += '\n'
            this.i++
            break
          case 'x': {
            const hex = /^[0-9a-fA-F]{1,2}/.exec(this.s.slice(this.i + 1))
            if (hex) {
              out += String.fromCharCode(parseInt(hex[0], 16))
              this.i += 1 + hex[0].length
            } else {
              this.i++
            }
            break
          }
          default: {
            const dec = /^\d{1,3}/.exec(this.s.slice(this.i))
            if (dec) {
              out += String.fromCharCode(parseInt(dec[0], 10))
              this.i += dec[0].length
            } else {
              out += e
              this.i++
            }
          }
        }
        continue
      }
      if (c === quote) {
        this.i++
        return out
      }
      out += c
      this.i++
    }
    throw new Error('Unterminated string')
  }

  private table(): LuaTable {
    this.expect('{')
    const t: LuaTable = { array: [], map: {} }
    this.ws()
    while (this.peek() !== '}') {
      if (this.i >= this.s.length) throw new Error('Unterminated table')
      if (this.peek() === '[') {
        // Could be a `[key] =` entry or a long-bracket string value.
        const save = this.i
        const long = this.tryLongBracket()
        if (long !== null) {
          t.array.push(long)
        } else {
          this.i = save + 1
          this.ws()
          const key = this.value()
          this.ws()
          this.expect(']')
          this.ws()
          this.expect('=')
          this.ws()
          t.map[String(key)] = this.value()
        }
      } else {
        // `name = value` or a bare positional value.
        const save = this.i
        const ident = this.identifier()
        if (ident) {
          this.ws()
          if (this.peek() === '=' && this.s[this.i + 1] !== '=') {
            this.i++
            this.ws()
            t.map[ident] = this.value()
          } else {
            this.i = save
            t.array.push(this.value())
          }
        } else {
          t.array.push(this.value())
        }
      }
      this.ws()
      if (this.peek() === ',' || this.peek() === ';') {
        this.i++
        this.ws()
      }
    }
    this.expect('}')
    return t
  }
}

export function parseSavedVariables(source: string): Record<string, LuaValue> {
  return new Parser(source).parseFile()
}

/* ---------- convenience accessors ---------- */

export function tGet(t: LuaValue | undefined, key: string): LuaValue | undefined {
  if (!isTable(t)) return undefined
  return t.map[key]
}

export function tStr(t: LuaValue | undefined, key: string, fallback = ''): string {
  const v = tGet(t, key)
  return typeof v === 'string' ? v : fallback
}

export function tNum(t: LuaValue | undefined, key: string, fallback = 0): number {
  const v = tGet(t, key)
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

export function tNumOrNull(t: LuaValue | undefined, key: string): number | null {
  const v = tGet(t, key)
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function tBool(t: LuaValue | undefined, key: string, fallback = false): boolean {
  const v = tGet(t, key)
  return typeof v === 'boolean' ? v : fallback
}

/** Returns the positional entries of `t[key]`, or [] when absent. */
export function tList(t: LuaValue | undefined, key: string): LuaValue[] {
  const v = tGet(t, key)
  if (!isTable(v)) return []
  if (v.array.length > 0) return v.array
  // Some serializers write arrays as [1]=..., [2]=...
  const numeric = Object.keys(v.map)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b))
  return numeric.map((k) => v.map[k])
}
