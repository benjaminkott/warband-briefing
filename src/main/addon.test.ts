/**
 * The addon the app ships carries the app's version: `## Version:` in the
 * toc is the version from package.json, stamped in by
 * `scripts/sync-addon-version.mjs`. A mismatch means the script did not run.
 */

import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const root = new URL('../../', import.meta.url)

it('the bundled addon carries the version of package.json', () => {
  const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) as { version: string }
  const toc = readFileSync(new URL('addon/WarbandBriefing/WarbandBriefing.toc', root), 'utf8')
  expect(toc.match(/^##\s*Version:\s*(.+?)\s*$/m)?.[1]).toBe(version)
})
