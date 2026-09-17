/**
 * Fixtures for the main process's tests: a folder of its own under the
 * system's temp for each fixture, removed when the file's tests are through,
 * so a run leaves nothing behind.
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll } from 'vitest'

const dirs: string[] = []
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

export function tempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `briefing-${prefix}-`))
  dirs.push(dir)
  return dir
}
