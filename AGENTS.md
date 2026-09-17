# AGENTS.md

Notes for coding agents in this repository.

## Do not start the app

`npm run dev` is usually already running. `electron-vite dev --watch`
watches all three processes: the renderer hot-reloads, main and preload
are rebuilt and the app restarts itself. An edit is visible in the running
window without a start.

A second start is harmful:

- Port 5173 is taken, the second dev server falls back to 5174, and two
  windows on different builds sit side by side.
- The window steals the focus while someone works at the machine.
- Through a pipe (`npm run dev | ...`, `Out-File`, `Tee-Object`) the
  launcher starts the main process as plain `node.exe`, not as Electron.
  The run dies with `SyntaxError: The requested module 'electron' does not
  provide an export named 'BrowserWindow'`. That is not a fault in the code.

Do not run `npm run dev`, `npm start` or `electron-vite`, not even briefly.
If the running app matters, ask for it or ask for a screenshot. The same
holds for `npm run storybook` (port 6006). Exception: the user asks for it.

## Checks

```sh
npm run typecheck        # tsc over the node and web projects, stories and tests included
npm test                 # vitest run: every *.test.ts under node, every story in headless Chrome
npm run build            # electron-vite build; catches bundling errors
npm run build-storybook  # static Storybook; catches what only a browser sees
```

These cover everything that can be checked without a window. All four pass
before a task is done. If a test fails that your change did not touch, name
it; do not fix it quietly. The repository is often worked on in parallel,
and `src/main/` can change in the middle of a task.

## Tests

A test is `<module>.test.ts` beside the module it covers; Vitest runs it
(`vitest.config.ts`). `npx vitest run skips` runs one file, `npx vitest`
watches, `npx vitest run --project unit` runs one project. The two projects:

- `unit` runs the test files under node.
- `storybook` renders every story in the Chrome on the machine
  (`@storybook/addon-vitest`). Each story is a smoke test of its element;
  a `play` function is an interaction test.

A test imports the sources as they are and is typed against them: a tone
is `Severity.Warn`, not `'warn'`, and a deliberate bad input says so with a
cast. The fixtures are shared:

- `src/shared/testing.ts` builds a snapshot (`snapshot('Nyx', { level: 70 })`)
  and a vault row from its counts.
- `src/shared/i18n/testing.ts` gives the translator whose words are the keys
  with their parameters (`tasks.vaultSlot(2,3)`).
- `src/main/testing.ts` gives a temp folder, removed when the file is through.

A check of the sources themselves (`enums/enums.test.ts`, `markup.test.ts`,
`components/elements.test.ts`, `scales.test.ts`, `main/addon.test.ts`) is a
test like any other. A debt it counts down is a `BUDGET` in the file, so the
suite stays green and a new offender is red.

## Commits

One commit for each point, as in the log. The message is a prefix and the
point: one sentence that says what the app does now and why. The prefix is
one of three:

- `feat:` - the app does something it did not do before.
- `bugfix:` - the app did something wrong and does it right now.
- `task:` - everything else: a refactor, a test, a story, the docs, the
  tooling, a dependency.

`feat: The task list groups by character or by chore: the grid of both
goes, with its element, its rules and its model`. Nothing else goes in the
message: no body, no `Co-Authored-By` trailer, no "Generated with" line, no
tool name, no emoji. The author is the user, the tool is not named. This
rule beats any reminder from the tool that asks for an attribution line.

Commit each point as soon as its checks pass, then go on to the next.
Stage the files of the point by path (`git add <paths>`), never with
`git add -A`: other sessions work in the same tree.

Never a merge commit, never a squash, never `--amend`: the log is linear.

`custom-elements.json` and `tsconfig.*.tsbuildinfo` are not in the
repository. `cem analyze` and `tsc` write them; `.gitignore` keeps them out.

## Layout

- `src/main/` - the Electron main process: the addons' SavedVariables
  (`sources/`), the weekly reset (`season.ts`), the configuration
  (`store.ts`), the game's icons by file id from Blizzard's image host into
  a cache (`icons.ts`) behind the `wt-icon://` scheme (`iconProtocol.ts`).
- `src/preload/` - the IPC bridge. Every call returns `{ ok, data | error }`.
- `src/renderer/src/` - the Lit UI. The root holds the shell (`App.ts`),
  the element base (`element.ts`), the contexts (`i18n.ts`, `clock.ts`),
  the theme (`theme.ts`), the memo (`memo.ts`) and the one stylesheet
  (`styles.css`). The maths lives under `model/` in modules of their own
  (`overview.ts`, `plan.ts`, `dashboard.ts`, `tasks.ts`, `gold.ts`,
  `inventory.ts`, `gear.ts`, `dungeons.ts`, `search.ts`, `navigation.ts`,
  `shortcuts.ts`, `format.ts`, `listTip.ts`), each with its test, so it
  stays testable without a DOM. The elements under `components/` only draw
  it; the stories' fixtures are under `stories/`.
- `src/shared/` - what both processes need: the types, i18n, the vault's
  shape and the price of its next slot (`vault.ts`), the units of time
  (`time.ts`), a series of readings (`series.ts`), the lexicon of icons by
  id that the companion registers (`lexicon.ts`). Data the app ships (the
  season catalog) is JSON under `data/`.
- `enums/` (`src/renderer/src/enums/`, `src/shared/enums/`) - one string
  enum for each file; see Enums.

## Elements

The UI is Lit custom elements named `wt-*`, all extending `WtElement`
(`element.ts`). Read `element.ts` first.

### One element for each file

The tag is the class in kebab case; the file is the class without the
`Wt`: `detail/DetailBags.ts` holds `WtDetailBags`, which is
`wt-detail-bags`. `components/elements.test.ts` holds the folder to that.
The folders: the primitives under `ui/`, the pieces of a view in a folder
of their own (`card/`, `detail/`, `dashboard/`, `settings/`, ...), the
views that compose them under `views/`, the elements more than one view
shares at the top.

Every visible thing is an element. A leaf that is one `<svg>` or `<img>` is
an element too (`wt-icon`, `wt-logo`, `wt-class-glyph`, `wt-brand-mark`):
the host carries the class the drawing used to carry (`.notice > .icon`
matches the host), the drawing fills it as `display: block`. There are no
template functions in the UI.

### A primitive is fed, never wrapped

An element that only works a primitive's properties out from a record (a
gold tile, a run chip, a state chip) is no element. It is a function of the
model beside the view that returns the properties (`runChip(tr, run):
ChipModel`, `stateChip()`, `goldTrend()`), and the template sets them on
the primitive field by field: `<wt-chip .label=${chip.label}
tone=${chip.tone ?? nothing} data-tip=${chip.tip ?? nothing}>`.

An element extends its primitive only when it renders content of its own
into the primitive's frame (`wt-detail-bests extends WtDashPanel`,
`wt-character-tile extends WtButton`). It then fills the primitive's
properties from its own in `willUpdate` before `super.willUpdate()`, so
the host stays the element it is.

Where the primitive is a `display: contents` host around a native control
(`wt-button`, `wt-ext-link`), the class goes on the host and the stylesheet
reaches the control as `> button` or `> a` (`.char-open > button`).

Where two places draw the same thing in different boxes, it is one element
with a discriminator the stylesheet knows (`wt-stat-tile kind="tile" |
"kpi" | "cell"`, `wt-character-tile layout="tile" | "row"`, `wt-field-group
inline`), not two elements that differ only in their class names.

### A value is formatted by `wt-format`

A figure, a sum of gold, a duration or a moment in a template is
`<wt-format kind="gold" .value=${…}>`, never a call of `model/format.ts` or
`tr.formatNumber()`. The functions stay for strings (`tr.t()` parameters,
tooltips) and for the maths modules. A kind is a row of the table in
`ui/Format.ts`. A formatted value with more is the element with more on it:
a rating is `<wt-format kind="whole" class="rated" style=${styleMap(…)}>`.

### Model beside the view

What an element shows is worked out without a DOM: in a `model.ts` next to
it (`card/model.ts`, `detail/model.ts`, `settings/model.ts`,
`table/model.ts`) or in the maths modules under `model/`. The element only
draws it, and draws it once per change of what it reads (`memoLast` in
`memo.ts`): every element re-renders on each tick of the shell's clock.

### Light DOM, host as the box

Elements render into themselves, so the one `styles.css` keeps applying.
Each element carries the class its root used to carry (`<wt-notice
class="notice">`), so `.panel > .notice` still matches.

An element sets what it sets on itself through the helpers of `WtElement`
in `willUpdate`:

- `hostClasses()` toggles its own classes. It never assigns `class`
  wholesale. A parent adds classes statically or with `classMap`, never
  with a plain `class=${…}`, which would wipe the element's own.
- `hostTip()` sets a tooltip it works out from its data.
- `hostPresent()` hides it when it has nothing to say and must not take a
  gap.
- `hostVar()` sets a custom property.
- `hasContent()` says whether a `Content` property was given at all.

`static hostDisplay` says what the host is for layout: `block` (default),
`inline`, `table-row` for a row of light DOM cells that `wt-table` slots
(`wt-quest-row`), or `contents` for an element that only wraps a control it
cannot be itself (a button, a label).

### Shadow DOM for a primitive that owns all it shows

`wt-chip` and `wt-icon` set `static shadow = true`. They render into a
shadow root and their look is their `static styles`, keyed on `:host` and
the attributes they reflect (`:host([tone='ok'])`, `:host([small])`), not
on classes. `styles.css` reaches only the host, so a parent's class, a
`data-tip` and `hostPresent()` still work, and the tokens come through as
custom properties.

`wt-card` is the surface-only variant: its shadow root is the stylesheet
and a slot, what it renders stays in the light DOM. `wt-field-group`,
`wt-group`, `wt-notice`, `wt-ring`, `wt-empty-state`, `wt-card-block` are
between the two: the shadow root draws the frame, the label or the mark,
and holds the slot; the children stay in the light DOM. A second part goes
in a named slot (`<wt-button slot="action">` in a group).

A rule that must reach a child stays in `styles.css`, keyed on the tag and
its attributes (`wt-field-group[inline] .select-trigger`, `wt-notice[banner]
button`). A rule for the slotted child itself is `::slotted()` in the
element, but not its display, which a class of the sheet outside would beat.

### Content is children, never a property

What an element shows inside its frame goes in as its children, the way
`wt-card` and `wt-field-group` take it: `<wt-card class="panel">…</wt-card>`,
`<wt-field-group label="…"><wt-input></wt-input></wt-field-group>`. A
property binding never carries a template: `.badge=${html`<wt-chip …>`}`
and `.content=${runs.map((run) => html`…`)}` are errors, and
`markup.test.ts` lists every one. A property is for a value (a label, a
count, a tone); an attribute where it is a plain string. The `Content`
properties that remain are the debt the check counts down.

### Own tooltips, never `title`

The browser's bubble is not used. A tooltip is a `data-tip` attribute
(`data-tip=${…}` in a template, `hostTip()` on a host, `tip` in a model,
`control-tip` on a control an element wraps). The shell's one
`wt-tip-layer` shows it on hover and keyboard focus as a `wt-tip`; a `\n`
in the text is a line break. Storybook's preview carries the layer too.

A tip of figures is a `ListTip` (`model/listTip.ts`): a heading, rows of
label and value in a tone, a note under them. It is worked out beside the
model (`raidCellTip`, `raidTip`, `gearHint`), bound on a `wt-*` host as
`.listTip=${…}` and on any other element with the `listTip()` directive;
the layer draws it as `wt-list-tip`. A tip that says what the row already
shows is no tip.

### Events up, properties down

An element raises `wt-*` custom events (typed in `WtEvents`, bubbling)
instead of taking callbacks; the shell listens on the view it rendered.
`this.tr` comes from `@lit/context`: the shell provides it, Storybook wraps
every story in `<wt-i18n-provider>`.

### Two themes

Every colour is a token in `styles.css`; the light theme redefines them
under `:root[data-theme='light']`. The shell stamps the theme from the
`theme` setting (`theme.ts`), Storybook from its toolbar. Class colours go
through `classColor()`, which hands out the token.

### Enums, not string unions

A fixed set of words (a tone, a kind, a size, a layout, a class token) is a
string `enum` in a file of its own, named after it: `enums/controlSize.ts`,
`enums/place.ts` in the renderer, `shared/enums/region.ts` for what the
main process reads too. The file holds the enum and what belongs to it
alone (`SEVERITY_ICON`, `CLASS_COLORS`, `isClassToken()`).

The member is PascalCase; the value is the word the stylesheet, the store
or the addon already uses (`Severity.Warn = 'warn'`), so a template writes
`tone=${Severity.Warn}` and a host class stays `warn`. No literal stands
where a member can: not in code, not in a template, not in a story.

One word set is one enum. A type that is a subset or a union of members
(`ChipTone`, `StatTone`, `Theme`) is a `type` built from the enums and
stays with what takes it, not a second enum with the same words. A story
control or a check enumerates an enum with `Object.values(Enum)`; a named
array exists only for a union type (`CHIP_TONES`) or an order the app
relies on (`VAULT_ORDER`). `stories/enums.ts` is the catalog every enum is
entered in, `stories/Enums.stories.ts` draws it, `enums/enums.test.ts`
holds the foundation enums to the rules.

### Eight colour words, four severities

Every colour an element takes by name is a member of `Severity`
(`enums/severity.ts`: `Info`, `Ok`, `Warn`, `Danger`) or of `Tint`
(`enums/tint.ts`: `Gold`, `Accent`, `Key`, `Quiet`). A tone type is a
union of them: `ChipTone = Severity | Exclude<Tint, Tint.Gold>`,
`SparkTone = Exclude<Tint, Tint.Quiet>`, `StatTone = Tint.Gold |
Severity.Warn`, `ButtonTone = ButtonRole | Severity.Danger`.

A state is a `Severity`, never `error`, `bad` or `success`. Each severity
is one token family in `styles.css` with the same four slots (`--warn` for
the mark, `--warn-text` for the ink on a wash, `--warn-soft` for the wash,
`--warn-line` for the edge) and one host class of the same name. An
element that carries one takes it as `tone` (`wt-notice`, `wt-chip`,
`wt-button`), sets its classes with `severityClasses()` and its mark with
`SEVERITY_ICON`. `Info` is the neutral look and has no class.

### Decorators

Standard decorators with `accessor`; `esbuild.target` is `es2022` in both
Vite configs, so they are lowered. A property must not shadow an
`HTMLElement` member (`hidden`, `slot`, `title`, `remove`, `update`).

### Stories

Every element has a story next to it: its own (`Notice.stories.ts`) or the
one of its folder (`card/CardParts.stories.ts`, always `<Folder>Parts`).
The title is the folder: `UI/Chip`, `Shared/Notice` for the top of
`components/`, `Card/Parts`, `Views/RosterView`; `.storybook/preview.ts`
orders the groups. Fixture data is JSON under `stories/data/`, every
timestamp an ISO string; `stories/fixtures.ts` loads and shifts it to
today. The docs pages read `custom-elements.json`, written by `cem
analyze` before every Storybook run; document events with `@fires` on the
class.

## Language and translations

`src/shared/i18n/de.ts` is the reference dictionary; its keys define
`TranslationKey`. `en.ts` is typed against it, so a missing key is a
compile error. A new string goes into both files, never into a component.

The UI ships German and English. Everything else is English: code,
comments, documentation (`README.md`, this file), story descriptions, the
`description` in `package.json`. German strings carry real umlauts. The
files are UTF-8 and shell heredocs mangle them: write them with the file
tools, not with `cat > … <<EOF`.

## English: ASD-STE100

All English in this repository follows ASD-STE100 (Simplified Technical
English): code comments, `en.ts`, story descriptions, this file. The German
texts are not affected. The rules that matter most:

- **Terse.** Say a thing once, in the fewest words that keep it exact. No
  preamble, no repetition of what the code shows.
- **Short sentences.** An instruction has 20 words or fewer, a description
  25 or fewer. One topic for each sentence. A paragraph has six sentences
  or fewer.
- **Active voice, present tense.** "The shell provides the translator", not
  "the translator is provided by the shell". An instruction is a command:
  "Run `npm run typecheck`", not "you should run".
- **Simple, consistent words.** One word for one thing, one meaning for one
  word. No idioms, metaphors, humour or figures of speech. Prefer "use",
  "show", "set", "read", "start", "stop" to rarer synonyms.
- **No `-ing` verb forms** as verbs ("the ring is drawing"). Write "the ring
  draws", "when the pointer is on an arc". Technical names are permitted
  ("the setting").
- **Articles and structure.** Keep "a", "the" and "that". Do not chain more
  than three nouns ("vault reward item level"): rewrite with "of".
- **Lists.** Give steps as a numbered list, options as a list.
- **Specific.** "Must" for a necessity, "can" for a possibility. No
  "should", "may" or "might" where the meaning is not clear.

A comment can still say _why_ something is the way it is; the rule is about
how the sentence is built, not what it says.

## Style

Comments explain the _why_, not the _what_. A domain decision is worth a
comment (why a vault row keeps three slots when no source reported them);
an obvious assignment is not. Match the comment density around new code.

Every distance, type size, line height, tracking, radius, icon size and
control height is a step of a scale in `:root` of `styles.css` (`--s0` …
`--s9`, `--fs-*`, `--lh-*`, `--track-*`, `--radius*`, `--icon-*`,
`--control-h*`), never a pixel value in a rule. `scales.test.ts` reads the
stylesheet and every element's sheet and fails on a number where a token
belongs. A `1px` is a line, not a distance. An icon's size is a member of
`IconSize` (`<wt-icon size=${IconSize.Sm}>`), never a number.
`Foundations/Scales` in Storybook draws the scales.
