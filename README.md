# Warband Briefing

Warband Briefing is a desktop app that shows the week of all your WoW
characters on one screen: Mythic+, the Great Vault, raid and dungeon
lockouts, world bosses, gold and weekly quests. You do not log in to each
character.

**Warband Briefing only reads.** It reads the SavedVariables files of addons
you already have, merges them for each character and shows the result. It
needs no Blizzard account, no API key and no internet connection. The
companion addon in `addon/` is its own source. SavedInstances is optional;
with it, the app also shows the characters the companion has not seen.

## Installation

Download the installer from the releases, or build from the source:

```bash
npm install
npm run build
npm start
```

The installer installs for the current user (no admin rights), creates a
start menu shortcut and a desktop shortcut, and lets you choose the folder.
Settings are in `%APPDATA%\warband-briefing` and survive an update. An
install over WowTodo copies the settings and the history from
`%APPDATA%\wowtodo` at the first start, reads the old `WowTodo.lua` until
the new addon has written its own, and replaces the addon folder `WowTodo`
with `WarbandBriefing` when it updates the addon.

At the first start, the app finds the WoW folder in the registry or in the
usual paths. If it does not, set **Settings → WoW folder**.

## Data sources

| Addon                          | Supplies                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Warband Briefing Companion** | The Great Vault as the client sees it: **reward and item level for each slot**, the weekly reset of the realm to the second, **best run for each dungeon**, gear with **sockets and upgrade track**, renown for each faction, professions with concentration, active calendar events, **the bags, and the bank and the warband bank at each visit to the bank**, the gold of the warband bank and the guild banks, auctions and mail. See below. |
| **SavedInstances** (optional)  | Every character it has seen: level, class, item level, M+ score, keystone, **all M+ runs of the week with dungeon name, time, and score**, **all three rows of the Great Vault**, raid and dungeon lockouts with boss counts, currency amounts, completed weekly quests, **weekly activities with partial progress** ("Void Assaults 40 %", "Prey 1/4"), XP and rested XP for alts, zone and last boss, account-wide weeklies                    |

SavedInstances is common. If you have it, you see your alts at once. The
app watches the SavedVariables files and reads them again as soon as WoW
writes them: at **logout** and at `/reload`. While WoW runs, a notice
says that the app shows the last logout.

### The companion addon

No community addon knows what is in the Great Vault. The client knows it
only after it asks the server, and that happens when the vault window
opens. The addon `addon/WarbandBriefing` sends this request at login,
without the window, and writes the reward, the item level and the reset
time of the realm.

To install it, open **Settings → Data sources** and click **Install
addon**. The app copies `addon/WarbandBriefing` to
`<WoW>/_retail_/Interface/AddOns/`; then restart WoW once. You can also
copy the folder yourself. The addon has the version of the app. After an
app update, the app copies its addon over the installed one and shows a
notice; `/reload` in the game loads it. The app only updates an installed
addon, it never installs one on its own.

The addon also reads what exists only in the client:

- **Best run for each dungeon**, the runs that make up the score. The
  roster shows a matrix of character × dungeon; the pale value in a row is
  the dungeon with the most score to gain.
- **Gear with sockets and upgrade track** from the tooltip.
- **Renown for each faction**, with the paragon progress past the maximum
  level, the reputations of the season and the free bag slots.
- **Professions with concentration.** A full concentration bar wastes
  regeneration, so the list marks it.
- **The bags, the bank and the warband bank.** The bags at each save; the
  banks while the bank is open, tab by tab with the name the player gave
  it, stacks of one item summed.
- **Gold, auctions and mail.** The gold of the warband bank at each save,
  the gold of a guild bank while it is open, the auctions while the auction
  house is open and the inbox while the mailbox is.
- **Active calendar events** (Timewalking, Brawl, bonus event). The addon
  opens the calendar once at login, in the background.
- **The quest log and the turn-ins of the week.** The other sources know a
  weekly quest only after the turn-in. The log says which quest is
  accepted, how far it is ("2/4") and whether it is ready to turn in. A
  turn-in the addon saw is also a row under _Settings → Weekly quests_.
- **What the board holds this week.** The season's pool of weeklies
  rotates. A quest no character had on the log since the reset is not on
  the list this week; the main activities of the season and the profession
  quests stay, since they are there every week.

The addon also corrects two things:

- **Reset to the second.** Without the addon, the app derives the weekly
  reset from a time zone rule that has to guess at daylight saving time.
- **Item level for all characters.** The reward of a slot depends on the
  season, not on the character: a +14 key pays the same everywhere. The
  app learns the values from the characters the addon reported and applies
  them to the same difficulty or keystone level of every other character.
  There is no table in the code on purpose: a table is wrong one season
  later, and nobody notices.

The addon is also on CurseForge. The app replaces an installed addon only
when it is older than the one the app includes, never a newer one from the
manager. The addon does nothing without the app.

### How the sources are merged

Each adapter reports a priority for each area (character data, vault,
runs, lockouts, currencies, weeklies). For each area, the highest priority
wins, with one exception: **fresh data wins over priority.** For weekly
data, a record from the current week always wins, also against a stronger
source that still has the last week.

Each card shows at the bottom right which source supplied which area. You
can switch off a source in the settings. A character appears after its
first login, and its data is from its last logout. Snapshots older than the
last weekly reset are marked as "before the reset" and dimmed.

## The views

### Roster

The **Roster** tab opens first: the account as a board. Across the top, the
week summed in figures: the vault slots, the characters done, the runs, the
reward waiting (or the time to the reset) and the gold; _Settings → Views_
says which of them stand there. The toolbar picks the shape: tiles with the
vault as a ring around the class and the step at the foot, rows with the
four figures a player compares and the step, or one table. The tiles and
the rows are in the order of the plan; the table sorts by the column whose
head is clicked. Every shape opens the character's page with a click.

The roster shows the characters seen this week or last; how many it leaves
out is said under it, with the button to show them. Below: the Mythic+
bests, character × dungeon. With one character the tab shows that
character large, with its vault and its list.

Above the list is the total gold of the account, split into characters,
warband bank and guild banks. Hidden characters are included: the sum
describes the account, not the view.

### Tasks

The **Tasks** tab shows the week as one list: every chore of every
character, each with a box. A character gets one line for each vault row
still short of a slot, for each weekly quest and tracked activity, for each
world boss, for each currency with a weekly cap (crests, sparks; full
counts as done), for a full concentration bar, for unspent knowledge, for a
recipe whose cooldown ran out, for a bare gear slot, for nearly full bags,
and one line for the supplies that run short. A vault line also says what
the slot pays: the reward's item level and the gain over the character,
where the companion priced it. Every line says what it takes in minutes.

A goal is not a line: its figure is the sum of the vault rows, so it is a
chip under the panel's head. The box is ticked only from the game data.
Nothing on the list is ticked by hand: the list says what the characters
did, not what you plan. The character's page shows the same lines beside
the vault block, without the vault rows the block already says.

Two filters: _All_ shows the week with the done lines ticked and struck
through, _Open_ hides them. Two groupings:

- _By character_: one panel for each character, the most urgent first, in
  the order of the plan. The panel names how old its lines are ("as of
  40 min ago"): the last logout or `/reload` of that character.
- _By task_: one panel for each chore that two or more characters share,
  with every character that has it; the chores one character has alone are
  one panel, each line named.

What is on a character's list at all is a choice made on the panel: the
mark in its head opens the pick mode, every chore of the week gets a
box, and a line unticked is off that character's week (off the list, the
count and the plan) until it is ticked again (`src/shared/skips.ts`).
That is the one place that says what a character is played for: a bank
alt or a crafter takes its vault rows off there, and nothing asks it for
them again.

Your own chores, which no source can read (the mailbox, the auctions, an
enchant to buy), are set up under _Settings → Own tasks_, for every
character or once for the warband. They are on the list in a section of
their own, _Own_, with a box you tick; a tick holds until the next reset
(`src/shared/customTasks.ts`). A paragon reward and the account-wide quests
have a panel of their own, _Warband_; the calendar's running events stand
under its caption as chips. The maths is in
`src/renderer/src/model/tasks.ts`, tested in `tasks.test.ts` beside it.

### The plan: what comes next

The roster's tile, row and table cell name one step for each character,
and the roster is ordered by it. `src/renderer/src/model/plan.ts` prices
every open vault slot in two units: how many actions it takes (dungeons,
boss kills, activities) and how much item level it pays over the
character. The client prices a slot once it is unlocked; the next slot of
the same row pays at least that. The biggest pay-out goes first, then the
fewest actions; a slot nobody priced counts as no gain. The tooltip on the
step gives the reason: the row, the slot, the reward. The panel _Tonight_
at the top of the task list names the first three characters of that order
with their steps and reasons; _Settings → Views_ can switch it off.

### Search

The top bar holds the one search of the app; Ctrl+F or `/` jump into it
from every tab. The text finds characters (by name, realm, class, spec or
an open task) and items in every bag, bank and warband bank. The hits stand
under the field; Enter opens the first, the arrow keys pick another, Escape
clears. A character opens its page. An item opens the place it sits in
(the page's inventory section or the bank tab) with the text carried
along, so the tiles show the item. The roster, the inventory and the bank
narrow by the same text. The text belongs to the place: a new tab starts
empty, a step back brings it back.

### Gold

The **Gold** tab shows the account's gold over time: a history curve over
7, 30 or 90 days or all time, the change and the average for each day in
the range, where the gold is (characters, warband, guilds), each character
that holds gold with its share (one off the roster is dimmed, the total
counts it) and the split across the WTF accounts. The account filter is the
gold tab's and the bank tab's own; the roster has none.

The history is recorded at each read, but stored only when the amount
changed. A flat section is reduced to its two ends. A read without a gold
source is discarded, so a switched-off addon does not look like a drop to
zero. Data points of the last 14 days are kept in full; older ones are
reduced to one for each day. All of this is in `warband-briefing-state.json`
next to the other data. The item level and the M+ score of each character
are kept the same way and drawn as a line of 30 days under the figure.

### Bank

The **Bank** tab shows the warband bank, tab by tab as in the game, and the
moment of the last read; the search in the top bar goes over every tab.
The companion reads it at each visit to the bank; without one, the tab says
what it needs.

### Renown

The **Renown** tab shows the renown of the warband: one panel for the
factions of the season, one for the factions of the expansion, each
faction a ring filled to the next level, or, past the maximum level, to the
next paragon reward. Every character reports the same factions, so the
newest report counts. Which factions stand there is picked under
_Settings → Views → Season factions_. Only the companion knows renown;
without it, the tab says so.

### Settings → Views

Each block a view draws beyond the week's chores (the activities, the gear
check, the trend, the evening, the events, the bests) has one switch under
_Settings → Views_ (`src/shared/display.ts`), and so has each figure of the
roster's head row. A switched-off block disappears from all views at once,
and it no longer counts as "open": with the gear check off, no character is
sorted as "1 gear slot to fix". Only values that differ from the default
are stored, so a new switch in a later version is on by default.

## Weekly quests and season currencies

The addons store only ids. SavedInstances records a quest only after a
character has turned it in, and no source knows currency names. For this,
the app includes a season catalog (`src/shared/data/seasonCatalog.json`)
with the weekly quests, the currencies and the factions of the current
season. The ids come from a real client.

Under **Settings → Weekly quests** every quest the app knows is a row with
a box: the season's, from the catalog and from the quest log of your
characters, and the others your characters completed. A tick puts the
quest on the list; the title comes from the game, in the language of your
client, where a source saw it, and always wins over the catalog text.
Dailies are not listed. **Default** sets the box on the main activities of
the week. A quest no source knows takes its id and a name by hand.

A quest the game tags with a profession, for example "Alchemy Services
Requested", counts only for the characters that have the profession.
The companion reads the tag from the quest log; there is nothing to set.

**Settings → Season currencies** sets which currencies the cards show. The
default is the set of the current season (upgrade crests and the season
tokens). Currencies with a weekly cap stay in their own block.

At a season change, edit `data/seasonCatalog.json`: `patch`, `label`, the
crest ids, the quest list and the faction ids. The suggestion list and the
faction list in the settings show what the client writes. The catalog ships
with the app; a new weekly in the season is an app release.

## Languages

German and English, switchable under **Settings → Display**. The default
follows the operating system. All texts are in `src/shared/i18n/`; `de.ts`
is the reference, and each other language is typed against its keys, so a
missing string breaks the build.

Values from the game that depend on the language are not compared as text.
Lockouts carry the numeric `difficultyId`, and the app translates it. This
also works with an English client.

## Start and close

Both are settings under **Settings → Application → Start and close**:

- **Start at login**: the app registers itself as a login item of the
  current user. Off by default.
- **On close**: _quit the app_ (default) or _keep it in the background_.
  In the background the app keeps reading the SavedVariables and shows an
  icon in the notification area: a click opens the window, the menu quits
  the app. A second start from the start menu opens the window of the
  running app.

## Automatic updates

The app looks for new versions **at start and then once a day** in the
releases of `benjaminkott/warband-briefing` (`src/shared/repository.ts`),
downloads them in the background and then shows "Install update". The
update is installed only when you click. **Settings → Updates** turns the
check off or starts one by hand.

A push of a tag `v<version>` builds the installer on GitHub Actions and
publishes it as a release (`.github/workflows/release.yml`). To release:

1. Set the version in `package.json` and commit.
2. Tag the commit: `git tag v0.1.0-beta.2`.
3. Push the tag: `git push origin v0.1.0-beta.2`.

A version with a suffix (`-beta.2`) is a prerelease; only a prerelease
build takes it. The tag must match the version, or the job stops. The
release holds the installer, its `.blockmap` and `latest.yml`: `latest.yml`
tells the app the newest version, the blockmap lets it download only the
blocks that changed. The release notes are the commit messages since the
tag before, grouped by prefix (`scripts/release-notes.mjs`); see
`AGENTS.md`, "Commits".

Without a code signature, Windows shows a SmartScreen warning for the
installer.

## How the data is read

### Where the vault comes from

SavedInstances stores all three rows, but in three places:

- **Mythic+ row** from `MythicKeyBest`: the array holds the level for each
  slot, `runHistory` holds the runs of the week. If the array is missing,
  the app sorts the runs itself (1st, 4th and 8th best run) and marks the
  row with `*`.
- **Raid row** from `Progress["great-vault-raid"]`: one entry for each
  unlocked slot, as a Blizzard difficulty id (17 = LFR, 14 = Normal,
  15 = Heroic, 16 = Mythic). Only if it is missing, the app derives the row
  from the boss kills of the week (slots at 2/4/6 kills, level from the
  n-th best kill, raids of the current expansion only) and marks it with
  `*`.
- **World/delve row** from `Progress["great-vault-world"]`: one entry for
  each slot with the delve tier.

`MythicKeyBest` and the `great-vault-*` entries stay until the next login.
The app checks the stored `ResetTime`: the runs of a week that has ended
are dropped, and the filled slots are kept for one more week as a reward
still to collect, shown as last week's vault, never as this week's.

### Where the weekly activities come from

SavedInstances tracks the _objectives_ of the active weeklies, not only the
quest ids. Under `Progress`, each activity has its progress ("40 %",
"2/3"), whether it is ready to turn in and whether it is complete. The
keys are names such as `mn-void-assaults`. The quest ids and the display
name behind a key are not in the data file but in the addon code
(`Modules/Progress.lua`); the app reads that file together with the data,
so the mapping is not kept in this code. If the file is missing, the
activities are not shown.

Two rules apply. An activity whose quest you already watch sends its
progress to the weekly chip instead of a second entry. An "any" group (one
store for several quests, for example the meta quests) is not read for
watched quests, because the store does not say which quest it describes.

### The gear check

The slots that take an enchant change with the expansion: Midnight
enchants head and shoulders, but not wrist and cloak. Instead of a list in
the code, the app learns the slots from your roster
(`src/main/sources/enchants.ts`): a slot that any character at maximum
level has enchanted counts as enchantable, and an alt with that slot empty
is reported. Only a roster with no enchant at all falls back to chest,
legs, feet, rings and weapon. Empty sockets and the upgrade track come only
from the companion (tooltip).

## Development

See `AGENTS.md` for the rules of the code. The checks:

```bash
npm run typecheck        # tsc, tests and stories included
npm test                 # Vitest: every *.test.ts beside its module, every story in a headless Chrome
npm run build            # electron-vite build
npm run build-storybook  # static Storybook
npm run storybook        # Storybook on port 6006
```

### Project structure

```
src/main/               Electron main process
  lua.ts                Parser for WoW SavedVariables
  wow.ts                Finds the WoW installation
  sources/              Data source adapters
    types.ts            Adapter interface
    companion.ts        Adapter for the companion addon
    savedinstances.ts   Adapter for SavedInstances
    shared.ts           Realm slugs, file search, item links
    progressCatalog.ts  Reads the activity definitions from the SavedInstances code
    enchants.ts         Which slots take an enchant, learned from the roster
    rewards.ts          Vault rewards for characters without addon data
    index.ts            Registry, status query, merger
  addon.ts              Installs and updates the companion addon in the game folder
  collect.ts            Stale detection, filters, sort order
  season.ts             Weekly reset for each region, vault thresholds
  updater.ts            Automatic app updates
  autostart.ts          The login item
  tray.ts               The icon in the notification area
  store.ts              Configuration and snapshot cache
src/preload/            contextBridge API
src/renderer/           Lit UI (custom elements `wt-*`, Storybook)
  components/           The elements: primitives under ui/, views under views/, their parts in folders
  model/                The maths the elements draw, without a DOM
    gear.ts             Gear check (missing enchants, empty sockets)
    plan.ts             The plan: what a character does next, which character goes first
    tasks.ts            The task list: every chore of the week, per character or per chore
src/shared/             What both processes need
  charHistory.ts        Item level and score over time
  customTasks.ts        The user's own chores
  display.ts            The view switches
  series.ts             How a series of readings is kept and thinned (gold, item level)
  skips.ts              The chores picked off a character's week
  time.ts               The units of time and the split of a span
  data/                 Season catalog (quests, currencies, factions), JSON
  i18n/                 Translations (de.ts is the reference)
addon/WarbandBriefing/  The companion addon (Lua)
build/icon.png          The app's icon, the shield of wt-logo at 256 px; electron-builder makes the .ico
scripts/                The addon's version stamp
```

### Add a source

An adapter is a file under `src/main/sources/` that implements
`SourceAdapter`: `findFiles()` finds the SavedVariables files of the addon,
`read()` returns `SourceCharacter` records, `priority` gives the weight of
the source for each area. Then add it to `ADAPTERS`. The merge, the status
display, the on/off switch and the source badges follow from that.

Examined and rejected: `AllTheThings`, `ArkInventory`, `WorldQuestTracker`
and the many Ace3 addons store only profile mappings or collection and
position data under their character keys, nothing about the week.
`BountyHelper` has timestamps for each character, but in an undocumented
format without quest ids.

### Build and release

```bash
npm run dist:installer   # release/WarbandBriefing-Setup-<version>.exe
npm run dist             # unpacked folder only, under release/win-unpacked/
```

To publish a release to GitHub:

```bash
npm version patch
$env:GH_TOKEN="<your-token>"   # PowerShell
npm run release
```

The version in `package.json` must increase with each release; the addon
takes it from there (`scripts/sync-addon-version.mjs`).

## License

ISC. See `LICENSE`.
