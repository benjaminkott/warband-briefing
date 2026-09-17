// Writes the release notes for a tag from the commits since the tag before.
//
// Every commit is one point with a prefix (see AGENTS.md, "Commits"), so the
// log is the changelog: `feat:` under "New", `bugfix:` under "Fixed", `task:`
// under "Internal". The version bump itself is left out. GitHub's own notes
// list pull requests only, and the repository takes none.
//
//   node scripts/release-notes.mjs v0.1.0-beta.4 > notes.md

import { execFileSync } from 'node:child_process'

const GROUPS = [
  { prefix: 'feat:', heading: 'New' },
  { prefix: 'bugfix:', heading: 'Fixed' },
  { prefix: 'task:', heading: 'Internal' }
]

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}

const tag = process.argv[2] ?? git('describe', '--tags', '--abbrev=0')
let previous = null
try {
  previous = git('describe', '--tags', '--abbrev=0', `${tag}^`)
} catch {
  // The first tag: every commit counts.
}

const range = previous ? `${previous}..${tag}` : tag
const subjects = git('log', '--format=%s', '--reverse', range)
  .split('\n')
  .filter((line) => line && !/^task: The version is /.test(line))

const lines = []
for (const { prefix, heading } of GROUPS) {
  const points = subjects.filter((subject) => subject.startsWith(prefix)).map((subject) => subject.slice(prefix.length).trim())
  if (points.length === 0) continue
  lines.push(`### ${heading}`, '', ...points.map((point) => `- ${point}`), '')
}

process.stdout.write(lines.join('\n'))
