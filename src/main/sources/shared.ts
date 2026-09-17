/** Helpers shared by the source adapters. */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseSavedVariables, type LuaValue } from '../lua'
import type { SourceFile } from './types'

export const FLAVOR = '_retail_'

export function retailDir(wowPath: string): string {
  return path.join(wowPath, FLAVOR)
}

/** A parsed file, with the stamp and size it had when it was read. */
interface Parsed {
  mtimeMs: number
  size: number
  globals: Record<string, LuaValue>
}

const PARSED = new Map<string, Parsed>()

/**
 * The globals of a SavedVariables file, parsed once. An adapter reads its
 * file twice per sync - the characters, then the account - and a sync
 * reads every file whether it changed or not; the parse is the dominant
 * cost, so the result stays until the file's stamp or size moves.
 */
export async function parsedFile(file: SourceFile): Promise<Record<string, LuaValue>> {
  const stat = await fs.stat(file.filePath)
  const cached = PARSED.get(file.filePath)
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.globals
  const globals = parseSavedVariables(await fs.readFile(file.filePath, 'utf8'))
  PARSED.set(file.filePath, { mtimeMs: stat.mtimeMs, size: stat.size, globals })
  return globals
}

/** Finds one SavedVariables file name across every WTF account folder. */
export async function findInAccounts(wowPath: string, fileName: string): Promise<SourceFile[]> {
  const accountsDir = path.join(retailDir(wowPath), 'WTF', 'Account')
  let accounts: string[]
  try {
    accounts = await fs.readdir(accountsDir)
  } catch {
    return []
  }

  const out: SourceFile[] = []
  for (const account of accounts) {
    const filePath = path.join(accountsDir, account, 'SavedVariables', fileName)
    try {
      const stat = await fs.stat(filePath)
      out.push({ accountName: account, filePath, modifiedAt: stat.mtimeMs })
    } catch {
      // Account folder without this addon's data - skip it.
    }
  }
  return out
}

/**
 * Mirrors the realm-slug rules Blizzard uses, so the same character produced by
 * different addons lands on the same key.
 */
const SLUG_MAP: Record<string, string> = {
  à: 'a',
  á: 'a',
  â: 'a',
  ä: 'ae',
  ã: 'a',
  å: 'a',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  ö: 'oe',
  õ: 'o',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'ue',
  ñ: 'n',
  ç: 'c',
  ß: 'ss'
}

export function slugifyRealm(realm: string): string {
  let out = realm.trim().toLowerCase().replace(/'/g, '').replace(/\s+/g, '-')
  for (const [from, to] of Object.entries(SLUG_MAP)) out = out.split(from).join(to)
  return out
}

export function characterKey(name: string, realmSlug: string): string {
  return `${realmSlug}-${name.toLowerCase()}`
}

/**
 * The fields of an item link that describe the item as it is worn:
 *
 *   |Hitem:<id>:<enchant>:<gem1>:<gem2>:<gem3>:<gem4>:...|h[Name]|h
 *
 * Everything past the gems (bonus ids, upgrade state) needs the client's data
 * tables to mean anything, so only the head of the link is read.
 */
export interface ItemLinkParts {
  itemId: number
  enchantId: number
  gemIds: number[]
  name: string
}

/** An item name without the quality icon crafted items carry after it. */
export function cleanItemName(name: string): string {
  return name.replace(/\s*\|A:[^|]*\|a/g, '').trim()
}

/**
 * The crafting tier of an item (1 to 5) out of its link: the modifier of
 * type 38 in the link's tail, or the quality icon the client hangs on the
 * name (`Professions-ChatIcon-Quality-Tier3`) - a link written before the
 * modifier still carries the icon. Null for an item without a tier.
 */
export function craftTierOf(link: string | null | undefined): number | null {
  if (!link) return null
  const head = /\|Hitem:([^|]*)\|h/.exec(link)
  if (head) {
    const fields = head[1]!.split(':')
    // ...:numBonus:bonus...:numModifiers:(type:value)...
    const bonusCount = Number(fields[12]) || 0
    let at = 13 + bonusCount
    const modifierCount = Number(fields[at]) || 0
    at += 1
    for (let i = 0; i < modifierCount; i += 1, at += 2) {
      if (Number(fields[at]) === 38) {
        const tier = Number(fields[at + 1])
        return tier >= 1 && tier <= 5 ? tier : null
      }
    }
  }
  const icon = /Quality-Tier([1-5])/.exec(link)
  return icon ? Number(icon[1]) : null
}

/**
 * A tooltip line as plain text: the client's escapes come out - a texture
 * (`|T…|t`, the coins of a sell price), an atlas (`|A…|a`, a quality
 * icon), a colour (`|cffRRGGBB…|r`, `|cnIQ3:…|r`) and a link (`|H…|h…|h`),
 * the words of each kept. The app draws the colours the addon names on the
 * line, not the ones in the text.
 */
export function stripMarkup(text: string): string {
  return text
    .replace(/\|T[^|]*\|t/g, '')
    .replace(/\|A[^|]*\|a/g, '')
    .replace(/\|H[^|]*\|h/g, '')
    .replace(/\|c(?:[0-9a-fA-F]{8}|n[^:|]*:)/g, '')
    .replace(/\|[hr]/g, '')
    .replace(/\|\|/g, '|')
    .trim()
}

export function parseItemLink(link: string): ItemLinkParts | null {
  const head = /\|Hitem:([^|]*)\|h\[([^\]]*)\]/.exec(link)
  if (!head) return null
  const fields = head[1]!.split(':')
  const itemId = Number(fields[0])
  if (!Number.isInteger(itemId) || itemId <= 0) return null
  const gemIds = fields
    .slice(2, 6)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
  return {
    itemId,
    enchantId: Number(fields[1]) || 0,
    gemIds,
    name: cleanItemName(head[2] ?? '')
  }
}
