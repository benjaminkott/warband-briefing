/**
 * Tests for the window frame: the file it is kept in, the legacy frame from
 * the state file, and the check that a frame still lands on a screen.
 */

import { expect, it } from 'vitest'
import { WindowFrame, landsOn } from './windowFrame'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { tempDir } from './testing'

const placement = (x: number, y: number, width = 1278, height = 671, maximized = false) => ({ x, y, width, height, maximized })
const freshDir = () => tempDir('frame')

/* ---- landsOn ---- */

const primary = { x: 0, y: 0, width: 3440, height: 1440 }
const left = { x: -2560, y: 0, width: 2560, height: 1440 }

it('a frame inside the area lands', () => {
  expect(landsOn(placement(100, 100), primary)).toEqual(true)
})
it('a frame on the left screen lands there', () => {
  expect(landsOn(placement(-1305, 586), left)).toEqual(true)
})
it('a frame on a screen that is gone does not land', () => {
  expect(landsOn(placement(-1305, 586), primary)).toEqual(false)
})
it('a frame with only a sliver on the area does not land', () => {
  expect(landsOn(placement(3300, 100), primary)).toEqual(false)
})
it('a frame with its title bar on the area lands', () => {
  expect(landsOn(placement(3000, 1300), primary)).toEqual(true)
})

/* ---- the file ---- */

it('a set frame is the frame, in a file the next start reads back, with no temporary file left', async () => {
  const dir = freshDir()
  const frame = new WindowFrame(dir)
  await frame.load()
  expect(frame.get()).toEqual(null)
  await frame.set(placement(10, 20))
  expect(frame.get()).toEqual(placement(10, 20))
  expect(existsSync(path.join(dir, 'window.json'))).toEqual(true)
  expect(existsSync(path.join(dir, 'window.json.tmp'))).toEqual(false)

  const again = new WindowFrame(dir)
  await again.load()
  expect(again.get()).toEqual(placement(10, 20))
})

it('no file: the legacy frame counts', async () => {
  const frame = new WindowFrame(freshDir())
  await frame.load(placement(-1305, 586, 1278, 671, true))
  expect(frame.get()).toEqual(placement(-1305, 586, 1278, 671, true))
})

it('a file wins over the legacy frame', async () => {
  const dir = freshDir()
  writeFileSync(path.join(dir, 'window.json'), JSON.stringify(placement(1, 2)), 'utf8')
  const frame = new WindowFrame(dir)
  await frame.load(placement(-1305, 586))
  expect(frame.get()).toEqual(placement(1, 2))
})

it('a file of the wrong shape falls back to the legacy frame', async () => {
  const dir = freshDir()
  writeFileSync(path.join(dir, 'window.json'), '{"x":"left"}', 'utf8')
  const frame = new WindowFrame(dir)
  await frame.load(placement(3, 4))
  expect(frame.get()).toEqual(placement(3, 4))
})

it('a broken file is no frame', async () => {
  const dir = freshDir()
  writeFileSync(path.join(dir, 'window.json'), '{not json', 'utf8')
  const frame = new WindowFrame(dir)
  await frame.load()
  expect(frame.get()).toEqual(null)
})

it('the last of a burst of writes is the file', async () => {
  const dir = freshDir()
  const frame = new WindowFrame(dir)
  await frame.load()
  // Writes in a burst, the way a drag raises them: the last one is the file.
  await Promise.all([placement(1, 1), placement(2, 2), placement(3, 3)].map((p) => frame.set(p)))
  expect(JSON.parse(readFileSync(path.join(dir, 'window.json'), 'utf8'))).toEqual(placement(3, 3))
})
