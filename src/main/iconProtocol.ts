/**
 * The `wt-icon://` scheme: the renderer's way to an icon. An `<img
 * src="wt-icon://item/274374">` in the renderer becomes a request here,
 * and the cache (`icons.ts`) answers it with the file, or nothing.
 */

import { app, net, protocol } from 'electron'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { hostFetcher, ICON_SCHEME, IconCache, type IconCacheOptions } from './icons'

/** The scheme is registered before the app is ready, once for the process. */
export function registerIconScheme(): void {
  protocol.registerSchemesAsPrivileged([
    // Standard: the kind is the host and the id the path, as a URL. Secure:
    // a page with a `https:`-grade origin takes the image without a warning.
    { scheme: ICON_SCHEME, privileges: { standard: true, secure: true, stream: true } }
  ])
}

/** The cache's folder under the app's data. */
export function iconDir(): string {
  return path.join(app.getPath('userData'), 'icons')
}

/** A cache under the app's data that asks the host through Electron's net, and answers the scheme. */
export function serveIcons(options: Omit<IconCacheOptions, 'dir' | 'fetchIcon'>): IconCache {
  const cache = new IconCache({ ...options, dir: iconDir(), fetchIcon: hostFetcher((url) => net.fetch(String(url))) })
  protocol.handle(ICON_SCHEME, async (request) => {
    const file = await cache.resolve(request.url)
    if (!file) return new Response(null, { status: 404 })
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
      headers: { 'content-type': 'image/jpeg', 'cache-control': 'max-age=31536000, immutable' }
    })
  })
  return cache
}
