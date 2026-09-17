/**
 * The companion addon that the app includes, and how it gets into the game.
 *
 * The addon folder is part of the app (`addon/` in the repository,
 * `resources/addon` in the package), so the user does not have to find it.
 * One click copies it into `Interface/AddOns` of the known WoW folder. The
 * app reads the version from the `.toc` file on both sides, so the settings
 * can show whether the installed version is the included version.
 *
 * The addon has no version of its own: `## Version:` in the toc is the app's
 * version, stamped in by `scripts/sync-addon-version.mjs`. An installed
 * addon whose version differs is the addon of another app version, and the
 * app replaces it by itself (`updateAddon`).
 */

import { app } from 'electron'
import { cp, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { retailDir } from './sources/shared'
import { compareVersions } from '../shared/version'

export const ADDON_FOLDER = 'WarbandBriefing'
/**
 * The folder the addon had before the app was renamed. Two copies of the
 * addon would write two files, so the old folder goes when the new one is
 * installed. The old SavedVariables file stays; the adapter reads it until
 * the new addon has written its own.
 */
const LEGACY_ADDON_FOLDER = 'WowTodo'

export interface AddonVersions {
  /** The version that the app includes, or null if the package has no addon folder. */
  bundled: string | null
  /** The version under Interface/AddOns, or null if the addon is not installed. */
  installed: string | null
}

/** The folder of the included addon: next to the code in development, under resources in the package. */
export function bundledAddonDir(): string {
  const root = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return path.join(root, 'addon', ADDON_FOLDER)
}

export function installedAddonDir(wowPath: string): string {
  return path.join(retailDir(wowPath), 'Interface', 'AddOns', ADDON_FOLDER)
}

function legacyAddonDir(wowPath: string): string {
  return path.join(retailDir(wowPath), 'Interface', 'AddOns', LEGACY_ADDON_FOLDER)
}

/** Whether the addon is still installed under its old name. Only its own toc file counts. */
function legacyAddonInstalled(wowPath: string): boolean {
  return existsSync(path.join(legacyAddonDir(wowPath), `${LEGACY_ADDON_FOLDER}.toc`))
}

/** Whether the installed Lua differs from the included one, byte for byte. */
async function addonDiffers(wowPath: string): Promise<boolean> {
  const file = `${ADDON_FOLDER}.lua`
  try {
    const [bundled, installed] = await Promise.all([
      readFile(path.join(bundledAddonDir(), file)),
      readFile(path.join(installedAddonDir(wowPath), file))
    ])
    return !bundled.equals(installed)
  } catch {
    return true
  }
}

/** Copies the included addon into the game and removes the old folder, if there is one. */
async function copyAddon(wowPath: string): Promise<void> {
  await cp(bundledAddonDir(), installedAddonDir(wowPath), { recursive: true, force: true })
  if (legacyAddonInstalled(wowPath)) await rm(legacyAddonDir(wowPath), { recursive: true, force: true })
}

/** The `## Version:` line of the toc file, or null if there is no toc file. */
async function tocVersion(dir: string): Promise<string | null> {
  try {
    const toc = await readFile(path.join(dir, `${ADDON_FOLDER}.toc`), 'utf8')
    return toc.match(/^##\s*Version:\s*(.+?)\s*$/m)?.[1] ?? null
  } catch {
    return null
  }
}

export async function addonVersions(wowPath: string | null): Promise<AddonVersions> {
  return {
    bundled: await tocVersion(bundledAddonDir()),
    installed: wowPath ? await tocVersion(installedAddonDir(wowPath)) : null
  }
}

/**
 * Copies the included addon over the installed one. Files that the addon no
 * longer includes stay in place. The folder holds only the toc file and one
 * Lua file, and the game ignores files that the toc does not list.
 */
export async function installAddon(wowPath: string | null, missingPath: string, missingBundle: string): Promise<AddonVersions> {
  if (!wowPath) throw new Error(missingPath)
  const source = bundledAddonDir()
  if (!existsSync(source)) throw new Error(missingBundle)
  await copyAddon(wowPath)
  return addonVersions(wowPath)
}

/**
 * Replaces an installed addon that is older than the included one, so the
 * game runs the addon of this app version after an app update. Whether the
 * addon is installed at all stays the user's choice: a missing addon is left
 * alone. Older or the same number with other code, never newer: the addon is
 * on CurseForge too, and a newer
 * copy from there must not be put back. The addon under its old folder name
 * counts as installed: the user chose it once, and the rename must not undo
 * that choice.
 *
 * Returns the versions after the copy, or null when nothing had to change.
 */
export async function updateAddon(wowPath: string | null): Promise<AddonVersions | null> {
  if (!wowPath) return null
  const { bundled, installed } = await addonVersions(wowPath)
  if (!bundled) return null
  if (installed === null && !legacyAddonInstalled(wowPath)) return null
  if (installed !== null) {
    const order = compareVersions(installed, bundled)
    // A newer copy stays; the same version is replaced only where its code
    // differs - a development build changes the addon without a new number.
    if (order > 0) return null
    if (order === 0 && !(await addonDiffers(wowPath))) return null
  }
  await copyAddon(wowPath)
  return addonVersions(wowPath)
}
