import type { Translator } from '../../../shared/i18n'
import { Command } from '../enums/command'
import { Tab } from '../enums/tab'

/**
 * The keyboard's ways through the app. One table names every key stroke and
 * what it asks for; the shell and the views ask the table instead of
 * reading keys of their own, so a tooltip, the settings' list and the
 * handler cannot disagree about a key.
 */

/** One key with its modifiers; `key` is what the keyboard event reports. */
export interface Stroke {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
}

/** A stroke and what it asks for; a tab command names its tab. */
export type Binding =
  { stroke: Stroke; command: Command.OpenTab; tab: Tab } | { stroke: Stroke; command: Exclude<Command, Command.OpenTab> }

/**
 * The bindings, in the order the settings list them. The first binding of a
 * command is the one a tooltip names. A bare digit is a tab: the fastest
 * way there, and safe because a field that has the focus keeps its digits.
 * Ctrl with a digit is the browser's way to the same tab, Ctrl+Tab flips to
 * the tab open before this one (Alt+Tab's habit), Ctrl with Page Down or
 * Page Up walks the bar. Ctrl+R and F5 are the browser's reload, here the
 * re-read (the main process drops the menu that would take Ctrl+R first).
 * Alt with an arrow is the browser's pair for the trail; a page's own arrows
 * carry no modifier, so the two do not meet.
 */
export const BINDINGS: Binding[] = [
  { stroke: { key: 'ArrowLeft', alt: true }, command: Command.Back },
  { stroke: { key: 'ArrowRight', alt: true }, command: Command.Forward },
  ...Object.values(Tab).flatMap((tab, index): Binding[] => [
    { stroke: { key: String(index + 1) }, command: Command.OpenTab, tab },
    { stroke: { key: String(index + 1), ctrl: true }, command: Command.OpenTab, tab }
  ]),
  // The desktop's habit for the preferences, beside the digit.
  { stroke: { key: ',', ctrl: true }, command: Command.OpenTab, tab: Tab.Settings },
  { stroke: { key: 'Tab', ctrl: true }, command: Command.LastTab },
  { stroke: { key: 'PageDown', ctrl: true }, command: Command.NextTab },
  { stroke: { key: 'PageUp', ctrl: true }, command: Command.PrevTab },
  { stroke: { key: 'r', ctrl: true }, command: Command.Reread },
  { stroke: { key: 'F5' }, command: Command.Reread },
  { stroke: { key: 'f', ctrl: true }, command: Command.Search },
  { stroke: { key: '/' }, command: Command.Search },
  { stroke: { key: 'Escape' }, command: Command.ClosePage },
  { stroke: { key: 'ArrowLeft' }, command: Command.PrevCharacter },
  { stroke: { key: 'ArrowRight' }, command: Command.NextCharacter }
]

/** A stroke that is one printed character: Shift is already in the character, so it does not count. */
const printable = (stroke: Stroke): boolean => stroke.key.length === 1

const FUNCTION_KEY = /^F\d{1,2}$/

export function sameStroke(a: Stroke, b: Stroke): boolean {
  if (printable(a) !== printable(b)) return false
  const key = printable(a) ? a.key.toLowerCase() === b.key.toLowerCase() : a.key === b.key
  return (
    key &&
    Boolean(a.ctrl) === Boolean(b.ctrl) &&
    Boolean(a.alt) === Boolean(b.alt) &&
    (printable(a) || Boolean(a.shift) === Boolean(b.shift))
  )
}

/**
 * Whether a stroke still counts while the player types in a field: only
 * with Ctrl or Alt, or a function key. A bare letter, a slash, an arrow or
 * Escape belongs to the field then.
 */
export function countsWhileTyping(stroke: Stroke): boolean {
  return Boolean(stroke.ctrl || stroke.alt) || FUNCTION_KEY.test(stroke.key)
}

/** The binding a stroke matches, or null; a field that has the focus takes the keys of its own. */
export function bindingFor(stroke: Stroke, typing = false): Binding | null {
  if (typing && !countsWhileTyping(stroke)) return null
  return BINDINGS.find((binding) => sameStroke(binding.stroke, stroke)) ?? null
}

/** The strokes bound to a command, in the table's order; a tab command's are its tab's. */
export function strokesOf(command: Command, tab?: Tab): Stroke[] {
  return BINDINGS.filter((binding) => binding.command === command && (binding.command !== Command.OpenTab || binding.tab === tab)).map(
    (binding) => binding.stroke
  )
}

/** The commands in the table's order, each with its strokes: the settings' list. */
export interface ShortcutRow {
  command: Command
  tab?: Tab
  strokes: Stroke[]
}

export function shortcutRows(): ShortcutRow[] {
  const rows: ShortcutRow[] = []
  for (const binding of BINDINGS) {
    const tab = binding.command === Command.OpenTab ? binding.tab : undefined
    const row = rows.find((entry) => entry.command === binding.command && entry.tab === tab)
    if (row) row.strokes.push(binding.stroke)
    else
      rows.push(
        tab === undefined
          ? { command: binding.command, strokes: [binding.stroke] }
          : { command: binding.command, tab, strokes: [binding.stroke] }
      )
  }
  return rows
}

/** The keys that have a sign of their own; every other key is named as the event names it. */
const KEY_SIGNS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Escape: 'Esc',
  PageDown: 'PgDn',
  PageUp: 'PgUp',
  ' ': 'Space'
}

/** The words of a stroke, modifiers first, in the keyboard's language: `['Strg', '1']`. */
export function strokeParts(stroke: Stroke, tr: Translator): string[] {
  const parts: string[] = []
  if (stroke.ctrl) parts.push(tr.t('key.ctrl'))
  if (stroke.alt) parts.push(tr.t('key.alt'))
  if (stroke.shift) parts.push(tr.t('key.shift'))
  parts.push(KEY_SIGNS[stroke.key] ?? (printable(stroke) ? stroke.key.toUpperCase() : stroke.key))
  return parts
}

/** The stroke as one word for a tooltip: `Strg+1`. */
export function strokeLabel(stroke: Stroke, tr: Translator): string {
  return strokeParts(stroke, tr).join('+')
}

/** The first stroke of a command as a word for a tooltip, or an empty string for a command without one. */
export function keysOf(command: Command, tr: Translator, tab?: Tab): string {
  const stroke = strokesOf(command, tab)[0]
  return stroke ? strokeLabel(stroke, tr) : ''
}

/** A keyboard event as a stroke. */
export function strokeOf(event: KeyboardEvent): Stroke {
  return { key: event.key, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey }
}

/** Whether the event comes from a field the player types in, or from an open menu that walks its own keys. */
export function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || Boolean(target.closest('.select-menu'))
}

/** The binding a keyboard event asks for, or null. */
export function bindingOf(event: KeyboardEvent): Binding | null {
  return bindingFor(strokeOf(event), isTyping(event))
}
