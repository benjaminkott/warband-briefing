/**
 * The season catalog from the net, for the player who switches it on.
 *
 * The catalog ships with the app (`data/seasonCatalog.json`), and a new
 * weekly quest in the season would wait for an app release. With the switch
 * on, the app fetches the file the repository holds once a day and puts it
 * in force - the same file, only newer - and keeps it in the state so the
 * next start has it before the net answers. The app promises to work
 * without a connection, so the switch is off by default and a failed fetch
 * changes nothing.
 */

import { applySeasonCatalog, parseSeasonCatalog, type SeasonCatalog } from '../shared/seasonCatalog'
import { DAY_MS } from '../shared/time'
import { CATALOG_URL } from '../shared/repository'

/** What the state keeps of a fetched catalog. */
export interface FetchedCatalog {
  catalog: SeasonCatalog
  fetchedAt: number
  url: string
}

export interface CatalogStore {
  get(): FetchedCatalog | null
  set(fetched: FetchedCatalog): Promise<void>
}

export class CatalogUpdater {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly store: CatalogStore,
    private readonly onChange: (catalog: SeasonCatalog) => void,
    private readonly url = CATALOG_URL
  ) {}

  /** Puts the last fetched catalog in force, before anything is read. */
  restore(): void {
    const fetched = this.store.get()
    if (fetched) applySeasonCatalog(fetched.catalog)
  }

  /** Fetches now if the last fetch is a day old, then once a day. Off stops it. */
  configure(enabled: boolean): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    if (!enabled) return
    const last = this.store.get()?.fetchedAt ?? 0
    if (Date.now() - last >= DAY_MS) void this.fetchNow()
    this.timer = setInterval(() => void this.fetchNow(), DAY_MS)
  }

  /** One fetch; the catalog in force after it, or null when nothing changed. */
  async fetchNow(): Promise<SeasonCatalog | null> {
    try {
      const response = await fetch(this.url, { headers: { accept: 'application/json' } })
      if (!response.ok) return null
      const catalog = parseSeasonCatalog(await response.json())
      if (!catalog) return null
      await this.store.set({ catalog, fetchedAt: Date.now(), url: this.url })
      applySeasonCatalog(catalog)
      this.onChange(catalog)
      return catalog
    } catch {
      // No net, or a file that is not there: the catalog in force stays.
      return null
    }
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
