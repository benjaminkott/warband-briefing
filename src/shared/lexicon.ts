/**
 * The lexicon: what the app knows about an id on its own, apart from any
 * character - the icon of an item, a currency, a recipe, a profession, the
 * character id a portrait is rendered by, and what an item is. The
 * companion registers it for everything a character has in view,
 * account-wide; the app merges the registers of every account into one
 * and keeps it, so an id stays known after the addon's file is gone, and
 * a character no companion has seen still gets the icon and the group of
 * the item a bag addon lists.
 *
 * The file id is the client's own number for `Interface/Icons/...`; the
 * character id is the tail of the client's GUID. Blizzard's own image host
 * serves the pictures by them (`icons.ts` in main). A class icon is not in
 * the lexicon: the client names it by the class token, so the token is
 * the reference.
 */

import { IconKind } from './enums/iconKind'
import { LexiconKind } from './enums/lexiconKind'

/** For each table the number by the entity's id (the character's key for a portrait); the id is a string, as JSON keys are. */
export type Lexicon = Record<LexiconKind, Record<string, number>>

export const LEXICON_KINDS: readonly LexiconKind[] = Object.values(LexiconKind)

export function emptyLexicon(): Lexicon {
  return Object.fromEntries(LEXICON_KINDS.map((kind) => [kind, {}])) as Lexicon
}

/** One lexicon out of several; a later one wins an id both name. */
export function mergeLexicons(...lexicons: readonly (Partial<Lexicon> | null | undefined)[]): Lexicon {
  const out = emptyLexicon()
  for (const lexicon of lexicons) {
    if (!lexicon) continue
    for (const kind of LEXICON_KINDS) Object.assign(out[kind], lexicon[kind] ?? {})
  }
  return out
}

/** How many ids the lexicon knows, over all tables. */
export function lexiconSize(lexicon: Lexicon): number {
  return LEXICON_KINDS.reduce((sum, kind) => sum + Object.keys(lexicon[kind] ?? {}).length, 0)
}

/** The character's id out of the client's GUID (`Player-1405-0992F5F0`): the tail, in hex. Null for anything else. */
export function characterIdOf(guid: string | null | undefined): number | null {
  const match = /^Player-\d+-([0-9A-Fa-f]{1,16})$/.exec(guid ?? '')
  if (!match) return null
  const id = Number.parseInt(match[1]!, 16)
  return id > 0 ? id : null
}

/** The realm's slug out of a character key (`${realmSlug}-${name}`); a name has no hyphen, a slug can. */
function realmOfKey(key: string): string | null {
  const cut = key.lastIndexOf('-')
  return cut > 0 ? key.slice(0, cut) : null
}

/** The table the file id of a picture is in. */
const ICON_TABLES: Partial<Record<IconKind, LexiconKind>> = {
  [IconKind.Item]: LexiconKind.Item,
  [IconKind.Currency]: LexiconKind.Currency,
  [IconKind.Recipe]: LexiconKind.Recipe,
  [IconKind.Profession]: LexiconKind.Profession
}

/**
 * The host's path to the picture, without the region and the `.jpg`: what
 * the cache fetches and names the file by. Null where the lexicon does not
 * know the id, or the reference is not a plain word.
 */
export function iconRef(lexicon: Lexicon, kind: IconKind, id: string | number): string | null {
  if (kind === IconKind.Class) {
    const token = String(id).toLowerCase()
    return /^[a-z]+$/.test(token) ? `icons/56/classicon_${token}` : null
  }
  if (kind === IconKind.Portrait || kind === IconKind.Inset) {
    const key = String(id)
    const characterId = lexicon[LexiconKind.Portrait]?.[key]
    const realm = realmOfKey(key)
    if (typeof characterId !== 'number' || characterId <= 0 || !realm || !/^[a-z0-9-]+$/.test(realm)) return null
    // The host shelves the renders by the id's last byte.
    return `character/${realm}/${characterId % 256}/${characterId}-${kind === IconKind.Portrait ? 'avatar' : 'inset'}`
  }
  const table = ICON_TABLES[kind]
  const fileId = table ? lexicon[table]?.[String(id)] : undefined
  return typeof fileId === 'number' && fileId > 0 ? `icons/56/${fileId}` : null
}
