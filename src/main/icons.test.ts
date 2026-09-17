/**
 * Tests for the icon cache: an address resolves through the lexicon to a
 * file, fetched once and kept; an unknown id, a picture the host has not,
 * and the setting off give nothing; a host that did not answer is asked
 * again.
 */

import { expect, it } from 'vitest'
import { IconCache, hostFetcher, hostUrl, ICON_FETCH_LIMIT } from './icons'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { tempDir } from './testing'
import { emptyLexicon } from '../shared/lexicon'
import type { Lexicon } from '../shared/lexicon'

const lexicon: Lexicon = {
  ...emptyLexicon(),
  item: { 274374: 4622270 },
  currency: { 3008: 4638725 },
  portrait: { 'zirkel-des-cenarius-kael': 160626160 }
}
const HOST = 'https://render.worldofwarcraft.com/eu/'

/** A host with two pictures; `calls` counts what it was asked, `down` makes it not answer. */
interface FakeHost {
  calls: string[]
  down: boolean
  fetchIcon: (url: string) => Promise<Buffer | null>
}
function fakeHost(): FakeHost {
  const host: FakeHost = { calls: [], down: false, fetchIcon: async () => null }
  host.fetchIcon = async (url) => {
    host.calls.push(url.replace(HOST, '').replace(/\.jpg$/, ''))
    if (host.down) throw new Error('offline')
    if (url === `${HOST}icons/56/4622270.jpg`) return Buffer.from('jpeg-key')
    if (url === `${HOST}icons/56/classicon_warrior.jpg`) return Buffer.from('jpeg-warrior')
    if (url === `${HOST}character/zirkel-des-cenarius/240/160626160-avatar.jpg`) return Buffer.from('jpeg-face')
    return null
  }
  return host
}

function cacheWith(host: FakeHost, enabled = () => true) {
  const dir = tempDir('icon-cache')
  return { dir, cache: new IconCache({ dir, lexicon: () => lexicon, region: () => 'eu', enabled, fetchIcon: host.fetchIcon }) }
}

it('an item resolves through the lexicon to a fetched file, once', async () => {
  const host = fakeHost()
  const { dir, cache } = cacheWith(host)
  const file = await cache.resolve('wt-icon://item/274374')
  expect(file).toBe(path.join(dir, 'icons_56_4622270.jpg'))
  expect(readFileSync(file!, 'utf8')).toBe('jpeg-key')
  expect(await cache.resolve('wt-icon://item/274374')).toBe(file)
  expect(host.calls).toEqual(['icons/56/4622270'])
  expect(!existsSync(`${file}.part`)).toBeTruthy()
})

it('two requests in flight for one picture cost one fetch', async () => {
  const host = fakeHost()
  const { cache } = cacheWith(host)
  const [a, b] = await Promise.all([cache.resolve('wt-icon://item/274374'), cache.resolve('wt-icon://item/274374')])
  expect(a).toBe(b)
  expect(host.calls).toEqual(['icons/56/4622270'])
})

it('a class is named by its token, not looked up', async () => {
  const host = fakeHost()
  const { dir, cache } = cacheWith(host)
  expect(await cache.resolve('wt-icon://class/WARRIOR')).toBe(path.join(dir, 'icons_56_classicon_warrior.jpg'))
  expect(host.calls).toEqual(['icons/56/classicon_warrior'])
})

it('an id the lexicon does not know is nothing, and no request', async () => {
  const host = fakeHost()
  const { cache } = cacheWith(host)
  expect(await cache.resolve('wt-icon://item/1')).toBe(null)
  expect(await cache.resolve('wt-icon://recipe/274374')).toBe(null)
  expect(await cache.resolve('wt-icon://potion/274374')).toBe(null)
  expect(await cache.resolve('wt-icon://item/')).toBe(null)
  expect(await cache.resolve('not an address')).toBe(null)
  expect(host.calls).toEqual([])
})

it('a portrait is the character render in the region, by the key', async () => {
  const host = fakeHost()
  const { dir, cache } = cacheWith(host)
  expect(await cache.resolve('wt-icon://portrait/zirkel-des-cenarius-kael')).toBe(
    path.join(dir, 'character_zirkel-des-cenarius_240_160626160-avatar.jpg')
  )
  expect(await cache.resolve('wt-icon://inset/zirkel-des-cenarius-mira')).toBe(null)
  expect(host.calls).toEqual(['character/zirkel-des-cenarius/240/160626160-avatar'])
})

it('a picture the host has not is asked for once', async () => {
  const host = fakeHost()
  const { cache } = cacheWith(host)
  expect(await cache.resolve('wt-icon://currency/3008')).toBe(null)
  expect(await cache.resolve('wt-icon://currency/3008')).toBe(null)
  expect(host.calls).toEqual(['icons/56/4638725'])
})

it('a host that did not answer is asked again', async () => {
  const host = fakeHost()
  host.down = true
  const { cache } = cacheWith(host)
  expect(await cache.resolve('wt-icon://item/274374')).toBe(null)
  host.down = false
  expect(await cache.resolve('wt-icon://item/274374')).toBeTruthy()
  expect(host.calls).toEqual(['icons/56/4622270', 'icons/56/4622270'])
})

it('the setting off serves what is there and fetches nothing', async () => {
  const host = fakeHost()
  let enabled = true
  const { cache } = cacheWith(host, () => enabled)
  const file = await cache.resolve('wt-icon://item/274374')
  enabled = false
  expect(await cache.resolve('wt-icon://item/274374')).toBe(file)
  expect(await cache.resolve('wt-icon://class/WARRIOR')).toBe(null)
  expect(host.calls).toEqual(['icons/56/4622270'])
})

it('the host fetcher takes a picture, knows a missing one, and throws on anything else', async () => {
  const answers = new Map([
    [hostUrl('eu', 'icons/56/4622270'), { status: 200, type: 'image/jpeg', body: 'jpeg' }],
    [hostUrl('eu', 'icons/56/999'), { status: 403, type: 'text/html', body: 'forbidden' }],
    [hostUrl('eu', 'icons/56/998'), { status: 404, type: 'text/html', body: 'not found' }],
    [hostUrl('eu', 'icons/56/busy'), { status: 429, type: 'text/plain', body: 'slow down' }],
    [hostUrl('eu', 'icons/56/page'), { status: 200, type: 'text/html', body: '<html>' }]
  ])
  const fetchIcon = hostFetcher((async (url: string) => {
    const answer = answers.get(url)!
    return {
      ok: answer.status < 300,
      status: answer.status,
      headers: { get: () => answer.type },
      arrayBuffer: async () => new TextEncoder().encode(answer.body).buffer
    }
  }) as unknown as typeof fetch)
  expect((await fetchIcon(hostUrl('eu', 'icons/56/4622270')))!.toString()).toBe('jpeg')
  expect(await fetchIcon(hostUrl('eu', 'icons/56/999'))).toBe(null)
  expect(await fetchIcon(hostUrl('eu', 'icons/56/998'))).toBe(null)
  await expect(fetchIcon(hostUrl('eu', 'icons/56/busy'))).rejects.toThrow()
  await expect(fetchIcon(hostUrl('eu', 'icons/56/page'))).rejects.toThrow()
  expect(hostUrl('eu', 'icons/56/classicon_warrior')).toBe('https://render.worldofwarcraft.com/eu/icons/56/classicon_warrior.jpg')
  expect(hostUrl('us', 'character/zirkel-des-cenarius/240/160626160-inset')).toBe(
    'https://render.worldofwarcraft.com/us/character/zirkel-des-cenarius/240/160626160-inset.jpg'
  )
})

it('no more than the limit of fetches run at once, and every request is served', async () => {
  let running = 0
  let most = 0
  const host: FakeHost = { calls: [], down: false, fetchIcon: async () => null }
  host.fetchIcon = async (url) => {
    const ref = url.replace(HOST, '')
    running += 1
    most = Math.max(most, running)
    await new Promise((resolve) => setTimeout(resolve, 5))
    running -= 1
    host.calls.push(ref)
    return Buffer.from(`jpeg-${ref}`)
  }
  const dir = tempDir('icon-queue')
  const many = emptyLexicon()
  for (let i = 1; i <= 40; i += 1) many.item[i] = 1000 + i
  const cache = new IconCache({ dir, lexicon: () => many, region: () => 'eu', enabled: () => true, fetchIcon: host.fetchIcon })
  const files = await Promise.all(Array.from({ length: 40 }, (_, i) => cache.resolve(`wt-icon://item/${i + 1}`)))
  expect(files.filter(Boolean).length).toBe(40)
  expect(host.calls.length).toBe(40)
  expect(most <= ICON_FETCH_LIMIT).toBeTruthy()
  expect(most > 1).toBeTruthy()
})
