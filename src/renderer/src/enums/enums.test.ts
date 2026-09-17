/**
 * Tests for the foundation enums: the severities, the class tokens and the
 * shared words. A member's value is the word the stylesheet, the store or
 * the addon uses, the tables keyed by the enum cover every member, and the
 * helpers read a bare string off a snapshot without a cast.
 *
 */

import { expect, it } from 'vitest'
import { SEVERITY_ICON, Severity, severityClasses } from './severity'
import { CONTROL_ICON, ControlSize } from './controlSize'
import { IconSize } from './iconSize'
import { CLASS_ABBR, CLASS_COLORS, ClassToken, classAbbr, classColor, isClassToken } from './classToken'
import { REGIONS, Region } from '../../../shared/enums/region'
import { ThemeSetting } from '../../../shared/enums/themeSetting'
import { GOAL_KINDS, GoalKind } from '../../../shared/enums/goalKind'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { VAULT_ORDER } from '../../../shared/vault'
/** The values of a string enum are distinct words, and each is one word the stylesheet can carry. */
function isWordEnum(values: Record<string, string>, pattern: RegExp) {
  const list = Object.values(values)
  expect(new Set(list).size).toBe(list.length)
  for (const value of list) expect(value).toMatch(pattern)
}

/* ---- severity ---- */

it('the severities are four words, from quiet to loud', () => {
  expect(Object.values(Severity)).toEqual(['info', 'ok', 'warn', 'danger'])
  isWordEnum(Severity, /^[a-z]+$/)
})

it('a member is written in PascalCase and reads as its word', () => {
  expect(Severity.Info).toBe('info')
  expect(Severity.Danger).toBe('danger')
  for (const name of Object.keys(Severity)) expect(name).toMatch(/^[A-Z][a-z]+$/)
})

it('every severity has a mark', () => {
  expect(Object.keys(SEVERITY_ICON)).toEqual(Object.values(Severity))
  expect(SEVERITY_ICON[Severity.Ok]).toBe('check')
})

it('the host classes name the severity, none for info', () => {
  expect(severityClasses(Severity.Warn)).toEqual({ ok: false, warn: true, danger: false })
  expect(severityClasses(Severity.Info)).toEqual({ ok: false, warn: false, danger: false })
  expect(severityClasses(undefined)).toEqual({ ok: false, warn: false, danger: false })
  // A wider palette passes through: the chip's own tones set no severity class.
  expect(severityClasses('accent')).toEqual({ ok: false, warn: false, danger: false })
})

/* ---- class tokens ---- */

it('the class tokens are the thirteen the addons save', () => {
  expect(Object.values(ClassToken).length).toBe(13)
  isWordEnum(ClassToken, /^[A-Z]+$/)
  expect(ClassToken.DeathKnight).toBe('DEATHKNIGHT')
})

it('the colour and abbreviation tables cover every token', () => {
  expect(Object.keys(CLASS_COLORS)).toEqual(Object.values(ClassToken))
  expect(Object.keys(CLASS_ABBR)).toEqual(Object.values(ClassToken))
  for (const token of Object.values(ClassToken)) expect(CLASS_COLORS[token]).toMatch(/^#[0-9a-f]{6}$/)
})

it('a snapshot token is checked, not cast', () => {
  expect(isClassToken('MAGE')).toBe(true)
  expect(isClassToken('mage')).toBe(false)
  expect(isClassToken(null)).toBe(false)
  expect(isClassToken(undefined)).toBe(false)
})

it('the abbreviation falls back to the first letters of the name', () => {
  expect(classAbbr(ClassToken.DeathKnight, 'Death Knight')).toBe('DK')
  expect(classAbbr('DEATHKNIGHT', 'Death Knight')).toBe('DK')
  expect(classAbbr(null, 'Tinker')).toBe('TIN')
  expect(classAbbr('TINKER', '')).toBe('?')
})

it('the colour is the theme token with the class colour as fallback', () => {
  expect(classColor(ClassToken.Priest)).toBe('var(--class-priest, #ffffff)')
  expect(classColor('TINKER')).toBe(undefined)
  expect(classColor(null)).toBe(undefined)
})

/* ---- scales ---- */

it('the icon scale is five steps, and every control size takes one', () => {
  expect(Object.values(IconSize)).toEqual(['xs', 'sm', 'md', 'lg', 'xl'])
  isWordEnum(IconSize, /^[a-z]{2}$/)
  expect(Object.keys(CONTROL_ICON)).toEqual(Object.values(ControlSize))
  for (const size of Object.values(ControlSize)) expect(Object.values(IconSize)).toContain(CONTROL_ICON[size])
})

/* ---- shared words ---- */

it('the shared words are the ones the store and the addons write', () => {
  expect(REGIONS).toEqual(['eu', 'us', 'kr', 'tw'])
  expect(Object.values(Region)).toEqual(REGIONS)
  expect(Object.values(ThemeSetting)).toEqual(['light', 'dark', 'system'])
  expect(GOAL_KINDS).toEqual(['vaultSlots', 'vaultDungeon', 'vaultRaid', 'vaultWorld', 'mythicRuns', 'raidBosses'])
  expect(Object.values(GoalKind)).toEqual(GOAL_KINDS)
})

it('the vault rows are in the order the game lists them', () => {
  expect(VAULT_ORDER).toEqual(['raid', 'dungeon', 'world'])
  expect(Object.values(VaultCategory)).toEqual(VAULT_ORDER)
})

