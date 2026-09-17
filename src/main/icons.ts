/**
 * The game's icons, by the file id the client names them with.
 *
 * The client keeps its textures packed in the CASC archives under `Data/`,
 * not as files, so the picture of a file id is not on the disk to read.
 * Blizzard's own image host serves the same picture by the same id, so the
 * app fetches it there once and keeps it under `userData/icons/`. After
 * that the icon is local, and a player without a connection sees what was
 * seen before.
 *
 * The renderer asks for an icon by what it is, not by the file id:
 * `wt-icon://item/274374`, `wt-icon://class/WARRIOR`. The cache resolves
 * the id through the lexicon, serves the file it has, or fetches it - and
 * has nothing where the lexicon does not know the id, the host has no such
 * icon, or the setting is off. The protocol (`iconProtocol.ts`) answers
 * that with 404, and an `<img>` that gets a 404 hides itself, so a missing
 * icon costs nothing but the request.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { isIconKind } from '../shared/enums/iconKind'
import { iconRef, type Lexicon } from '../shared/lexicon'

export const ICON_SCHEME = 'wt-icon'

/** Blizzard's image host; the region comes first, then the path the lexicon gives (`icons/56/<file id>`, `character/<realm>/<n>/<id>-avatar`). */
export const ICON_HOST = 'https://render.worldofwarcraft.com/'

/** The address of the host's picture for a reference, in a region. */
export function hostUrl(region: string, ref: string): string {
  return `${ICON_HOST}${region}/${ref.split('/').map(encodeURIComponent).join('/')}.jpg`
}

/** The cache's file for a reference: the path as one name. */
export function cacheFile(ref: string): string {
  return `${ref.split('/').join('_')}.jpg`
}

export interface IconCacheOptions {
  /** Where the pictures are kept. */
  dir: string
  lexicon: () => Lexicon
  /** The region the host renders for; the icons are the same everywhere, the portraits are not. */
  region: () => string
  /** The setting: off answers every request the cache cannot serve with 404. */
  enabled: () => boolean
  /** The picture at an address: null where the host has none, a throw where the host did not answer. */
  fetchIcon: (url: string) => Promise<Buffer | null>
}

/** How many pictures are asked for at once: a first view asks for hundreds, and the host must not see a storm. */
export const ICON_FETCH_LIMIT = 6

/**
 * Asks the host through the given fetch; Electron's `net.fetch` in the app,
 * the global in a test. Null only where the host says there is no such
 * picture (403, 404); a throttle (429), an outage or a page in place of a
 * picture is a throw, so the picture is asked for again later.
 */
export function hostFetcher(fetchFn: typeof fetch): (url: string) => Promise<Buffer | null> {
  return async (url) => {
    const response = await fetchFn(url)
    if (response.status === 403 || response.status === 404) return null
    if (!response.ok) throw new Error(`icon host answered ${response.status}`)
    if (!(response.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('icon host answered with no picture')
    return Buffer.from(await response.arrayBuffer())
  }
}

export class IconCache {
  /** The fetch under way for a reference, so two images of one item cost one request. */
  private inflight = new Map<string, Promise<string | null>>()
  /** References the host had no picture for; asked once per run. */
  private missing = new Set<string>()
  /** Fetches under way, and the ones that wait for a turn. */
  private running = 0
  private waiting: Array<() => void> = []

  constructor(private readonly options: IconCacheOptions) {}

  /** Holds a fetch until fewer than the limit run. */
  private async turn<T>(work: () => Promise<T>): Promise<T> {
    if (this.running >= ICON_FETCH_LIMIT) await new Promise<void>((resolve) => this.waiting.push(resolve))
    this.running += 1
    try {
      return await work()
    } finally {
      this.running -= 1
      this.waiting.shift()?.()
    }
  }

  /** The file of an icon address, fetched where it is not there yet; null where there is none. */
  async resolve(url: string): Promise<string | null> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return null
    }
    const kind = parsed.hostname
    const id = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''))
    if (!isIconKind(kind) || !id) return null
    const ref = iconRef(this.options.lexicon(), kind, id)
    return ref === null ? null : this.file(String(ref))
  }

  private async file(ref: string): Promise<string | null> {
    const file = path.join(this.options.dir, cacheFile(ref))
    if (existsSync(file)) return file
    if (!this.options.enabled() || this.missing.has(ref)) return null
    let pending = this.inflight.get(ref)
    if (!pending) {
      pending = this.download(ref, file).finally(() => this.inflight.delete(ref))
      this.inflight.set(ref, pending)
    }
    return pending
  }

  private async download(ref: string, file: string): Promise<string | null> {
    let bytes: Buffer | null
    try {
      bytes = await this.turn(() => this.options.fetchIcon(hostUrl(this.options.region(), ref)))
    } catch {
      // No net, or a host that asks for patience: the next request tries again.
      return null
    }
    if (!bytes) {
      this.missing.add(ref)
      return null
    }
    await fs.mkdir(this.options.dir, { recursive: true })
    // Written beside, then moved: a request served mid-write would get half a picture.
    const partial = `${file}.part`
    await fs.writeFile(partial, bytes)
    await fs.rename(partial, file)
    return file
  }
}
