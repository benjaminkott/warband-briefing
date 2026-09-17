/**
 * Tiny translation layer shared by the main process and the renderer.
 *
 * `de` is the reference dictionary; every other locale is typed against its key
 * set, so a forgotten string is a compile error rather than a German word
 * leaking into an English UI.
 */

import { de, type TranslationKey } from './de'
import { en } from './en'
import { SystemLanguage } from '../enums/systemLanguage'

export type { TranslationKey }

export const LOCALES = ['de', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** What the user picked; `system` follows the OS. */
export type LanguageSetting = Locale | SystemLanguage

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { de, en }

/** BCP-47 tags for Intl formatting. */
const INTL_TAGS: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' }

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/**
 * Maps OS locales such as `de-AT` or `en_US` onto a supported locale.
 *
 * Accepts the OS's whole preference list; the first entry we actually speak
 * wins, so a `['fr-FR', 'de-DE']` user gets German rather than the English
 * fallback.
 */
export function resolveSystemLocale(systemLocale: string | readonly string[] | undefined): Locale {
  const candidates = typeof systemLocale === 'string' ? [systemLocale] : (systemLocale ?? [])
  for (const candidate of candidates) {
    const primary = candidate.toLowerCase().replace('_', '-').split('-')[0]
    if (isLocale(primary)) return primary
  }
  return 'en'
}

export function resolveLocale(setting: LanguageSetting, systemLocale?: string | readonly string[]): Locale {
  return setting === SystemLanguage.System ? resolveSystemLocale(systemLocale) : setting
}

export function intlTag(locale: Locale): string {
  return INTL_TAGS[locale]
}

export type TranslateParams = Record<string, string | number>

/** Looks up a key and fills `{placeholders}`. Unknown keys return the key itself. */
export function t(locale: Locale, key: TranslationKey, params?: TranslateParams): string {
  const template = DICTIONARIES[locale]?.[key] ?? DICTIONARIES.en[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/**
 * Plural helper for the `<key>.one` / `<key>.other` convention.
 * German and English share the same one/other split, which is all this app needs.
 */
export function tPlural(locale: Locale, baseKey: string, count: number, params?: TranslateParams): string {
  const key = `${baseKey}.${count === 1 ? 'one' : 'other'}` as TranslationKey
  return t(locale, key, { count, ...params })
}

/** Bound translator, so components do not have to pass the locale around. */
export interface Translator {
  locale: Locale
  t: (key: TranslationKey, params?: TranslateParams) => string
  plural: (baseKey: string, count: number, params?: TranslateParams) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDateTime: (value: number, options?: Intl.DateTimeFormatOptions) => string
  compare: (a: string, b: string) => number
}

/**
 * A formatter for each set of options, built once. An Intl formatter is
 * expensive to construct and cheap to use, and the views format thousands
 * of figures on every render; the sort comparators compare names on every
 * step. The options are keyed by their JSON, which is small and stable.
 */
function cached<F, O>(build: (options: O | undefined) => F): (options?: O) => F {
  const formatters = new Map<string, F>()
  return (options) => {
    const key = options ? JSON.stringify(options) : ''
    let formatter = formatters.get(key)
    if (!formatter) {
      formatter = build(options)
      formatters.set(key, formatter)
    }
    return formatter
  }
}

export function createTranslator(locale: Locale): Translator {
  const tag = intlTag(locale)
  const numbers = cached((options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(tag, options))
  const dates = cached(
    (options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag, options ?? { dateStyle: 'short', timeStyle: 'short' })
  )
  const collator = new Intl.Collator(tag)
  return {
    locale,
    t: (key, params) => t(locale, key, params),
    plural: (baseKey, count, params) => tPlural(locale, baseKey, count, params),
    formatNumber: (value, options) => numbers(options).format(value),
    formatDateTime: (value, options) => dates(options).format(new Date(value)),
    compare: (a, b) => collator.compare(a, b)
  }
}

/* ---------------- domain helpers ---------------- */

/** Blizzard difficulty ids mapped onto translation keys. */
const DIFFICULTY_KEYS: Record<number, TranslationKey> = {
  1: 'difficulty.normal',
  2: 'difficulty.heroic',
  3: 'difficulty.normal',
  4: 'difficulty.normal',
  5: 'difficulty.heroic',
  6: 'difficulty.heroic',
  7: 'difficulty.lfr',
  8: 'difficulty.mythicPlus',
  14: 'difficulty.normal',
  15: 'difficulty.heroic',
  16: 'difficulty.mythic',
  17: 'difficulty.lfr',
  23: 'difficulty.mythic',
  24: 'difficulty.timewalking',
  33: 'difficulty.timewalking'
}

const DIFFICULTY_SHORT_KEYS: Record<number, TranslationKey> = {
  1: 'difficulty.short.normal',
  2: 'difficulty.short.heroic',
  3: 'difficulty.short.normal',
  4: 'difficulty.short.normal',
  5: 'difficulty.short.heroic',
  6: 'difficulty.short.heroic',
  7: 'difficulty.short.lfr',
  14: 'difficulty.short.normal',
  15: 'difficulty.short.heroic',
  16: 'difficulty.short.mythic',
  17: 'difficulty.short.lfr',
  23: 'difficulty.short.mythic'
}

/**
 * Difficulty label for a lockout.
 * `id` comes from the client and is language independent; `fallback` is the
 * localized name the addon captured, used when the id is unknown to us.
 */
export function difficultyLabel(translator: Translator, id: number | null, fallback: string, short = false): string {
  const key = id !== null ? (short ? DIFFICULTY_SHORT_KEYS[id] : DIFFICULTY_KEYS[id]) : undefined
  if (key) return translator.t(key)
  if (fallback) return fallback
  return translator.t('difficulty.unknown', { id: id ?? '?' })
}

/** Vault reward tier label for the raid row, which is keyed by difficulty order. */
export function raidTierLabel(translator: Translator, level: number): string {
  const keys: TranslationKey[] = ['difficulty.short.lfr', 'difficulty.short.normal', 'difficulty.short.heroic', 'difficulty.short.mythic']
  const key = keys[level - 1]
  return key ? translator.t(key) : translator.t('vault.tier', { level })
}
