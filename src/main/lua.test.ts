/**
 * Smoke test for the SavedVariables parser against a realistic WoW dump.
 *
 */

import { expect, it } from 'vitest'
import { parseSavedVariables, tList, tNum, tStr, isTable, tGet } from './lua'
const SAMPLE = String.raw`
WarbandBriefingDB = {
	["version"] = 1,
	["chars"] = {
		["Klöße-blackmoore"] = {
			["name"] = "Klöße",
			["realm"] = "Blackmoore",
			["realmSlug"] = "blackmoore",
			["region"] = "EU",
			["class"] = "MAGE",
			["classLocalized"] = "Magier",
			["level"] = 80,
			["ilvl"] = 638.6875,
			["updatedAt"] = 1757260000,
			["nextResetAt"] = 1757480400,
			["money"] = 12345678,
			["vault"] = {
				["mythicPlus"] = {
					{
						["threshold"] = 1,
						["progress"] = 6,
						["level"] = 12,
						["rewardIlvl"] = 649,
						["unlocked"] = true,
						["index"] = 1,
					}, -- [1]
					{
						["threshold"] = 4,
						["progress"] = 6,
						["level"] = 10,
						["rewardIlvl"] = 645,
						["unlocked"] = true,
						["index"] = 2,
					}, -- [2]
					{
						["threshold"] = 8,
						["progress"] = 6,
						["level"] = 0,
						["unlocked"] = false,
						["index"] = 3,
					}, -- [3]
				},
				["raid"] = {
					{
						["threshold"] = 2,
						["progress"] = 3,
						["level"] = 3,
						["rewardIlvl"] = 652,
						["unlocked"] = true,
						["index"] = 1,
					}, -- [1]
				},
				["world"] = {
				},
			},
			["runs"] = {
				{
					["mapId"] = 503,
					["name"] = "Ara-Kara, Stadt der Echos",
					["level"] = 12,
					["completed"] = true,
					["thisWeek"] = true,
				}, -- [1]
				{
					["mapId"] = 502,
					["name"] = "Stadt der Fäden",
					["level"] = 10,
					["completed"] = true,
					["thisWeek"] = true,
				}, -- [2]
			},
			["currencies"] = {
				{
					["id"] = 3008,
					["name"] = "Valorsteine",
					["quantity"] = 1420,
					["max"] = 2000,
				}, -- [1]
				{
					["id"] = 3110,
					["name"] = "Runenverzierte Wappen",
					["quantity"] = 90,
				}, -- [2]
			},
			["mythicRating"] = 2415.5,
			["savedBecause"] = "logout",
		},
	},
}
`

const globals = parseSavedVariables(SAMPLE)
const db = globals['WarbandBriefingDB']

it('version', () => {
  expect(tNum(db, 'version')).toEqual(1)
})

const chars = tGet(db, 'chars')
const entry = isTable(chars) ? chars.map['Klöße-blackmoore'] : undefined
it('character found', () => {
  expect(isTable(entry)).toEqual(true)
})
it('name with umlaut', () => {
  expect(tStr(entry, 'name')).toEqual('Klöße')
})
it('item level (float)', () => {
  expect(tNum(entry, 'ilvl')).toEqual(638.6875)
})
it('mythic rating', () => {
  expect(tNum(entry, 'mythicRating')).toEqual(2415.5)
})

const vault = tGet(entry, 'vault')
const mplus = tList(vault, 'mythicPlus')
it('m+ slot count', () => {
  expect(mplus.length).toEqual(3)
})
it('slot 1 reward ilvl', () => {
  expect(tNum(mplus[0], 'rewardIlvl')).toEqual(649)
})
it('slot 3 locked', () => {
  expect(tNum(mplus[2], 'level')).toEqual(0)
})
it('raid row parsed', () => {
  expect(tList(vault, 'raid').length).toEqual(1)
})
it('empty world row', () => {
  expect(tList(vault, 'world').length).toEqual(0)
})

const runs = tList(entry, 'runs')
it('run count', () => {
  expect(runs.length).toEqual(2)
})
it('run dungeon name', () => {
  expect(tStr(runs[0], 'name')).toEqual('Ara-Kara, Stadt der Echos')
})
it('run level', () => {
  expect(tNum(runs[1], 'level')).toEqual(10)
})

const currencies = tList(entry, 'currencies')
it('currency count', () => {
  expect(currencies.length).toEqual(2)
})
it('currency without max', () => {
  expect(tNum(currencies[1], 'quantity')).toEqual(90)
})

// Edge cases the real serializer produces.
const edge = parseSavedVariables(String.raw`
Other = {
	["escaped"] = "Zeile1\nZeile2 \"zitiert\"",
	["negative"] = -12.5,
	["exp"] = 1e3,
	["boolFalse"] = false,
	["nilValue"] = nil,
	[42] = "numeric key",
	["nested"] = { { 1, 2, 3 }, { ["a"] = true } },
}
Second = 7
`)
it('escaped string', () => {
  expect(tStr(edge['Other'], 'escaped')).toEqual('Zeile1\nZeile2 "zitiert"')
})
it('negative number', () => {
  expect(tNum(edge['Other'], 'negative')).toEqual(-12.5)
})
it('exponent', () => {
  expect(tNum(edge['Other'], 'exp')).toEqual(1000)
})
it('numeric key', () => {
  expect(tStr(edge['Other'], '42')).toEqual('numeric key')
})
it('second assignment', () => {
  expect(edge['Second']).toEqual(7)
})
it('nested array literal', () => {
  expect(tList(edge['Other'], 'nested').length).toEqual(2)
})
