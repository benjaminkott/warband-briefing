/**
 * Locating the WoW installation. This app only ever reads from it - nothing is
 * installed, written or modified inside the game folder.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { FLAVOR } from './sources/shared'

const execFileAsync = promisify(execFile)

const COMMON_ROOTS = [
  'World of Warcraft',
  'Program Files (x86)/World of Warcraft',
  'Program Files/World of Warcraft',
  'Games/World of Warcraft',
  'Battle.net/World of Warcraft',
  'Program Files (x86)/Battle.net/World of Warcraft'
]

function looksLikeWowRoot(dir: string): boolean {
  return existsSync(path.join(dir, FLAVOR, 'WTF')) || existsSync(path.join(dir, FLAVOR, 'Wow.exe'))
}

/** Reads the install path Battle.net writes into the registry, if present. */
async function wowRootFromRegistry(): Promise<string | null> {
  const keys = [
    'HKLM\\SOFTWARE\\WOW6432Node\\Blizzard Entertainment\\World of Warcraft',
    'HKLM\\SOFTWARE\\Blizzard Entertainment\\World of Warcraft'
  ]
  for (const key of keys) {
    try {
      const { stdout } = await execFileAsync('reg', ['query', key, '/v', 'InstallPath'])
      const match = /InstallPath\s+REG_SZ\s+(.+)/i.exec(stdout)
      if (!match) continue
      // The registry points at the flavor folder; step up to the install root.
      let dir = match[1].trim()
      if (path.basename(dir).startsWith('_')) dir = path.dirname(dir)
      if (looksLikeWowRoot(dir)) return path.normalize(dir)
    } catch {
      // Key missing or reg unavailable - fall through to the directory scan.
    }
  }
  return null
}

export async function detectWowPath(): Promise<string | null> {
  const fromRegistry = await wowRootFromRegistry()
  if (fromRegistry) return fromRegistry

  const drives = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((d) => `${d}:/`)
  for (const drive of drives) {
    if (!existsSync(drive)) continue
    for (const rel of COMMON_ROOTS) {
      const candidate = path.join(drive, rel)
      if (looksLikeWowRoot(candidate)) return path.normalize(candidate)
    }
  }
  return null
}

/** Accepts either the install root or the `_retail_` folder and normalises it. */
export function normaliseWowPath(input: string): string | null {
  const dir = path.normalize(input.trim().replace(/^"|"$/g, ''))
  if (looksLikeWowRoot(dir)) return dir
  const parent = path.dirname(dir)
  if (looksLikeWowRoot(parent)) return parent
  return null
}
