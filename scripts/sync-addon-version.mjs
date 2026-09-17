// Stamps the app's version into the addon's toc file.
//
// The addon ships with the app and the app updates it in the game folder
// whenever the two versions differ, so the addon has no version of its own:
// `## Version:` in the toc is the version from package.json. `npm version`
// and every build run this script; `src/main/addon.test.ts` checks the two
// match.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toc = path.join(root, 'addon', 'WarbandBriefing', 'WarbandBriefing.toc')
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

const before = readFileSync(toc, 'utf8')
const after = before.replace(/^(##\s*Version:\s*).*$/m, `$1${version}`)
const current = before.match(/^##\s*Version:\s*(.+?)\s*$/m)?.[1] ?? null

if (after !== before) {
  writeFileSync(toc, after)
  console.log(`addon version ${current} -> ${version}`)
}
