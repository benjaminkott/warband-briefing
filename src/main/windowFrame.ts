/**
 * The window's last frame, in a file of its own beside the state. The state
 * file holds the roster and its history; the frame changes with every drag
 * and is written on each, so a kill without a close event - the dev watcher's
 * restart, a crash - does not lose the window the user had.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'

const FRAME_FILE = 'window.json'

/** The window's last frame in screen coordinates, and whether it was maximised over it. */
export interface WindowPlacement {
  x: number
  y: number
  width: number
  height: number
  maximized: boolean
}

/** A rectangle in screen coordinates, the shape Electron gives for a display's work area. */
export interface Area {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Whether a good part of the frame lands on the area. A monitor that is gone
 * since - a laptop away from its dock - would put the window out of reach;
 * the thresholds are the title bar the pointer has to find.
 */
export function landsOn(frame: Area, area: Area): boolean {
  const visibleWidth = Math.min(frame.x + frame.width, area.x + area.width) - Math.max(frame.x, area.x)
  const visibleHeight = Math.min(frame.y + frame.height, area.y + area.height) - Math.max(frame.y, area.y)
  return visibleWidth >= 200 && visibleHeight >= 120
}

function isPlacement(value: unknown): value is WindowPlacement {
  if (!value || typeof value !== 'object') return false
  const p = value as Record<string, unknown>
  return [p.x, p.y, p.width, p.height].every((n) => typeof n === 'number' && Number.isFinite(n)) && typeof p.maximized === 'boolean'
}

export class WindowFrame {
  private placement: WindowPlacement | null = null
  /** The writes, one after the other: two at once would share the one temporary file. */
  private writing: Promise<void> = Promise.resolve()

  constructor(private readonly dir: string) {}

  private get file(): string {
    return path.join(this.dir, FRAME_FILE)
  }

  /**
   * Reads the frame file. `legacy` is the frame the state file held before
   * the frame had a file of its own; it counts only when there is no file yet.
   */
  async load(legacy: WindowPlacement | null = null): Promise<void> {
    let parsed: unknown = null
    try {
      parsed = JSON.parse(await fs.readFile(this.file, 'utf8'))
    } catch {
      // No file, or one that does not parse: the legacy frame, if any.
    }
    this.placement = isPlacement(parsed) ? parsed : legacy
  }

  get(): WindowPlacement | null {
    return this.placement
  }

  set(placement: WindowPlacement): Promise<void> {
    this.placement = placement
    // A failed write must not stop the next one; the caller sees its own error.
    const next = this.writing.catch(() => undefined).then(() => this.write(placement))
    this.writing = next
    return next
  }

  private async write(placement: WindowPlacement): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
    // Write-then-rename so a crash mid-write cannot leave a truncated file.
    const tmp = `${this.file}.tmp`
    await fs.writeFile(tmp, JSON.stringify(placement), 'utf8')
    await fs.rename(tmp, this.file)
  }
}
