import type { Locale } from '../../../shared/i18n'

/** What a Wowhead page is about; the id resolves to it without a locale. */
export enum WowheadKind {
  Currency = 'currency',
  Faction = 'faction',
  Item = 'item',
  Quest = 'quest',
  /** A recipe: the client's recipe id is the spell that crafts. */
  Spell = 'spell'
}

/** The page of an entry: the way a name or an id looks the thing up, in the app's language where Wowhead has it. */
export function wowheadUrl(kind: WowheadKind, id: number, locale: Locale = 'en'): string {
  return `https://www.wowhead.com/${locale === 'en' ? '' : `${locale}/`}${kind}=${id}`
}
