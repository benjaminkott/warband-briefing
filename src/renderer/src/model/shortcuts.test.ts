/**
 * Tests for the keyboard's table: which stroke asks for which command,
 * what a field that has the focus keeps for itself, how a stroke reads in
 * a tooltip, and the walk along the tabs.
 */

import { expect, it } from 'vitest'
import { BINDINGS, bindingFor, countsWhileTyping, keysOf, sameStroke, shortcutRows, strokeLabel, strokesOf } from './shortcuts'
import { Tab, tabAfter } from '../enums/tab'
import { Command } from '../enums/command'
import type { Binding, Stroke } from './shortcuts'
import { createTranslator } from '../../../shared/i18n/index'
const de = createTranslator('de')
const en = createTranslator('en')

const commandOf = (stroke: Stroke, typing = false) => bindingFor(stroke, typing)?.command ?? null
/** The tab a binding opens; none for another command. */
const tabOf = (binding: Binding | null | undefined) => (binding?.command === Command.OpenTab ? binding.tab : undefined)

/* ---- the table ---- */

it('every stroke asks for one command', () => {
  expect(BINDINGS.every((a, i) => BINDINGS.every((b, j) => i === j || !sameStroke(a.stroke, b.stroke)))).toEqual(true)
})
it('the trail: Alt with an arrow', () => {
  expect([commandOf({ key: 'ArrowLeft', alt: true }), commandOf({ key: 'ArrowRight', alt: true })]).toEqual([Command.Back, Command.Forward])
})
it('a page: a bare arrow', () => {
  expect([commandOf({ key: 'ArrowLeft' }), commandOf({ key: 'ArrowRight' })]).toEqual([Command.PrevCharacter, Command.NextCharacter])
})
it('Escape closes the page', () => {
  expect(commandOf({ key: 'Escape' })).toEqual(Command.ClosePage)
})
it('Ctrl+R and F5 read again', () => {
  expect([commandOf({ key: 'r', ctrl: true }), commandOf({ key: 'F5' })]).toEqual([Command.Reread, Command.Reread])
})
it('the re-read row names both', () => {
  expect(strokesOf(Command.Reread).map((s) => s.key)).toEqual(['r', 'F5'])
})
it('Ctrl+Tab flips to the last tab', () => {
  expect(commandOf({ key: 'Tab', ctrl: true })).toEqual(Command.LastTab)
})
it('Ctrl with Page Down or Page Up walks the bar', () => {
  expect([commandOf({ key: 'PageDown', ctrl: true }), commandOf({ key: 'PageUp', ctrl: true })]).toEqual([Command.NextTab, Command.PrevTab])
})
it("a bare Tab is the browser's focus walk, not a command", () => {
  expect(commandOf({ key: 'Tab' })).toEqual(null)
})

/* ---- the tabs by digit ---- */

it('a bare digit opens the tab at that position of the bar', () => {
  expect(Object.values(Tab).map((_, index) => tabOf(bindingFor({ key: String(index + 1) })))).toEqual(Object.values(Tab))
})
it('Ctrl with the digit opens the same tab', () => {
  expect(Object.values(Tab).map((_, index) => tabOf(bindingFor({ key: String(index + 1), ctrl: true })))).toEqual(Object.values(Tab))
})
it('the roster is the first tab', () => {
  expect(tabOf(bindingFor({ key: '1' }))).toEqual(Tab.Roster)
})
it('Ctrl+, opens the settings', () => {
  expect(tabOf(bindingFor({ key: ',', ctrl: true }))).toEqual(Tab.Settings)
})
it('a digit past the bar is nothing', () => {
  expect([commandOf({ key: '7' }), commandOf({ key: '7', ctrl: true })]).toEqual([null, null])
})

/* ---- the search ---- */

it('Ctrl+F is the search', () => {
  expect(commandOf({ key: 'f', ctrl: true })).toEqual(Command.Search)
})
it('Ctrl+F with Caps Lock on is the search too', () => {
  expect(commandOf({ key: 'F', ctrl: true })).toEqual(Command.Search)
})
it('the slash is the search', () => {
  expect(commandOf({ key: '/' })).toEqual(Command.Search)
})
// A German keyboard makes the slash with Shift; the character already says so.
it('the slash with Shift held is the search too', () => {
  expect(commandOf({ key: '/', shift: true })).toEqual(Command.Search)
})

/* ---- a field with the focus ---- */

it('typing keeps a bare slash', () => {
  expect(commandOf({ key: '/' }, true)).toEqual(null)
})
it('typing keeps a bare digit', () => {
  expect(commandOf({ key: '2' }, true)).toEqual(null)
})
it('typing lets Ctrl with a digit through', () => {
  expect(tabOf(bindingFor({ key: '2', ctrl: true }, true))).toEqual(Tab.Tasks)
})
it('typing keeps the arrows', () => {
  expect(commandOf({ key: 'ArrowLeft' }, true)).toEqual(null)
})
it('typing keeps Escape', () => {
  expect(commandOf({ key: 'Escape' }, true)).toEqual(null)
})
it('typing lets Ctrl through', () => {
  expect(commandOf({ key: 'f', ctrl: true }, true)).toEqual(Command.Search)
})
it('typing lets Alt through', () => {
  expect(commandOf({ key: 'ArrowLeft', alt: true }, true)).toEqual(Command.Back)
})
it('typing lets a function key through', () => {
  expect(commandOf({ key: 'F5' }, true)).toEqual(Command.Reread)
})
it('the rule in one place', () => {
  expect([countsWhileTyping({ key: 'a' }), countsWhileTyping({ key: 'a', ctrl: true }), countsWhileTyping({ key: 'F12' })]).toEqual([
    false,
    true,
    true
  ])
})

/* ---- the words ---- */

it('a stroke reads in German', () => {
  expect(strokeLabel({ key: '1', ctrl: true }, de)).toEqual('Strg+1')
})
it('a stroke reads in English', () => {
  expect(strokeLabel({ key: '1', ctrl: true }, en)).toEqual('Ctrl+1')
})
it('the modifiers come first, Ctrl, Alt, Shift', () => {
  expect(strokeLabel({ key: 'Tab', ctrl: true, shift: true }, de)).toEqual('Strg+Umschalt+Tab')
})
it('a page key is short', () => {
  expect(strokeLabel({ key: 'PageDown', ctrl: true }, en)).toEqual('Ctrl+PgDn')
})
it('an arrow is its sign', () => {
  expect(strokeLabel({ key: 'ArrowLeft', alt: true }, en)).toEqual('Alt+←')
})
it('Escape is short', () => {
  expect(strokeLabel({ key: 'Escape' }, en)).toEqual('Esc')
})
it('a letter is a capital', () => {
  expect(strokeLabel({ key: 'f', ctrl: true }, en)).toEqual('Ctrl+F')
})
it('a tooltip names the first stroke of a command', () => {
  expect(keysOf(Command.Search, de)).toEqual('Strg+F')
})
it("a tooltip names the tab's bare digit", () => {
  expect(keysOf(Command.OpenTab, en, Tab.Gold)).toEqual('3')
})
it('a command without a stroke has no word', () => {
  expect(keysOf(Command.OpenTab, en)).toEqual('')
})

/* ---- the list ---- */

it('a command with two strokes is one row', () => {
  expect(strokesOf(Command.Search).length).toEqual(2)
})
it('the settings has three strokes', () => {
  expect(strokesOf(Command.OpenTab, Tab.Settings).map((s) => s.key)).toEqual(['6', '6', ','])
})
const rows = shortcutRows()
it('the list has one row per command and tab', () => {
  expect(rows.length).toEqual(BINDINGS.length - Object.values(Tab).length - 3)
})
it("the list keeps the table's order", () => {
  expect(rows[0].command).toEqual(Command.Back)
})
it('the search row carries both strokes', () => {
  expect(rows.find((row) => row.command === Command.Search)!.strokes.map((s) => s.key)).toEqual(['f', '/'])
})

/* ---- the walk along the tabs ---- */

it('the next tab', () => {
  expect(tabAfter(Tab.Roster, 1)).toEqual(Tab.Tasks)
})
it('the last tab wraps to the first', () => {
  expect(tabAfter(Tab.Settings, 1)).toEqual(Tab.Roster)
})
it('the first tab wraps back to the last', () => {
  expect(tabAfter(Tab.Roster, -1)).toEqual(Tab.Settings)
})
