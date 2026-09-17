/**
 * The activity catalogue SavedInstances ships in its own code.
 *
 * `Progress` in a SavedInstances file is keyed by names like `mn-void-assaults`
 * and stores objectives - never the quest ids behind them, never a title.
 * Those live in the addon's `Modules/Progress.lua`, right next to the data. So
 * that is where they are read from, rather than copied into this repository,
 * where a list of quest ids would be stale the patch after it was written.
 *
 * Read defensively: the file is Lua source, not data, and its layout is only
 * relied on as far as one preset looks like
 *
 *   ["mn-purging-the-vaults"] = {
 *     type = "single",
 *     expansion = 11,
 *     name = L["Purging the Vaults"],
 *     questID = 95520,            -- or { 94385, 94386 }
 *     reset = "weekly",
 *     threshold = 4,
 *   },
 *
 * Anything that does not is skipped, and a missing file means an empty
 * catalogue - the activities simply stay unnamed and unread.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { retailDir } from './shared'
import type { QuestReset } from '../../shared/enums/questReset'
import type { ProgressType } from '../../shared/enums/progressType'

export interface ProgressEntry {
  key: string
  type: ProgressType
  /** The expansion the addon tags the entry with; null for the evergreen ones. */
  expansion: number | null
  /** The English name, as the addon's locale key spells it. */
  name: string
  questIds: number[]
  /** How many of a list's quests count as the week done. */
  threshold: number | null
  reset: QuestReset | null
}

export type ProgressCatalog = Map<string, ProgressEntry>

const PROGRESS_FILE = ['Interface', 'AddOns', 'SavedInstances', 'Modules', 'Progress.lua']

/** `mn-void-assaults` -> "Void Assaults", for an entry without a locale name. */
function humanise(key: string): string {
  return key
    .replace(/^[a-z]+-/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function parseProgressCatalog(text: string): ProgressCatalog {
  const catalog: ProgressCatalog = new Map()
  // One preset per match: the key, then its body up to the closer at the same
  // indentation. A custom entry's function bodies close deeper, so they stay
  // inside the match.
  const preset = /\n {2}\["([\w-]+)"\] = \{\n([\s\S]*?)\n {2}\},/g
  // The file ships with Windows line endings; the shape above is written for one kind.
  for (const match of text.replace(/\r\n/g, '\n').matchAll(preset)) {
    const key = match[1]!
    // Comments carry the quest titles in English, which would otherwise be
    // matched as numbers or names; strip them before reading anything.
    const body = match[2]!.replace(/--[^\n]*/g, '')

    const type = /\btype = "(single|any|list|custom)"/.exec(body)?.[1] as ProgressEntry['type'] | undefined
    if (!type) continue

    const expansion = /\bexpansion = (\d+)/.exec(body)?.[1]
    const localised = /\bname = L\["([^"]+)"\]/.exec(body)?.[1]
    const single = /\bquestID = (\d+)/.exec(body)?.[1]
    const list = /\bquestID = \{([^}]*)\}/.exec(body)?.[1]
    const threshold = /\bthreshold = (\d+)/.exec(body)?.[1]
    const reset = /\breset = "(none|daily|weekly)"/.exec(body)?.[1] as ProgressEntry['reset'] | undefined

    catalog.set(key, {
      key,
      type,
      expansion: expansion ? Number(expansion) : null,
      name: localised ?? humanise(key),
      questIds: single ? [Number(single)] : (list?.match(/\d+/g) ?? []).map(Number),
      threshold: threshold ? Number(threshold) : null,
      reset: reset ?? null
    })
  }
  return catalog
}

export async function readProgressCatalog(wowPath: string): Promise<ProgressCatalog> {
  try {
    const text = await fs.readFile(path.join(retailDir(wowPath), ...PROGRESS_FILE), 'utf8')
    return parseProgressCatalog(text)
  } catch {
    // No addon beside the data - the activities stay unread, nothing else changes.
    return new Map()
  }
}

/** The newest expansion any entry is tagged with - i.e. the current one. */
export function catalogExpansion(catalog: ProgressCatalog): number {
  let max = 0
  for (const entry of catalog.values()) max = Math.max(max, entry.expansion ?? 0)
  return max
}
