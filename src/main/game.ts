/**
 * Whether the game is running.
 *
 * The app reads what the game wrote at the last logout or `/reload`. While
 * the game runs, the roster on screen is older than the roster in the game,
 * and every difference looks like a fault of the app. The watch tells the
 * views when that is the case, so they can say so instead.
 *
 * The check is the process list, polled - the game gives no other sign. Only
 * Windows is asked; elsewhere the answer is "unknown", and the views say
 * nothing.
 */

import { execFile } from 'node:child_process'
import type { GameState } from '../shared/types'

/** The retail client's process names, as the launcher starts them. */
const PROCESS_NAMES = ['wow.exe', 'wowt.exe', 'wowb.exe']
const POLL_MS = 20_000

/** The process list as CSV rows, one call; each row starts with the quoted image name. */
function runningImages(): Promise<Set<string> | null> {
  return new Promise((resolve) => {
    execFile('tasklist', ['/NH', '/FO', 'CSV'], { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      // A process list that cannot be read says nothing about the game.
      if (error) return resolve(null)
      const names = new Set<string>()
      for (const line of stdout.split(/\r?\n/)) {
        const match = line.match(/^"([^"]+)"/)
        if (match) names.add(match[1]!.toLowerCase())
      }
      resolve(names)
    })
  })
}

export async function isGameRunning(): Promise<boolean | null> {
  if (process.platform !== 'win32') return null
  const images = await runningImages()
  if (!images) return null
  return PROCESS_NAMES.some((name) => images.has(name))
}

/** Polls the process list and reports each change of state. */
export class GameWatch {
  private state: GameState = { running: null }
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly onChange: (state: GameState) => void) {}

  getState(): GameState {
    return this.state
  }

  start(): void {
    if (this.timer) return
    const tick = async (): Promise<void> => {
      const running = await isGameRunning()
      if (running !== this.state.running) {
        this.state = { running }
        this.onChange(this.state)
      }
    }
    void tick()
    this.timer = setInterval(() => void tick(), POLL_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
