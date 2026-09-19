/**
 * End-to-end test of the read chain: a fake WoW folder holding real-shaped
 * SavedVariables of the supported community addons -> adapters -> merged
 * character list.
 */

import { expect, it } from 'vitest'
import { readSources, mergeSources, getSourceStatuses, ADAPTERS } from './index'
import { lastWeeklyReset, formatUntilReset, resetFromClient } from '../season'
import { normaliseWowPath } from '../wow'
import { seasonCatalog, seasonQuestDefs, seasonCurrencyNames } from '../../shared/seasonCatalog'
import { createTranslator, t, LOCALES, resolveSystemLocale, difficultyLabel } from '../../shared/i18n/index'
import { compareVersions } from '../../shared/version'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { tempDir } from '../testing'
import { Region } from '../../shared/enums/region'
import { VaultCategory } from '../../shared/enums/vaultCategory'
import type { CharacterSnapshot } from '../../shared/types'
import type { ReadResult } from './index'

/* ---- fake WoW installation ---- */

const wowRoot = tempDir('wow')
const account = 'ACCOUNT#1'
const svDir = path.join(wowRoot, '_retail_', 'WTF', 'Account', account, 'SavedVariables')
mkdirSync(svDir, { recursive: true })
for (const addon of ['WarbandBriefing', 'SavedInstances']) {
  mkdirSync(path.join(wowRoot, '_retail_', 'Interface', 'AddOns', addon), { recursive: true })
}

// The activity catalogue lives in the addon's code, not in its data. Written
// with Windows line endings, as the addon ships it.
const modulesDir = path.join(wowRoot, '_retail_', 'Interface', 'AddOns', 'SavedInstances', 'Modules')
mkdirSync(modulesDir, { recursive: true })
writeFileSync(
  path.join(modulesDir, 'Progress.lua'),
  [
    'local presets = {',
    '  ["great-vault-raid"] = {',
    '    type = "custom",',
    '    index = 1,',
    '    func = function(store, entry)',
    '      wipe(store)',
    '    end,',
    '  },',
    '  ["mn-zone-weekly"] = {',
    '    type = "single",',
    '    expansion = 11,',
    '    index = 2,',
    '    name = L["Purging the Vaults"],',
    '    questID = 95520, -- The Coiled Isle: Purging the Vaults',
    '    reset = "weekly",',
    '    persists = false,',
    '    fullObjective = false,',
    '  },',
    '  ["mn-hunts"] = {',
    '    type = "list",',
    '    expansion = 11,',
    '    index = 3,',
    '    name = L["Midnight Prey"],',
    '    questID = {',
    '      91095, -- Prey: One',
    '      91096, -- Prey: Two',
    '      91097, -- Prey: Three',
    '    },',
    '    reset = "weekly",',
    '    persists = false,',
    '    threshold = 2,',
    '    progress = true,',
    '  },',
    '  ["mn-meta"] = {',
    '    type = "any",',
    '    expansion = 11,',
    '    index = 4,',
    '    name = L["Midnight Meta Quest"],',
    '    questID = {',
    '      76586, -- the configured world boss quest sits in this group',
    '      93909,',
    '    },',
    '    reset = "weekly",',
    '  },',
    '  ["tww-old-weekly"] = {',
    '    type = "single",',
    '    expansion = 10,',
    '    index = 5,',
    '    name = L["Last Expansion"],',
    '    questID = 82000,',
    '    reset = "weekly",',
    '  },',
    '  ["mn-daily"] = {',
    '    type = "single",',
    '    expansion = 11,',
    '    index = 6,',
    '    name = L["A Daily"],',
    '    questID = 82001,',
    '    reset = "daily",',
    '  },',
    '}'
  ].join('\r\n'),
  'utf8'
)

const now = Math.floor(Date.now() / 1000)
const nextWeek = now + 5 * 24 * 3600
// Anchored to the real reset, not to "an hour ago": run the test in the first
// hour of a new week and "an hour ago" is last week.
const resetSec = Math.floor(lastWeeklyReset(Region.Eu) / 1000)
const thisWeek = Math.max(now - 3600, resetSec + 60)
// Three days before the last reset: inside the week that ended, whatever the
// weekday. "Nine days ago" is two weeks back on a Wednesday or Thursday, and
// the vault's one-week grace for a reward left uncollected is then over.
const lastWeek = resetSec - 3 * 24 * 3600
// After the previous reset but before the last one: the week that just ended.
const endedWeek = resetSec - 2 * 3600

// Layout mirrors real SavedInstances files (DBVersion 12).
writeFileSync(
  path.join(svDir, 'SavedInstances.lua'),
  String.raw`
SavedInstancesDB = {
	["DBVersion"] = 12,
	["Toons"] = {
		["Klöße - Zirkel des Cenarius"] = {
			["Level"] = 90,
			["Class"] = "MAGE",
			["LClass"] = "Magier",
			["Faction"] = "Horde",
			["IL"] = 700,
			["ILe"] = 690.5,
			["MythicPlusScore"] = 2415,
			["Money"] = 1,
			["LastSeen"] = ${thisWeek},
			["WeeklyResetTime"] = ${nextWeek},
			["MythicKey"] = { ["mapID"] = 503, ["level"] = 11, ["link"] = "|cnIQ4:|Hkeystone:180653:503:11|h[Schlüsselstein: Ara-Kara]|h" },
			["MythicKeyBest"] = {
				["threshold"] = { 1, 4, 8 },
				["ResetTime"] = ${nextWeek},
				12, 10, 0,
				["runHistory"] = {
					{ ["level"] = 12, ["name"] = "Ara-Kara", ["mapChallengeModeID"] = 503, ["completed"] = true, ["thisWeek"] = true,
					  ["durationSec"] = 1712, ["runScore"] = 301,
					  ["completionDate"] = { ["year"] = 2026, ["month"] = 3, ["monthDay"] = 12, ["hour"] = 20, ["minute"] = 15 } },
					{ ["level"] = 10, ["name"] = "Stadt der Fäden", ["mapChallengeModeID"] = 502, ["completed"] = true, ["thisWeek"] = true },
					{ ["level"] = 9, ["name"] = "Ara-Kara", ["mapChallengeModeID"] = 503, ["completed"] = false, ["thisWeek"] = true },
					{ ["level"] = 20, ["name"] = "Letzte Woche", ["mapChallengeModeID"] = 999, ["completed"] = true, ["thisWeek"] = false },
				},
			},
			["currency"] = {
				[3008] = { ["amount"] = 1000, ["totalMax"] = 2000 },
				-- A season currency: no addon knows its name, the catalogue does.
				[3444] = { ["amount"] = 355, ["totalMax"] = 400 },
			},
			-- Completed dailies and weeklies, the only completion record there is.
			["Quests"] = {
				[76586] = { ["Title"] = "Weltboss", ["Expires"] = ${nextWeek} },
				[70001] = { ["Title"] = "Gestern", ["Expires"] = ${now - 3600} },
				-- A daily resets before the week does; it is no weekly suggestion.
				[99001] = { ["Title"] = "Täglich", ["isDaily"] = true, ["Expires"] = ${nextWeek} },
				-- A loot tracker: the title is the item's link, no quest a player names.
				[95131] = { ["Title"] = "|cnIQ3:|Hitem:245757::::::::90:70:::::::::|h[Thalassian Treatise on Inscription]|h|r (Loot)", ["Expires"] = ${nextWeek} },
			},
			["Progress"] = {
				-- Campaign steps carry a show flag each: tracked, never done.
				["tww-weekly"] = { ["show"] = true, [82897] = { ["show"] = false } },
				["great-vault-raid"] = { 16, 15, ["unlocked"] = true },
				["great-vault-world"] = { 11, 11, 8, ["unlocked"] = true },
				-- The tracker's stores: a zone weekly at 40%, a hunt list at 1 of 2,
				-- a group holding a configured quest, last expansion's weekly.
				["mn-zone-weekly"] = { ["show"] = true, ["isComplete"] = false, ["isFinish"] = false,
				  ["numFulfilled"] = 40, ["numRequired"] = 100, ["text"] = "40%", ["objectiveType"] = "progressbar" },
				["mn-hunts"] = { ["show"] = true,
				  [91095] = { ["show"] = true, ["isComplete"] = true },
				  [91096] = { ["show"] = false },
				  [91097] = { ["show"] = true, ["isComplete"] = false, ["numFulfilled"] = 0, ["numRequired"] = 1 } },
				["mn-meta"] = { ["show"] = true, ["isComplete"] = false, ["numFulfilled"] = 1, ["numRequired"] = 4, ["text"] = "1/4" },
				["tww-old-weekly"] = { ["show"] = true, ["isComplete"] = false, ["numFulfilled"] = 0, ["numRequired"] = 3 },
				["mn-daily"] = { ["show"] = true, ["isComplete"] = false },
			},
			["Zone"] = "Dornogal",
			["lastboss"] = "Ansurek: Mythic",
			["lastbosstime"] = ${thisWeek - 600},
		},
		["Zwergimzwerg - Zirkel des Cenarius"] = {
			["Level"] = 80,
			["Class"] = "WARRIOR",
			["LClass"] = "Krieger",
			["ILe"] = 610.5,
			["MythicPlusScore"] = 1500,
			["LastSeen"] = ${lastWeek},
			-- Reset already passed: this describes a previous week and must be ignored.
			["MythicKeyBest"] = { ["threshold"] = { 1, 4, 8 }, ["ResetTime"] = ${lastWeek}, 7 },
			["currency"] = {},
		},
		["Twink - Turalyon"] = {
			["Level"] = 42,
			["Class"] = "ROGUE",
			["LastSeen"] = ${now},
			["XP"] = 12000,
			["MaxXP"] = 48000,
			["RestXP"] = 9600,
		},
		-- Seen in the week that just ended, with slots filled: the vault still
		-- holds that reward until the next reset, so it has to survive.
		["Abholbereit - Turalyon"] = {
			["Level"] = 90,
			["Class"] = "MAGE",
			["LClass"] = "Magier",
			["ILe"] = 630,
			["LastSeen"] = ${endedWeek},
			-- Reset passed since: the client has not been in to empty the vault,
			-- and the key recorded here is one the reset has already taken away.
			["WeeklyResetTime"] = ${endedWeek + 60},
			["MythicKey"] = { ["mapID"] = 503, ["level"] = 9, ["link"] = "|cnIQ4:|Hkeystone:180653:503:9|h[Schlüsselstein: Ara-Kara]|h" },
			["Progress"] = {
				["great-vault-raid"] = { 16, 16, ["unlocked"] = true },
				["great-vault-world"] = { 11, ["unlocked"] = true },
			},
		},
		-- Known to the companion addon as well, which is what lets the merge be
		-- tested: the client's own vault has to win over the reconstructed one.
		["Doppelt - Turalyon"] = {
			["Level"] = 90,
			["Class"] = "SHAMAN",
			["LClass"] = "Schamane",
			["ILe"] = 620,
			["LastSeen"] = ${thisWeek},
			["WeeklyResetTime"] = ${nextWeek},
			["Progress"] = {
				["great-vault-raid"] = { 14, ["unlocked"] = true },
			},
		},
		["Vorwoche - Turalyon"] = {
			["Level"] = 90,
			["Class"] = "PRIEST",
			["LClass"] = "Priester",
			["ILe"] = 600,
			["LastSeen"] = ${lastWeek},
			-- Reset schon vorbei: alles darunter beschreibt die Vorwoche.
			["WeeklyResetTime"] = ${lastWeek + 3600},
			["Progress"] = {
				["great-vault-raid"] = { 16, 16, 16 },
				["great-vault-world"] = { 11, 11, 11 },
			},
		},
	},
	-- Weeklies that complete once for the whole account sit beside no character.
	["Quests"] = {
		[95416] = { ["Title"] = "Going Postal", ["Expires"] = ${nextWeek} },
		[95000] = { ["Title"] = "Vorbei", ["Expires"] = ${now - 3600} },
	},
	-- Nested character-major, as current files are: [instance][toon][difficulty].
	["Instances"] = {
		["Manaschmiede Omega"] = {
			["Raid"] = true,
			["Expansion"] = 11,
			["Klöße - Zirkel des Cenarius"] = {
				-- No kill count of its own; the link's last field is a bitmask
				-- of the bosses already down (3 = the first two).
				[16] = {
					["Expires"] = ${nextWeek},
					["Locked"] = true,
					["Link"] = "|cffff8000|Hinstancelock:Player-1-000001:2810:16:3|h[Manaschmiede Omega]|h|r",
				},
				[15] = {
					["Expires"] = ${nextWeek},
					["Locked"] = true,
					["Killed"] = 3,
					["Total"] = 8,
					true, true, true, false, false, false, false, false,
				},
			},
			["Zwergimzwerg - Zirkel des Cenarius"] = {
				-- Been inside, saved to nothing: not a lockout.
				[16] = { ["Expires"] = 0, ["Locked"] = false },
			},
		},
		-- The layout older files used: [instance][difficulty][toon].
		["Alter Raid aus einer alten Erweiterung"] = {
			["Raid"] = true,
			["Expansion"] = 8,
			[16] = {
				["Klöße - Zirkel des Cenarius"] = {
					["Expires"] = ${nextWeek},
					["Locked"] = true,
					["Killed"] = 6,
					["Total"] = 10,
				},
			},
		},
		["Ara-Kara"] = {
			["Raid"] = false,
			["Expansion"] = 11,
			["Zwergimzwerg - Zirkel des Cenarius"] = {
				[23] = {
					["Expires"] = ${nextWeek},
					["Locked"] = true,
					true, false, false,
				},
			},
		},
		["Abgelaufener Raid"] = {
			["Raid"] = true,
			["Expansion"] = 11,
			["Klöße - Zirkel des Cenarius"] = {
				[16] = {
					["Expires"] = ${now - 86400},
					["Locked"] = true,
					["Killed"] = 4,
					true, true, true, true,
				},
			},
		},
	},
}
`,
  'utf8'
)

// The companion addon: the only source that carries the vault's rewards and
// the reset the client itself reports.
writeFileSync(
  path.join(svDir, 'WarbandBriefing.lua'),
  String.raw`
WarbandBriefingDB = {
["version"] = 10,
["expansion"] = 11,
-- The warband bank's gold at the last save.
["warbandGold"] = { ["money"] = 5100000, ["updatedAt"] = ${thisWeek} },
-- The guild banks at their last visit; an empty one is no entry.
["guilds"] = {
	["Doppelgilde-turalyon"] = { ["name"] = "Doppelgilde", ["realm"] = "Turalyon", ["money"] = 3000000, ["updatedAt"] = ${thisWeek} },
	["Leer-turalyon"] = { ["name"] = "Leer", ["realm"] = "Turalyon", ["money"] = 0, ["updatedAt"] = ${thisWeek} },
},
-- The warband bank as the companion read it at the bank.
["warbandBank"] = {
	["updatedAt"] = ${thisWeek},
	["tabs"] = {
		{ ["name"] = "Vorräte", ["slots"] = 98, ["free"] = 96, ["items"] = {
			{ ["id"] = 7001, ["count"] = 120, ["quality"] = 3, ["link"] = "|cnIQ3:|Hitem:7001::::::::90:70|h[Fläschchen]|h|r" },
			{ ["id"] = 7010, ["count"] = 1, ["quality"] = 4, ["link"] = "|cnIQ4:|Hitem:7010::::::::90:70|h[Erbstück]|h|r" },
		} },
		{ ["name"] = "Leer", ["slots"] = 98, ["free"] = 98, ["items"] = {} },
	},
},
-- The register of icons: the file id by id, string keys as the addon writes them; a zero is no icon.
["icons"] = {
	["items"] = { ["274374"] = 4622270, ["241323"] = 0 },
	["currencies"] = { ["3008"] = 4638725 },
	["recipes"] = { ["430345"] = 4643982 },
	["professions"] = { ["171"] = 4620676 },
	-- What an item is: class * 100 + subclass; a potion is 1, a flask 3.
	["classes"] = { ["7001"] = 3, ["274374"] = 1204 },
},
-- The register of tooltips: the client's lines by item id, colours where not white, markup in the text.
["tooltips"] = {
	["items"] = {
		["7001"] = {
			{ ["l"] = "Fläschchen", ["lc"] = "0070dd" },
			{ ["l"] = "Benutzen: |cFF00FF00Erhöht die Stärke|r um 100.", ["lc"] = "00ff00" },
			{ ["l"] = "" },
			{ ["l"] = "Verkaufspreis: |TInterface\MoneyFrame\UI-GoldIcon:0:0:2:0|t 12", ["r"] = "|A:Professions-ChatIcon-Quality-Tier3:17:17|a" },
		},
		["2001"] = { { ["l"] = "Helm", ["lc"] = "a335ee" }, { ["l"] = "Kopf", ["r"] = "Kette", ["rc"] = "ZZZZZZ" } },
		-- Only markup: no tooltip.
		["7003"] = { { ["l"] = "|TInterface\Icons\x:0|t" } },
	},
},
-- The register: what the client says about every quest a character had on its log.
["quests"] = {
	-- The season's wrapper, flagged weekly, done this week.
	["93909"] = { ["title"] = "Mitternacht: Tiefen", ["frequency"] = "Weekly", ["classification"] = "Meta", ["expansion"] = 11, ["seenAt"] = ${thisWeek}, ["doneAt"] = ${thisWeek} },
	-- A meta quest a schedule resets: the season's weeklies carry this frequency.
	["93911"] = { ["title"] = "Mitternacht: Dungeons", ["frequency"] = "ResetByScheduler", ["classification"] = "Meta", ["expansion"] = 11, ["seenAt"] = ${thisWeek - 60} },
	-- Flagged nothing, but seen to clear across a reset.
	["95520"] = { ["title"] = "Die Gewölbe säubern", ["frequency"] = "Default", ["classification"] = "Normal", ["expansion"] = 11, ["resets"] = "weekly", ["seenAt"] = ${endedWeek} },
	-- The profession weeklies: the tag names the skill line, and binds the quest.
	["90001"] = { ["title"] = "Alchemie-Dienste gefragt", ["frequency"] = "Weekly", ["classification"] = "Recurring", ["expansion"] = 11, ["tradeskill"] = 2871, ["seenAt"] = ${thisWeek} },
	["90002"] = { ["title"] = "Schneiderei-Dienste gefragt", ["frequency"] = "Weekly", ["classification"] = "Recurring", ["expansion"] = 11, ["tradeskill"] = 197, ["seenAt"] = ${thisWeek} },
	["96101"] = { ["title"] = "Alchemiedienste erbeten", ["frequency"] = "Weekly", ["classification"] = "Recurring", ["expansion"] = 11, ["tradeskill"] = 171, ["seenAt"] = ${thisWeek} },
	-- Last expansion's weekly: not the season's.
	["82897"] = { ["title"] = "Wochenevent", ["frequency"] = "Weekly", ["classification"] = "Recurring", ["expansion"] = 10, ["seenAt"] = ${thisWeek} },
	-- A daily and a level quest: not weeklies.
	["96200"] = { ["title"] = "Tagesquest", ["frequency"] = "Daily", ["classification"] = "Recurring", ["expansion"] = 11, ["seenAt"] = ${thisWeek} },
	["90600"] = { ["title"] = "Levelquest", ["frequency"] = "Default", ["classification"] = "Normal", ["expansion"] = 11, ["seenAt"] = ${thisWeek} },
	-- A hidden tracking quest: registered, never a task.
	["96300"] = { ["hidden"] = true, ["frequency"] = "Weekly", ["expansion"] = 11, ["seenAt"] = ${thisWeek} },
	-- One of the season's rotating pool, on the board last week, not this one.
	["93890"] = { ["title"] = "Mitternacht: Überfluss", ["frequency"] = "Weekly", ["classification"] = "Meta", ["expansion"] = 11, ["seenAt"] = ${endedWeek} },
	-- The season's weekly on the log, not turned in yet.
	["96400"] = { ["title"] = "Neue Wochenquest", ["frequency"] = "Weekly", ["classification"] = "Recurring", ["expansion"] = 11, ["seenAt"] = ${thisWeek - 120} },
	-- A quest the game added to the season's pool after the seed: the prefix says which pool.
	["98600"] = { ["title"] = "Mitternacht: Neu", ["frequency"] = "ResetByScheduler", ["classification"] = "Meta", ["expansion"] = 11, ["seenAt"] = ${thisWeek - 30} },
},
["events"] = { ["updatedAt"] = ${thisWeek}, ["list"] = {
	{ ["title"] = "Zeitwanderung: Wrath of the Lich King", ["startsAt"] = ${now - 86400}, ["endsAt"] = ${now + 3 * 86400} },
	{ ["title"] = "Vorbei", ["endsAt"] = ${now - 3600} },
} },
["season"] = { ["updatedAt"] = ${thisWeek}, ["dungeons"] = {
	{ ["mapId"] = 503, ["name"] = "Ara-Kara" },
	{ ["mapId"] = 501, ["name"] = "Das Steingewölbe" },
	-- The client without the name yet: not a dungeon the app can name.
	{ ["mapId"] = 502 },
} },
["chars"] = {
	["Doppelt-turalyon"] = {
		["name"] = "Doppelt",
		["realm"] = "Turalyon",
		["realmSlug"] = "turalyon",
		["region"] = "EU",
		["guid"] = "Player-1405-0992F5F0",
		["class"] = "SHAMAN",
		["classLocalized"] = "Schamane",
		["spec"] = "Verstärkung",
		["level"] = 90,
		["ilvl"] = 620.5,
		["money"] = 1234500,
		["mythicRating"] = 2750,
		["updatedAt"] = ${thisWeek},
		["nextResetAt"] = ${nextWeek},
		["vaultRewardWaiting"] = false,
		["keystoneName"] = "Ara-Kara",
		["keystoneLevel"] = 13,
		["auctions"] = { ["count"] = 3, ["nextExpiresAt"] = ${now + 3600}, ["updatedAt"] = ${thisWeek} },
		["mail"] = { ["count"] = 2, ["updatedAt"] = ${thisWeek} },
		["vault"] = {
			["raid"] = {
				{ ["threshold"] = 2, ["progress"] = 2, ["level"] = 16, ["unlocked"] = true,
				  ["rewardIlvl"] = 723, ["rewardItem"] = "Kappe des Sturms" },
				{ ["threshold"] = 4, ["progress"] = 2, ["level"] = 0, ["unlocked"] = false },
				{ ["threshold"] = 6, ["progress"] = 2, ["level"] = 0, ["unlocked"] = false },
			},
			["mythicPlus"] = {
				{ ["threshold"] = 1, ["progress"] = 3, ["level"] = 12, ["unlocked"] = true,
				  ["rewardIlvl"] = 710, ["rewardItem"] = "Griff der Tiefe" },
				{ ["threshold"] = 4, ["progress"] = 3, ["level"] = 0, ["unlocked"] = false },
				{ ["threshold"] = 8, ["progress"] = 3, ["level"] = 0, ["unlocked"] = false },
			},
			["world"] = {
				{ ["threshold"] = 2, ["progress"] = 0, ["level"] = 0, ["unlocked"] = false },
				{ ["threshold"] = 4, ["progress"] = 0, ["level"] = 0, ["unlocked"] = false },
				{ ["threshold"] = 8, ["progress"] = 0, ["level"] = 0, ["unlocked"] = false },
			},
		},
		["runs"] = {
			{ ["mapId"] = 503, ["name"] = "Ara-Kara", ["level"] = 12, ["completed"] = true, ["score"] = 310, ["completedAt"] = ${thisWeek} },
		},
		["dungeonBests"] = {
			{ ["mapId"] = 503, ["name"] = "Ara-Kara", ["level"] = 12, ["inTime"] = true, ["score"] = 310, ["durationSec"] = 1600 },
			{ ["mapId"] = 502, ["name"] = "Stadt der Fäden", ["level"] = 9, ["inTime"] = false, ["score"] = 220, ["durationSec"] = 2400 },
		},
		["raidProgress"] = {
			{ ["id"] = 1273, ["name"] = "Palast der Nerub'ar", ["bosses"] = {
				{ ["id"] = 2902, ["name"] = "Ulgrax", ["kills"] = {} },
				{ ["id"] = 2917, ["name"] = "Ansurek", ["kills"] = {} },
			} },
			{ ["id"] = 1296, ["name"] = "Befreiung von Undermine", ["bosses"] = {
				{ ["id"] = 3009, ["name"] = "Vexie", ["kills"] = { ["14"] = 3, ["15"] = 1 } },
				{ ["id"] = 3010, ["name"] = "Kessel", ["kills"] = { ["14"] = 2 } },
				{ ["id"] = 3011, ["name"] = "Gallywix" },
			} },
		},
		["gear"] = {
			{ ["slot"] = 1, ["itemId"] = 2001, ["name"] = "Helm", ["ilvl"] = 700, ["enchantId"] = 0, ["sockets"] = 1, ["gems"] = 0, ["track"] = "Held 3/6", ["quality"] = 4 },
			{ ["slot"] = 5, ["itemId"] = 2005, ["name"] = "Brust", ["ilvl"] = 690, ["enchantId"] = 7987, ["sockets"] = 0, ["gems"] = 0, ["quality"] = 4 },
		},
		["renown"] = {
			{ ["factionId"] = 2590, ["name"] = "Rat von Dornogal", ["level"] = 12, ["current"] = 1500, ["max"] = 2500, ["maxed"] = false },
		},
		["bagSpace"] = { ["free"] = 17, ["total"] = 130 },
		-- The bags with their stacks summed by the addon, the bank as of the last visit.
		["bags"] = { ["slots"] = 130, ["free"] = 17, ["items"] = {
			{ ["id"] = 6948, ["count"] = 1, ["quality"] = 1, ["link"] = "|cnIQ1:|Hitem:6948::::::::90:70|h[Ruhestein]|h|r" },
			{ ["id"] = 7001, ["count"] = 12, ["quality"] = 3, ["link"] = "|cnIQ3:|Hitem:7001::::::::90:70|h[Fläschchen]|h|r" },
			{ ["id"] = 212000, ["count"] = 1, ["quality"] = 4, ["ilvl"] = 678, ["link"] = "|cnIQ4:|Hitem:212000::::::::90:70|h[Krone]|h|r" },
			{ ["id"] = 212249, ["count"] = 40, ["quality"] = 1, ["link"] = "|cnIQ1:|Hitem:212249::::::::90:263::::1:38:2:::::|h[Kraut |A:Professions-ChatIcon-Quality-Tier2:17:15::1|a]|h|r" },
			{ ["id"] = 212282, ["count"] = 3, ["quality"] = 1, ["link"] = "|cnIQ1:|Hitem:212282::::::::90:263:::::::::|h[Staub |A:Professions-ChatIcon-Quality-Tier3:17:15::1|a]|h|r" },
		} },
		["bank"] = { ["updatedAt"] = ${thisWeek}, ["tabs"] = {
			{ ["name"] = "Kram", ["slots"] = 98, ["free"] = 97, ["items"] = {
				{ ["id"] = 7003, ["count"] = 1, ["quality"] = 4, ["link"] = "|cnIQ4:|Hitem:7003::::::::90:70|h[Relikt]|h|r" },
			} },
		} },
		["professions"] = {
			{ ["name"] = "Alchemie", ["skillLineId"] = 2871, ["skill"] = 100, ["maxSkill"] = 100, ["concentration"] = 1000, ["concentrationMax"] = 1000, ["knowledge"] = 12 },
			{ ["name"] = "Kräuterkunde", ["skillLineId"] = 2877, ["skill"] = 80, ["maxSkill"] = 100 },
		},
		-- Read when the profession window was open: one ready, one running.
		["cooldowns"] = {
			["430619"] = { ["name"] = "Transmutation", ["readyAt"] = 0, ["seenAt"] = ${thisWeek} },
			["430620"] = { ["name"] = "Weben", ["readyAt"] = ${thisWeek + 86400}, ["charges"] = 0, ["maxCharges"] = 1, ["seenAt"] = ${thisWeek} },
		},
		["lockouts"] = {
			{ ["name"] = "Manaschmiede Omega", ["difficulty"] = "Heroisch", ["difficultyId"] = 15,
			  ["isRaid"] = true, ["maxPlayers"] = 30, ["defeated"] = 4, ["total"] = 8,
			  ["bosses"] = { "Plexi", "Loomi" }, ["resetsAt"] = ${nextWeek} },
		},
		["worldBosses"] = {},
		["currencies"] = {
			{ ["id"] = 3008, ["name"] = "Valorsteine", ["quantity"] = 500 },
		},
		-- The log and a turn-in: what a weekly on the way looks like.
		["questLog"] = {
			{ ["id"] = 82897, ["title"] = "Wochenevent", ["ready"] = false, ["fulfilled"] = 2, ["required"] = 4, ["frequency"] = 2 },
			{ ["id"] = 90001, ["title"] = "Alchemie-Dienste", ["ready"] = true, ["fulfilled"] = 1, ["required"] = 1 },
			{ ["id"] = 96400, ["title"] = "Neue Wochenquest", ["ready"] = false, ["fulfilled"] = 0, ["required"] = 3, ["frequency"] = 2 },
			{ ["id"] = 98600, ["title"] = "Mitternacht: Neu", ["ready"] = false, ["fulfilled"] = 1, ["required"] = 4, ["frequency"] = 3 },
			-- A hidden tracker an older addon wrote to the log: the register knows it is hidden.
			{ ["id"] = 96300, ["title"] = "Tracking Quest", ["ready"] = false, ["fulfilled"] = 0, ["required"] = 0, ["frequency"] = 2 },
		},
		["questsDone"] = {
			["76586"] = { ["title"] = "Weltboss erlegt", ["at"] = ${thisWeek}, ["frequency"] = 2 },
			-- A turn-in no other source saw: a suggestion only the companion can make.
			["90500"] = { ["title"] = "Nur der Companion", ["at"] = ${thisWeek}, ["frequency"] = 2 },
			-- A regular quest turned in: ticks the line if configured, never a suggestion.
			["90600"] = { ["title"] = "Levelquest", ["at"] = ${thisWeek}, ["frequency"] = 0 },
			-- Last week's turn-in, not pruned yet: no suggestion, no tick.
			["90501"] = { ["title"] = "Vorwoche", ["at"] = ${endedWeek} },
		},
		-- The client's completion flags for the registered quests, stamped
		-- for this week: a turn-in the addon was not there to see.
		["questsFlagged"] = { ["93909"] = true },
		["flaggedWeek"] = ${nextWeek},
	},
},
}
`,
  'utf8'
)

// A second fixture: a character whose MythicKeyBest has runs but no slot array.
const runsOnlyRoot = tempDir('runsonly')
const runsOnlySv = path.join(runsOnlyRoot, '_retail_', 'WTF', 'Account', account, 'SavedVariables')
mkdirSync(runsOnlySv, { recursive: true })
writeFileSync(
  path.join(runsOnlySv, 'SavedInstances.lua'),
  String.raw`
SavedInstancesDB = { ["Toons"] = { ["Nurruns - Turalyon"] = {
	["Level"] = 90, ["Class"] = "DRUID", ["ILe"] = 600,
	["LastSeen"] = ${now},
	["WeeklyResetTime"] = ${nextWeek},
	["MythicKeyBest"] = {
		["threshold"] = { 1, 4, 8 },
		["ResetTime"] = ${nextWeek},
		["runHistory"] = {
			{ ["level"] = 12, ["name"] = "Ara-Kara", ["completed"] = true, ["thisWeek"] = true },
			{ ["level"] = 10, ["name"] = "Grim Batol", ["completed"] = true, ["thisWeek"] = true },
		},
	},
} }, ["Instances"] = {} }
`,
  'utf8'
)

// A third fixture, for the rename: the companion's file under its old name
// (`WowTodo.lua`, global `WowTodoDB`) in one account, and both files in a
// second account, where only the current one may count.
const legacyRoot = tempDir('legacy')
const legacyChar = (name: string) => String.raw`{
	["name"] = "${name}", ["realm"] = "Turalyon", ["realmSlug"] = "turalyon", ["region"] = "EU",
	["class"] = "MAGE", ["level"] = 90, ["ilvl"] = 600, ["updatedAt"] = ${thisWeek}, ["nextResetAt"] = ${nextWeek},
	-- Flags stamped for the week that ended: the client cleared them since.
	["questsFlagged"] = { ["76586"] = true }, ["flaggedWeek"] = ${nextWeek - 7 * 86400},
}`
const legacyOnlySv = path.join(legacyRoot, '_retail_', 'WTF', 'Account', 'OLD#1', 'SavedVariables')
const bothSv = path.join(legacyRoot, '_retail_', 'WTF', 'Account', 'BOTH#1', 'SavedVariables')
mkdirSync(legacyOnlySv, { recursive: true })
mkdirSync(bothSv, { recursive: true })
writeFileSync(
  path.join(legacyOnlySv, 'WowTodo.lua'),
  `WowTodoDB = { ["version"] = 4, ["chars"] = { ["Altname-turalyon"] = ${legacyChar('Altname')} } }`,
  'utf8'
)
writeFileSync(
  path.join(bothSv, 'WowTodo.lua'),
  `WowTodoDB = { ["version"] = 4, ["chars"] = { ["Veraltet-turalyon"] = ${legacyChar('Veraltet')} } }`,
  'utf8'
)
writeFileSync(
  path.join(bothSv, 'WarbandBriefing.lua'),
  `WarbandBriefingDB = { ["version"] = 4, ["chars"] = { ["Aktuell-turalyon"] = ${legacyChar('Aktuell')} } }`,
  'utf8'
)

/* ---- assertions ---- */

const quests = [
  { id: 76586, label: 'Weltboss' },
  { id: 82897, label: 'Weekly-Event' },
  // Tagged Alchemy in the register: only the twin, who reports the profession, gets it.
  { id: 90001, label: 'Alchemie-Dienste gefragt' },
  // Tagged with a profession nobody has: gone for the twin, kept where the
  // professions are unknown.
  { id: 90002, label: 'Schneiderei-Dienste gefragt' },
  // Nobody has picked it up: the companion's log says so, SavedInstances cannot.
  { id: 90003, label: 'Nicht angenommen' },
  // Turned in while the addon was off: only the client's flag says so.
  { id: 93909, label: 'Midnight: Delves' },
  // Of the season's rotating pool, listed by itself: the register knows it, so it stands.
  { id: 93890, label: 'Midnight: Abundance' }
]
const translator = createTranslator('de')
const reset = lastWeeklyReset(Region.Eu)
const read = await readSources(wowRoot, quests, {}, translator)
const runsOnlyRead = await readSources(runsOnlyRoot, [], {}, translator)
const legacyRead = await readSources(legacyRoot, [], {}, translator)

it('legacy read errors', () => {
  expect(legacyRead.errors).toEqual([])
})
it('the old file is read where there is no current one, and ignored beside a current one', () => {
  expect(
    legacyRead.bySource
      .get('companion')!
      .map((c) => c.name)
      .sort()
  ).toEqual(['Aktuell', 'Altname'])
})

it('no read errors', () => {
  expect(read.errors).toEqual([])
})
it('one adapter per supported addon', () => {
  expect(ADAPTERS.length).toEqual(read.statuses.length)
})
it('every addon detected', () => {
  expect(read.statuses.map((s) => s.addonInstalled)).toEqual([true, true])
})
it('companion characters', () => {
  expect(read.bySource.get('companion')!.length).toEqual(1)
})
it('savedinstances characters', () => {
  expect(read.bySource.get('savedinstances')!.length).toEqual(6)
})

const merged = mergeSources(read, reset)
// Six from SavedInstances; the companion addon adds nobody, it only knows one
// of them better.
it('merged character count', () => {
  expect(merged.length).toEqual(6)
})

/** Vault rows are looked up by category - the row order is the vault's business. */
const row = (character: CharacterSnapshot, category: VaultCategory) => character.vault.find((r) => r.category === category)!
/** Same runs as the main character, but with no reported slot array. */
const readMythicRowFromRunsOnly = () =>
  row(
    mergeSources(runsOnlyRead, reset).find((c) => c.name === 'Nurruns')!,
    VaultCategory.Dungeon
  )
const siOnlyVault = () =>
  row(
    merged.find((c) => c.name === 'Zwergimzwerg')!,
    VaultCategory.Dungeon
  ).unlockedCount
const main = merged.find((c) => c.name === 'Klöße')!
it('character seen by one source', () => {
  expect(main.sources.length).toEqual(1)
})
it('identity comes from savedinstances', () => {
  expect(main.provenance.identity).toEqual('savedinstances')
})
it('item level from savedinstances', () => {
  expect(main.itemLevel).toEqual(690.5)
})
it('score from savedinstances', () => {
  expect(main.mythicRating).toEqual(2415)
})
it('gold read from savedinstances', () => {
  expect(main.money).toEqual(1)
})
it('keystone name read from the link', () => {
  expect(main.keystone!.name).toEqual('Ara-Kara')
})
it('faction read from the toon', () => {
  expect(main.faction).toEqual('Horde')
})
it('no source names the guild', () => {
  expect(main.guild).toEqual(null)
})

/* Great Vault: M+ from MythicKeyBest, raid and world straight from Progress. */
it('all three vault rows present', () => {
  expect(main.vault.length).toEqual(3)
})
it('m+ row rebuilt from MythicKeyBest', () => {
  expect(row(main, VaultCategory.Dungeon).slots[0].level).toEqual(12)
})
it('m+ row read from the reported array, not derived', () => {
  expect(row(main, VaultCategory.Dungeon).derived).toEqual(undefined)
})
it('m+ unlocked slots', () => {
  expect(row(main, VaultCategory.Dungeon).slots.map((s) => s.unlocked)).toEqual([true, true, false])
})
it('raid row read from Progress, not derived', () => {
  expect(row(main, VaultCategory.Raid).derived).toEqual(undefined)
})
it('raid slots carry difficulty ids', () => {
  expect(row(main, VaultCategory.Raid).slots.map((s) => [s.unlocked, s.difficultyId])).toEqual([
    [true, 16],
    [true, 15],
    [false, null]
  ])
})
it('world row holds delve tiers', () => {
  expect(row(main, VaultCategory.World).slots.map((s) => [s.unlocked, s.level])).toEqual([
    [true, 11],
    [true, 11],
    [true, 8]
  ])
})

/* Without the reported array the row is rebuilt from the runs and marked. */
const fromRuns = readMythicRowFromRunsOnly()
it('run-only m+ row is flagged derived', () => {
  expect(fromRuns.derived).toEqual(true)
})
it('run-only m+ row sorts the runs', () => {
  expect(fromRuns.slots.map((s) => [s.unlocked, s.level])).toEqual([
    [true, 12],
    [false, 0],
    [false, 0]
  ])
})

/* Mythic+ runs come from runHistory. */
it('runs read from runHistory', () => {
  expect(main.mythicRuns.length).toEqual(3)
})
it('previous weeks filtered out', () => {
  expect(main.mythicRuns.some((r) => r.level === 20)).toEqual(false)
})
it('dungeon names kept', () => {
  expect(main.mythicRuns[0].dungeon).toEqual('Ara-Kara')
})
it('untimed run marked as such', () => {
  expect(main.mythicRuns[2].completed).toEqual(false)
})
/* A MythicKeyBest whose reset has passed describes last week: its runs are
   gone, but the slot it filled is a reward still sitting in the vault. */
it("last week's MythicKeyBest keeps its slot as a reward to collect", () => {
  expect(siOnlyVault()).toEqual(1)
})
it("and its runs are not this week's", () => {
  expect(merged.find((c) => c.name === 'Zwergimzwerg')!.mythicRuns).toEqual([])
})

/* Lockouts */
it('expired lockout dropped, old expansion kept as a lockout', () => {
  expect(main.lockouts.length).toEqual(3)
})
it('only raids for this character', () => {
  expect(main.lockouts.every((l) => l.isRaid)).toEqual(true)
})
it('difficulty ids preserved', () => {
  expect(main.lockouts.map((l) => l.difficultyId).sort()).toEqual([15, 16, 16])
})
it('an entry that is saved to nothing is no lockout', () => {
  expect(merged.find((c) => c.name === 'Zwergimzwerg')!.lockouts.length).toEqual(1)
})
const omegaMythic = () => main.lockouts.find((l) => l.difficultyId === 16 && l.name.startsWith('Mana'))!
it('kills counted off the lock link bitmask', () => {
  expect(omegaMythic().defeated).toEqual(2)
})
it('an unknown boss total stays 0', () => {
  expect(omegaMythic().total).toEqual(0)
})
it('a stored kill count still wins', () => {
  expect(main.lockouts.find((l) => l.difficultyId === 15)!.defeated).toEqual(3)
})
it('weekly quest resolved from Quests', () => {
  expect(main.weeklies[0].done).toEqual(true)
})
it('a quest merely tracked in Progress stays open', () => {
  expect(main.weeklies[1].done).toEqual(false)
})

/* The companion's quest log lays over the weeklies: on the way, ready, turned in. */
const twinWeekly = (id: number) => merged.find((c) => c.name === 'Doppelt')!.weeklies.find((task) => task.id === id)!
it('a turn-in the companion saw ticks the quest, with the client title', () => {
  expect([twinWeekly(76586).done, twinWeekly(76586).label]).toEqual([true, 'Weltboss erlegt'])
})
it('a quest the companion log lacks is to be accepted; without a log nobody knows', () => {
  expect([twinWeekly(93890).onLog, main.weeklies.find((t) => t.id === 93890)!.onLog]).toEqual([false, undefined])
})
it('a quest on the log carries its progress', () => {
  expect(twinWeekly(82897).progress).toEqual({ fulfilled: 2, required: 4, text: '2/4' })
})
it('a quest with its objectives met is ready', () => {
  expect([twinWeekly(90001).ready, twinWeekly(90001).done]).toEqual([true, false])
})
it('a turn-in only the companion saw is a suggestion', () => {
  expect(read.detectedQuests.some((quest) => quest.id === 90500 && quest.label === 'Nur der Companion')).toEqual(true)
})
it("last week's turn-in is not", () => {
  expect(read.detectedQuests.some((quest) => quest.id === 90501)).toEqual(false)
})
it('a regular turn-in is no suggestion', () => {
  expect(read.detectedQuests.some((quest) => quest.id === 90600)).toEqual(false)
})
it("the client's completion flag ticks a quest no turn-in record has", () => {
  expect(twinWeekly(93909).done).toEqual(true)
})
/* The board: the register says what the roster's game has. */
it('a quest the register saw stands unseen: the season\'s weekly, a profession quest, one of the rotating set listed by itself', () => {
  expect([twinWeekly(93909), twinWeekly(90001), twinWeekly(93890)].map((task) => task !== undefined)).toEqual([true, true, true])
})
it("a quest a log showed this week stays, last season's or not", () => {
  expect(twinWeekly(82897) !== undefined).toEqual(true)
})
it('a quest the register never saw is no task', () => {
  expect(merged.map((c) => c.weeklies.some((task) => task.id === 90003))).toEqual(merged.map(() => false))
})
it('without a register every configured quest stands', () => {
  expect(mergeSources(legacyRead, reset).every((c) => c.weeklies.length === 0)).toEqual(true)
  expect(mergeSources(staleRead, reset).every((c) => c.weeklies.some((task) => task.id === 76586))).toEqual(true)
})
const staleRead = await readSources(legacyRoot, [{ id: 76586, label: 'Weltboss' }], {}, translator)
it('a flag stamped before the reset does not', () => {
  expect(staleRead.bySource.get('companion')!.map((c) => c.weeklies![0].done)).toEqual([false, false])
})

/* A pool grows from the register before the sources read the week. */
const poolRead = await readSources(wowRoot, [{ id: 93909, label: 'Midnight: Weekly', pool: [93909, 93890] }], {}, translator)
const poolTask = mergeSources(poolRead, reset).find((c) => c.name === 'Doppelt')!.weeklies[0]!
it("a learned weekly with the pool's prefix joins it, and the line is the one on the log", () => {
  expect([poolTask.pool, poolTask.label, poolTask.onLog, poolTask.progress?.text]).toEqual([[93909, 93890, 98600, 93911], 'Mitternacht: Neu', true, '1/4'])
})
it("a pool's line on a character without the quest names the one the register saw this week", () => {
  const unseen = mergeSources(poolRead, reset).find((c) => c.name === 'Klöße')!.weeklies[0]!
  expect([unseen.onLog, unseen.done, unseen.label]).toEqual([undefined, false, 'Mitternacht: Tiefen'])
})

/* The register: the season's weeklies as the game itself describes them. */
it('the learned season weeklies - weekly flag, schedule reset, profession, learned reset; the current expansion only; last done, then last seen first', () => {
  expect(read.learnedQuests.map((quest) => quest.id)).toEqual([93909, 90001, 90002, 96101, 98600, 93911, 96400, 93890, 95520])
})
it('the learned weekly carries the client title', () => {
  expect(read.learnedQuests.find((quest) => quest.id === 96101)).toEqual({ id: 96101, label: 'Alchemiedienste erbeten' })
})
it('the task carries the profession from the tag, whatever the settings say', () => {
  expect([twinWeekly(90001).profession, twinWeekly(76586).profession]).toEqual([2871, null])
})
it('a register without the companion is empty', () => {
  expect(runsOnlyRead.learnedQuests).toEqual([])
})
it('the lexicon holds the file id by id for each kind, and the character id out of the GUID; a zero is no icon', () => {
  expect(read.lexicon).toEqual({
    item: { 274374: 4622270 },
    currency: { 3008: 4638725 },
    recipe: { 430345: 4643982 },
    profession: { 171: 4620676 },
    portrait: { 'turalyon-doppelt': 0x0992f5f0 },
    itemClass: { 7001: 3, 274374: 1204 }
  })
})
it('a lexicon without the companion is empty', () => {
  expect(runsOnlyRead.lexicon).toEqual({
    item: {},
    currency: {},
    recipe: {},
    profession: {},
    portrait: {},
    itemClass: {}
  })
})
it('a weekly on the log is a suggestion before its turn-in', () => {
  expect(read.detectedQuests.find((quest) => quest.id === 96400)?.label).toEqual('Neue Wochenquest')
})
it("last expansion's weekly on an alt's log is no suggestion", () => {
  expect(read.detectedQuests.some((quest) => quest.id === 82897)).toEqual(false)
})
it('a hidden tracker on the log is no suggestion', () => {
  expect(read.detectedQuests.some((quest) => quest.id === 96300)).toEqual(false)
})
it('a loot tracker of SavedInstances is no suggestion', () => {
  expect(read.detectedQuests.some((quest) => quest.id === 95131)).toEqual(false)
})
it('a weekly the register does not know is offered as seen', () => {
  expect(read.detectedQuests.some((quest) => quest.id === 76586)).toEqual(true)
})

/* Run details ride along with the run list, whichever source won it. */
const bestRun = () => main.mythicRuns.find((r) => r.level === 12)!
it('run duration read off runHistory', () => {
  expect(bestRun().durationSec).toEqual(1712)
})
it('run score read off runHistory', () => {
  expect(bestRun().score).toEqual(301)
})
it('completion date rebuilt from the calendar table', () => {
  expect(new Date(bestRun().completedAt!).getHours()).toEqual(20)
})
it('a run without details stays without', () => {
  expect(main.mythicRuns[1].durationSec ?? null).toEqual(null)
})

/* The tracker's activities, named through the addon's own catalogue. */
const activity = (key: string) => main.activities.find((a) => a.key === key)!
it('a single activity carries its progress', () => {
  expect(activity('mn-zone-weekly')?.progress?.text).toEqual('40%')
})
it('a list counts its quests against the threshold', () => {
  expect(activity('mn-hunts')?.progress?.text).toEqual('1/2')
})
it('a group holding a configured quest is left out', () => {
  expect(activity('mn-meta') ?? null).toEqual(null)
})
it("last expansion's weekly is left out", () => {
  expect(activity('tww-old-weekly') ?? null).toEqual(null)
})
it('a daily is left out', () => {
  expect(activity('mn-daily') ?? null).toEqual(null)
})
it('the catalogue names the activity', () => {
  expect(activity('mn-zone-weekly')?.label).toEqual('Purging the Vaults')
})
it('no activities from a stale week', () => {
  expect(merged.find((c) => c.name === 'Vorwoche')!.activities).toEqual([])
})
it('where the character stands', () => {
  expect([main.zone, main.lastActivity?.name]).toEqual(['Dornogal', 'Ansurek: Mythic'])
})
it('levelling character carries its experience', () => {
  expect(merged.find((c) => c.name === 'Twink')!.xp).toEqual({ xp: 12000, xpMax: 48000, rested: 9600 })
})
it('a capped character carries none', () => {
  expect(main.xp).toEqual(null)
})
it('account-wide weeklies, expired ones dropped', () => {
  expect(read.accountQuests).toEqual([{ id: 95416, label: 'Going Postal' }])
})

/* Gear: only the companion reads it off the client. */
const gearOf = (name: string) => merged.find((c) => c.name === name)!.gear
it('a character the companion has not seen wears nothing known', () => {
  expect(gearOf('Klöße')).toEqual([])
})
/* Which slots take an enchant is learned from what the roster wears. */
it('a slot some max-level character enchants is enchantable', () => {
  expect(gearOf('Doppelt').find((g) => g.slot === 5)!.enchantable).toEqual(true)
})
it('a slot nobody enchants is not', () => {
  expect(gearOf('Doppelt').find((g) => g.slot === 1)!.enchantable).toEqual(false)
})
it('the gear area names the companion', () => {
  expect(merged.find((c) => c.name === 'Doppelt')!.provenance.gear).toEqual('companion')
})
it('companion gear carries sockets and track', () => {
  expect(gearOf('Doppelt')[0].sockets).toEqual(1)
})
it('companion gear carries the upgrade track', () => {
  expect(gearOf('Doppelt')[0].track).toEqual('Held 3/6')
})
it('companion gear carries the tooltip, a right text with it', () => {
  expect(gearOf('Doppelt')[0].tooltip).toEqual([
    { left: 'Helm', right: null, leftColor: 'a335ee', rightColor: null },
    { left: 'Kopf', right: 'Kette', leftColor: null, rightColor: null }
  ])
})
it('gear without a registered tooltip has none', () => {
  expect('tooltip' in gearOf('Doppelt')[1]).toEqual(false)
})

/* Auctions and mail, from the companion. */
it('no auction data for a character the companion never saw', () => {
  expect(merged.find((c) => c.name === 'Zwergimzwerg')!.auctions).toEqual(null)
})
it('the companion counts the auctions at the auction house', () => {
  expect(merged.find((c) => c.name === 'Doppelt')!.auctions).toEqual({ count: 3, nextExpiresAt: (now + 3600) * 1000 })
})
it('and the inbox at the mailbox', () => {
  expect(merged.find((c) => c.name === 'Doppelt')!.mailCount).toEqual(2)
})

/* Only the companion knows the season bests and the renown. */
const twin = merged.find((c) => c.name === 'Doppelt')!
it('dungeon bests read', () => {
  expect(twin.dungeonBests.map((b) => [b.level, b.inTime])).toEqual([
    [12, true],
    [9, false]
  ])
})
it('renown read', () => {
  expect(twin.renown[0].level).toEqual(12)
})
it('bag space read', () => {
  expect(twin.bagSpace).toEqual({ free: 17, total: 130 })
})
it('nobody else has bests', () => {
  expect(main.dungeonBests).toEqual([])
})
it('raid progress read, the tally by difficulty id, a boss without kills empty', () => {
  expect(twin.raidProgress.map((raid) => [raid.name, raid.bosses.map((boss) => boss.kills)])).toEqual([
    ["Palast der Nerub'ar", [{}, {}]],
    ['Befreiung von Undermine', [{ 14: 3, 15: 1 }, { 14: 2 }, {}]]
  ])
})
it('nobody else has raid progress', () => {
  expect(main.raidProgress).toEqual([])
})
it('professions read, concentration only where the profession has it', () => {
  expect(twin.professions.map((p) => [p.name, p.concentration?.current ?? null])).toEqual([
    ['Alchemie', 1000],
    ['Kräuterkunde', null]
  ])
})
it('unspent knowledge read where the companion counts it, unknown elsewhere', () => {
  expect(twin.professions.map((p) => p.knowledge)).toEqual([12, null])
})
it('recipe cooldowns read with their times in millis and charges where counted', () => {
  expect(twin.cooldowns).toEqual([
    { recipeId: 430619, name: 'Transmutation', readyAt: 0, charges: null, maxCharges: null, seenAt: thisWeek * 1000 },
    { recipeId: 430620, name: 'Weben', readyAt: (thisWeek + 86400) * 1000, charges: 0, maxCharges: 1, seenAt: thisWeek * 1000 }
  ])
})
it('no cooldowns without the companion', () => {
  expect(main.cooldowns).toEqual([])
})
it('calendar events read as a list', () => {
  expect(read.events!.list.map((e) => e.title)).toEqual(['Zeitwanderung: Wrath of the Lich King', 'Vorbei'])
})
it('event end in millis', () => {
  expect(read.events!.list[0].endsAt).toEqual((now + 3 * 86400) * 1000)
})
it("the season's dungeons read as a list, one without a name left out", () => {
  expect(read.seasonDungeons!.list).toEqual([
    { mapChallengeModeId: 503, name: 'Ara-Kara' },
    { mapChallengeModeId: 501, name: 'Das Steingewölbe' }
  ])
})
it('the list carries its time in millis', () => {
  expect(read.seasonDungeons!.updatedAt).toEqual(thisWeek * 1000)
})
it('nobody else has professions', () => {
  expect(main.professions).toEqual([])
})
it('without profession data every quest the register knows stays', () => {
  expect(main.weeklies.map((task) => task.id)).toEqual([76586, 90001, 90002, 93909, 93890])
})
/* The same read, with the main character's professions known: the merger
   drops the quest bound to a profession the character does not have. */
const withProfessions: ReadResult = {
  ...read,
  bySource: new Map(
    [...read.bySource].map(([id, records]) => [
      id,
      records.map((record) =>
        record.name === 'Klöße' && id === 'savedinstances'
          ? {
              ...record,
              professions: [{ name: 'Alchemie', skillLineId: 2871, skill: 100, maxSkill: 100, concentration: null, knowledge: null }]
            }
          : record
      )
    ])
  )
}
it('a quest bound to a profession stays only for a character with it', () => {
  expect(
    mergeSources(withProfessions, reset)
      .find((c) => c.name === 'Klöße')!
      .weeklies.map((task) => task.id)
  ).toEqual([76586, 90001, 93909, 93890])
})

/* Characters only one source knows */
const siOnly = merged.find((c) => c.name === 'Zwergimzwerg')!
it('savedinstances-only character present', () => {
  expect(siOnly.sources.length).toEqual(1)
})
it('its dungeon lockout is not a raid', () => {
  expect(siOnly.lockouts[0].isRaid).toEqual(false)
})
it('no raid data means an empty raid row', () => {
  expect(row(siOnly, VaultCategory.Raid).unlockedCount).toEqual(0)
})

/* Staleness is judged on the weekly data, not on the last sighting. */
it('old snapshot predates the reset', () => {
  expect(siOnly.weeklyUpdatedAt < reset).toEqual(true)
})
it('fresh snapshot is after the reset', () => {
  expect(main.weeklyUpdatedAt >= reset).toEqual(true)
})
it('reset countdown formats', () => {
  expect(/^(\d+d \d+h|\d+h \d+m|\d+m)$/.test(formatUntilReset(Region.Eu))).toEqual(true)
})

/* The vault outlives one reset: last week's rows are the reward still in it. */
const toCollect = merged.find((c) => c.name === 'Abholbereit')!
it("last week's vault rows survive the reset", () => {
  expect(toCollect.vault.map((r) => r.unlockedCount)).toEqual([2, 0, 1])
})
it('its snapshot still predates the reset', () => {
  expect(toCollect.weeklyUpdatedAt < reset).toEqual(true)
})
it('and it is flagged as a vault to collect', () => {
  expect(toCollect.vaultRewardWaiting).toEqual(true)
})
/* Nobody holds a keystone across the reset - it is gone until a run hands out
   the next one, so last week's must not be offered as if it were still there. */
it("last week's keystone is dropped", () => {
  expect(toCollect.keystone).toEqual(null)
})
it("this week's keystone is kept", () => {
  expect(main.keystone!.level).toEqual(11)
})
it('a fresh character is not', () => {
  expect(merged.find((c) => c.name === 'Klöße')!.vaultRewardWaiting).toEqual(false)
})

/* A character whose weekly reset has passed keeps its filled slots for one
   more week: the reward is in the vault until someone collects it. The
   snapshot itself stays last week's - stale, not current. */
const lastWeekChar = merged.find((c) => c.name === 'Vorwoche')!
it('an expired weekly reset keeps the filled slots as a reward to collect', () => {
  expect(lastWeekChar.vault.map((r) => r.unlockedCount)).toEqual([3, 0, 3])
})
it('and flags the vault as one to collect', () => {
  expect(lastWeekChar.vaultRewardWaiting).toEqual(true)
})
// `stale` itself is stamped by the collector, after the merge; here the stamp it reads.
it('and leaves the character on last week', () => {
  expect(lastWeekChar.weeklyUpdatedAt < reset).toEqual(true)
})

/* Bags and bank */
const bagsOf = (name: string) => merged.find((c) => c.name === name)!.bags!
const bankOf = (name: string) => merged.find((c) => c.name === name)!.bank
it('no bag list reads as unknown, not empty', () => {
  expect([bagsOf('Klöße'), main.bagSpace, 'bags' in main.provenance]).toEqual([null, null, false])
})
it('and the bank as an empty list', () => {
  expect(bankOf('Klöße')).toEqual([])
})
it('the companion lists the bags itself, named off the link', () => {
  expect(bagsOf('Doppelt')).toEqual({
    name: null,
    slots: 130,
    free: 17,
    items: [
      { itemId: 6948, name: 'Ruhestein', count: 1, quality: 1, itemLevel: null, wowhead: 'item=6948&lvl=90&spec=70', craftTier: null },
      {
        itemId: 7001,
        name: 'Fläschchen',
        count: 12,
        quality: 3,
        itemLevel: null,
        // The register's lines, the markup out, a blank line kept, a bad colour dropped.
        tooltip: [
          { left: 'Fläschchen', right: null, leftColor: '0070dd', rightColor: null },
          { left: 'Benutzen: Erhöht die Stärke um 100.', right: null, leftColor: '00ff00', rightColor: null },
          { left: '', right: null, leftColor: null, rightColor: null },
          { left: 'Verkaufspreis:  12', right: null, leftColor: null, rightColor: null }
        ],
        wowhead: 'item=7001&lvl=90&spec=70',
        craftTier: null
      },
      { itemId: 212000, name: 'Krone', count: 1, quality: 4, itemLevel: 678, wowhead: 'item=212000&lvl=90&spec=70', craftTier: null },
      // The crafting tier: the modifier of type 38, or the icon on the name where the link has no modifier.
      { itemId: 212249, name: 'Kraut', count: 40, quality: 1, itemLevel: null, wowhead: 'item=212249&lvl=90&spec=263', craftTier: 2 },
      { itemId: 212282, name: 'Staub', count: 3, quality: 1, itemLevel: null, wowhead: 'item=212282&lvl=90&spec=263', craftTier: 3 }
    ]
  })
})
it('and the bank as of the last visit', () => {
  expect(bankOf('Doppelt').map((tab) => [tab.name, tab.slots, tab.free, tab.items[0].name])).toEqual([['Kram', 98, 97, 'Relikt']])
})
it('a tooltip that is only markup is none', () => {
  expect('tooltip' in bankOf('Doppelt')[0].items[0]).toEqual(false)
})
it("the warband bank's items carry the register's tooltip too", () => {
  expect(read.account.byAccount[0].warbandBank[0].items.map((item) => item.tooltip?.length ?? null)).toEqual([4, null])
})
it('the bags area is the companion where it has them', () => {
  expect(twin.provenance.bags).toEqual('companion')
})

/* Account-wide gold */
it('warband bank read', () => {
  expect(read.account.warbandGold).toEqual(5100000)
})
it("the warband bank's tabs are the companion's read at the bank", () => {
  expect(read.account.byAccount.map((entry) => entry.warbandBank.map((tab) => [tab.name, tab.free, tab.items.length]))).toEqual([
    [
      ['Vorräte', 96, 2],
      ['Leer', 98, 0]
    ]
  ])
})
it('stamped with the visit', () => {
  expect(read.account.byAccount[0].warbandBankAt).toEqual(thisWeek * 1000)
})

it('guild banks read, empty ones dropped', () => {
  expect(read.account.guilds).toEqual([{ name: 'Doppelgilde', money: 3000000 }])
})

/* Disabling a source */
const withoutSavedInstances = await readSources(wowRoot, quests, { savedinstances: false }, translator)
const mergedWithout = mergeSources(withoutSavedInstances, reset)
it('disabled source skipped', () => {
  expect(withoutSavedInstances.bySource.has('savedinstances')).toEqual(false)
})
it('its exclusive characters disappear', () => {
  expect(mergedWithout.map((c) => c.name)).toEqual(['Doppelt'])
})

/* i18n */
it('every locale has every key', () => {
  expect(LOCALES.every((l) => t(l, 'app.name') === 'Warband Briefing')).toEqual(true)
})
/* ---- version order, for the addon that may be newer from CurseForge ---- */

it('a pre-release is older than its release', () => {
  expect(compareVersions('0.1.0-beta.2', '0.1.0') < 0).toEqual(true)
})
it('pre-release parts compare as numbers', () => {
  expect(compareVersions('0.1.0-beta.10', '0.1.0-beta.2') > 0).toEqual(true)
})
it('numeric parts first', () => {
  expect(compareVersions('0.2.0-beta.1', '0.1.9') > 0).toEqual(true)
})
it('the same version is the same', () => {
  expect(compareVersions('v1.2.3', '1.2.3')).toEqual(0)
})
it('a longer version is newer', () => {
  expect(compareVersions('1.2', '1.2.1') < 0).toEqual(true)
})
it('placeholders fill', () => {
  expect(t('en', 'card.keystone', { name: 'Key', level: 12 })).toEqual('Keystone: Key +12')
})
it('unknown placeholder stays put', () => {
  expect(t('en', 'card.keystone', { name: 'Key' })).toEqual('Keystone: Key +{level}')
})
it('system locale maps regional tags', () => {
  expect(resolveSystemLocale('de-AT')).toEqual('de')
})
it('unsupported system locale falls back', () => {
  expect(resolveSystemLocale('fr-FR')).toEqual('en')
})
it('difficulty id beats the localized name', () => {
  expect(difficultyLabel(createTranslator('en'), 15, 'Heroisch')).toEqual('Heroic')
})
it('unknown difficulty id uses the reported name', () => {
  expect(difficultyLabel(createTranslator('en'), 999, 'Sondermodus')).toEqual('Sondermodus')
})

/* Path helpers */
it('normalise accepts install root', () => {
  expect(normaliseWowPath(wowRoot)).toEqual(path.normalize(wowRoot))
})
it('normalise accepts the flavor folder', () => {
  expect(normaliseWowPath(path.join(wowRoot, '_retail_'))).toEqual(path.normalize(wowRoot))
})
it('normalise rejects an unrelated folder', () => {
  expect(normaliseWowPath(tmpdir())).toEqual(null)
})

/* Weekly quests the sources saw, offered as suggestions in the settings */
const detected = read.detectedQuests.map((q) => q.id)
it('a completed weekly is suggested', () => {
  expect(detected.includes(76586)).toEqual(true)
})
it('an expired entry is not suggested', () => {
  expect(detected.includes(70001)).toEqual(false)
})
it('a daily is not suggested', () => {
  expect(detected.includes(99001)).toEqual(false)
})
it('the suggestion carries the client title', () => {
  expect(read.detectedQuests.find((q) => q.id === 76586)?.label).toEqual('Weltboss')
})

/* The season catalogue the settings screen offers */
const seasonIds = seasonCatalog().quests.map((q) => q.id)
it('season quest ids are unique', () => {
  expect(new Set(seasonIds).size).toEqual(seasonIds.length)
})
it('the season set is not empty', () => {
  expect(seasonQuestDefs().length > 0).toEqual(true)
})
it('every season quest carries a label', () => {
  expect(seasonCatalog().quests.every((q) => q.label.length > 0)).toEqual(true)
})
const currencyIds = seasonCatalog().currencies.map((c) => c.id)
it('season currency ids are unique', () => {
  expect(new Set(currencyIds).size).toEqual(currencyIds.length)
})
it('every season currency is named', () => {
  expect(Object.values(seasonCurrencyNames()).every((name) => name.length > 0)).toEqual(true)
})
it('the catalogue names a currency no addon knows', () => {
  expect(
    read.bySource
      .get('savedinstances')!
      ?.flatMap((c) => c.currencies ?? [])
      .find((c) => c.id === 3444)?.name
  ).toEqual('Champion Mistcrest')
})

/* ---- the companion addon ---- */

const both = merged.find((c) => c.name === 'Doppelt')!
it("the client's own vault wins over the reconstructed one", () => {
  expect(both.provenance.vault).toEqual('companion')
})
it("its raid row is the client's, not the Progress one", () => {
  expect(row(both, VaultCategory.Raid).slots[0].level).toEqual(16)
})
it('and it carries the reward the vault is holding', () => {
  expect([row(both, VaultCategory.Raid).slots[0].rewardItemLevel, row(both, VaultCategory.Raid).slots[0].rewardItem]).toEqual([
    723,
    'Kappe des Sturms'
  ])
})
it('a client row is never derived', () => {
  expect(row(both, VaultCategory.Raid).derived ?? false).toEqual(false)
})

/* Fresh beats priority: the same character, with the stronger source still
   on last week - this week's record wins the weekly areas whatever the
   priority, and a vault from over a week before the reset is dropped. */
const aged = (sourceId: string, name: string, updatedAt: number): ReadResult => {
  const bySource = new Map([...read.bySource].map(([id, records]) => [id, records.map((record) => ({ ...record }))]))
  const record = bySource.get(sourceId)!.find((c) => c.name === name)!
  record.updatedAt = updatedAt
  return { ...read, bySource }
}
const companionStale = mergeSources(aged('companion', 'Doppelt', reset - 1), reset).find((c) => c.name === 'Doppelt')!
it('a record from this week beats a stronger source still on last week', () => {
  expect(companionStale.provenance.vault).toEqual('savedinstances')
})
it('the identity still follows the priority: it has no week', () => {
  expect(companionStale.provenance.identity).toEqual('savedinstances')
})
it('with both on last week, the priority decides again', () => {
  expect(mergeSources(aged('savedinstances', 'Doppelt', reset - 1), reset).find((c) => c.name === 'Doppelt')!.provenance.vault).toEqual(
    'companion'
  )
})
const expired = aged('companion', 'Doppelt', reset - 16 * 24 * 3_600_000)
expired.bySource.get('savedinstances')!.find((c) => c.name === 'Doppelt')!.updatedAt = reset - 16 * 24 * 3_600_000
it('a vault from over a week before the reset is dropped', () => {
  expect(
    mergeSources(expired, reset)
      .find((c) => c.name === 'Doppelt')!
      .vault.every((r) => r.unlockedCount === 0)
  ).toEqual(true)
})
it('the keystone comes from the companion', () => {
  expect(both.keystone).toEqual({ name: 'Ara-Kara', level: 13 })
})
it('so do its currencies, with names', () => {
  expect(both.currencies.find((c) => c.id === 3008)?.name).toEqual('Valorsteine')
})
it('the client reports the reset outright', () => {
  expect(read.weeklyResetAt.eu).toEqual(nextWeek * 1000)
})

/* What one character knows about a reward holds for every character whose slot
   was filled the same way - that is a property of the season, not of the toon. */
const mainRaid = row(main, VaultCategory.Raid)
it('a reward learned on one character fills another', () => {
  expect([mainRaid.slots[0].rewardItemLevel, mainRaid.slots[0].rewardItem]).toEqual([723, 'Kappe des Sturms'])
})
it('a slot filled at a level nobody reported stays blank', () => {
  expect(mainRaid.slots[1].rewardItemLevel).toEqual(null)
})

/* The client's stamp beats the timezone rule while it is fresh: walked
   across a change of daylight saving it would be an hour off, so a stamp
   older than two weeks gives way to the rule. */
const WEEK_MS = 7 * 24 * 3_600_000
const stamp = Date.now() + 2 * 24 * 3_600_000
it('a client stamp names the reset it follows', () => {
  expect(resetFromClient(stamp)).toEqual(stamp - WEEK_MS)
})
it('a stamp from last week still names the same boundary', () => {
  expect(resetFromClient(stamp - WEEK_MS)).toEqual(stamp - WEEK_MS)
})
const atReset = Date.now()
it('a stamp at the moment of the reset names that reset', () => {
  expect(resetFromClient(atReset, atReset)).toEqual(atReset)
})
it('a stamp older than two weeks gives way to the rule', () => {
  expect(resetFromClient(stamp - 3 * WEEK_MS)).toEqual(0)
})
it('no stamp, no answer', () => {
  expect(resetFromClient(0)).toEqual(0)
})
it('a reported stamp wins over the regional rule', () => {
  expect(lastWeeklyReset(Region.Eu, Date.now(), stamp)).toEqual(stamp - WEEK_MS)
})

/* Status probe without reading */
const statuses = await getSourceStatuses(wowRoot)
it('status probe finds every source', () => {
  expect(statuses.length).toEqual(2)
})
it('status probe finds files', () => {
  expect(statuses.every((s) => s.hasData)).toEqual(true)
})
