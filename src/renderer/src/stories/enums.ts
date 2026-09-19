import { GoalKind } from '../../../shared/enums/goalKind'
import { Region } from '../../../shared/enums/region'
import { IconKind } from '../../../shared/enums/iconKind'
import { LexiconKind } from '../../../shared/enums/lexiconKind'
import { ItemCategory } from '../../../shared/enums/itemCategory'
import { RenownKind } from '../../../shared/enums/renownKind'
import { ThemeSetting } from '../../../shared/enums/themeSetting'
import { CloseAction } from '../../../shared/enums/closeAction'
import { SystemLanguage } from '../../../shared/enums/systemLanguage'
import { VaultCategory } from '../../../shared/enums/vaultCategory'
import { FactionGroup } from '../../../shared/enums/factionGroup'
import { CustomTaskScope } from '../../../shared/enums/customTaskScope'
import { Severity } from '../enums/severity'
import { Tint } from '../enums/tint'
import { ClassToken } from '../enums/classToken'
import { HostDisplay } from '../enums/hostDisplay'
import { ControlSize } from '../enums/controlSize'
import { IconSize } from '../enums/iconSize'
import { ButtonRole } from '../enums/buttonRole'
import { BarKind } from '../enums/barKind'
import { CheckboxKind } from '../enums/checkboxKind'
import { InputWidth } from '../enums/inputWidth'
import { TableKind } from '../enums/tableKind'
import { MatrixSort } from '../enums/matrixSort'
import { DetailListKind } from '../enums/detailListKind'
import { WowheadKind } from '../enums/wowheadKind'
import { StatKind } from '../enums/statKind'
import { Place } from '../enums/place'
import { BrandId } from '../enums/brandId'
import { InputType } from '../enums/inputType'
import { Tab } from '../enums/tab'
import { HitKind } from '../enums/hitKind'
import { Stash } from '../enums/stash'
import { Command } from '../enums/command'
import { StateWord } from '../enums/stateWord'
import { SettingsSection } from '../enums/settingsSection'
import { DetailSection } from '../enums/detailSection'
import { SortDirection } from '../enums/sortDirection'
import { SortKey } from '../enums/sortKey'
import { ViewMode } from '../enums/viewMode'
import { TaskFilter } from '../enums/taskFilter'
import { TaskGrouping } from '../enums/taskGrouping'
import { TaskKind } from '../enums/taskKind'
import { TaskState } from '../enums/taskState'
import { GearIssueKind } from '../enums/gearIssueKind'
import { GoldRange } from '../enums/goldRange'
import { GoldChart } from '../enums/goldChart'
import { StepTone } from '../enums/stepTone'
import { TrendDirection } from '../enums/trendDirection'
import { FactionSide } from '../enums/factionSide'
import { FormatKind } from '../enums/formatKind'
import { AnyAccount } from '../../../shared/enums/anyAccount'
import { QuestReset } from '../../../shared/enums/questReset'
import { ProgressType } from '../../../shared/enums/progressType'
/**
 * The catalog of the app's string enums, for the stories that show them.
 * Each enum is a file of its own under `enums/` or `shared/enums/`, named
 * after it.
 *
 * Every discriminator of an element - a tone, a kind, a size, a layout -
 * and every fixed word of the maths is a string enum whose value is the
 * word the stylesheet, the store or the template already uses. The table
 * here names each with what it is for, so one docs page lists them all
 * and a test can hold them to the rules: values distinct, one word each.
 *
 * The shared enums come first: both processes read them, and their values
 * are what the store, the catalog and the addons write.
 *
 * Only a story imports this module: it pulls in every element that
 * declares an enum.
 */

/** A string enum as a value: its members by name. */
export type StringEnum = Record<string, string>

export interface EnumEntry {
  name: string
  /** What the members are, in one line. */
  about: string
  /** The module that declares it, relative to `src/renderer/src`. */
  module: string
  values: StringEnum
}

export const ENUMS: readonly EnumEntry[] = [
  {
    name: 'Region',
    about: 'The regions the companion addon can name; the value is the client’s own word.',
    module: 'shared/enums/region.ts',
    values: Region
  },
  {
    name: 'SystemLanguage',
    about: 'The language setting beyond a locale: follow the operating system’s; a LanguageSetting is a Locale or this.',
    module: 'shared/enums/systemLanguage.ts',
    values: SystemLanguage
  },
  {
    name: 'ThemeSetting',
    about: 'What the theme setting says: one of the two looks, or the system’s; a Theme is the setting with System resolved.',
    module: 'shared/enums/themeSetting.ts',
    values: ThemeSetting
  },
  {
    name: 'CloseAction',
    about: 'What the close button does: end the app, or keep it in the background with a tray icon.',
    module: 'shared/enums/closeAction.ts',
    values: CloseAction
  },
  {
    name: 'VaultCategory',
    about: 'The three Great Vault rows, in the order the game lists them.',
    module: 'shared/enums/vaultCategory.ts',
    values: VaultCategory
  },
  {
    name: 'IconKind',
    about: 'What a game icon is of: the kinds the lexicon keeps a file id for, and the class; the value is the word in the icon address.',
    module: 'shared/enums/iconKind.ts',
    values: IconKind
  },
  {
    name: 'LexiconKind',
    about: 'The tables of the lexicon: what the app keeps a number for, by id - the pictures the companion registers, and what an item is.',
    module: 'shared/enums/lexiconKind.ts',
    values: LexiconKind
  },
  {
    name: 'ItemCategory',
    about: 'What an item is: the game’s own item classes, the groups the client sorts a bag into.',
    module: 'shared/enums/itemCategory.ts',
    values: ItemCategory
  },
  { name: 'RenownKind', about: 'A renown track, or a plain reputation.', module: 'shared/enums/renownKind.ts', values: RenownKind },
  {
    name: 'GoalKind',
    about: 'What a goal is measured against; each maps to one number per character.',
    module: 'shared/enums/goalKind.ts',
    values: GoalKind
  },
  {
    name: 'FactionGroup',
    about: 'Where a faction belongs: the season adds it, or the expansion did.',
    module: 'shared/enums/factionGroup.ts',
    values: FactionGroup
  },
  {
    name: 'AnyAccount',
    about: 'The one word an account filter adds to the WTF account folders: every account.',
    module: 'shared/enums/anyAccount.ts',
    values: AnyAccount
  },
  {
    name: 'QuestReset',
    about: 'When a quest resets, as the companion’s catalog says it.',
    module: 'shared/enums/questReset.ts',
    values: QuestReset
  },
  {
    name: 'ProgressType',
    about: 'How an entry of the companion’s catalog counts: one quest, any of them, a list with a threshold, or its own code.',
    module: 'shared/enums/progressType.ts',
    values: ProgressType
  },
  {
    name: 'CustomTaskScope',
    about: 'Whether a hand-ticked task is one per character or one for the warband.',
    module: 'shared/enums/customTaskScope.ts',
    values: CustomTaskScope
  },
  {
    name: 'Severity',
    about: 'How a thing is to be read: the neutral word, in order, wants a look, a loss.',
    module: 'enums/severity.ts',
    values: Severity
  },
  {
    name: 'Tint',
    about:
      'The colours beyond the severities: gold, the accent, the keystone’s colour, the faint ink. A tone type is a union of these and the severities.',
    module: 'enums/tint.ts',
    values: Tint
  },
  {
    name: 'ClassToken',
    about: 'The classes the app knows a colour for; the value is the token the addons save.',
    module: 'enums/classToken.ts',
    values: ClassToken
  },
  {
    name: 'HostDisplay',
    about: 'What a host is for layout: a block, inline, a grid row, or no box of its own.',
    module: 'enums/hostDisplay.ts',
    values: HostDisplay
  },
  {
    name: 'ControlSize',
    about: 'The height scale a button, a field and a select share.',
    module: 'enums/controlSize.ts',
    values: ControlSize
  },
  {
    name: 'IconSize',
    about: 'The five steps of the icon scale; an icon beside small type is xs, on a control sm, at a head md.',
    module: 'enums/iconSize.ts',
    values: IconSize
  },
  {
    name: 'ButtonRole',
    about: 'The default control or the one primary action; Severity.Danger sits beside them.',
    module: 'enums/buttonRole.ts',
    values: ButtonRole
  },
  { name: 'BarKind', about: 'The three bar shapes the stylesheet knows.', module: 'enums/barKind.ts', values: BarKind },
  { name: 'CheckboxKind', about: 'The rows a checkbox comes in, or the box alone.', module: 'enums/checkboxKind.ts', values: CheckboxKind },
  { name: 'InputWidth', about: 'How much of a form row a field takes.', module: 'enums/inputWidth.ts', values: InputWidth },
  {
    name: 'TableKind',
    about: 'The plain table of a list, or the character page’s table in its scroll box.',
    module: 'enums/tableKind.ts',
    values: TableKind
  },
  {
    name: 'MatrixSort',
    about: 'The one word the best matrix’s sort adds to the dungeon ids: by the total.',
    module: 'enums/matrixSort.ts',
    values: MatrixSort
  },
  {
    name: 'DetailListKind',
    about: 'The two cuts of a character page list: lines, and lines that carry a bar.',
    module: 'enums/detailListKind.ts',
    values: DetailListKind
  },
  { name: 'WowheadKind', about: 'What a Wowhead page is about.', module: 'enums/wowheadKind.ts', values: WowheadKind },
  {
    name: 'StatKind',
    about: 'A figure with its caption as a tile, or as the bare cell of the hero band.',
    module: 'enums/statKind.ts',
    values: StatKind
  },
  {
    name: 'Place',
    about: 'Where a thing about a character stands: the card, a table cell, the best matrix. The name and the links take it.',
    module: 'enums/place.ts',
    values: Place
  },
  { name: 'BrandId', about: 'The external sites a character links to.', module: 'enums/brandId.ts', values: BrandId },
  { name: 'InputType', about: 'What a field takes: text, or a number with its bounds.', module: 'enums/inputType.ts', values: InputType },
  { name: 'Tab', about: 'The views the top bar switches between, in the order of the bar.', module: 'enums/tab.ts', values: Tab },
  { name: 'HitKind', about: 'What the top bar’s search found: a character, or an item.', module: 'enums/hitKind.ts', values: HitKind },
  {
    name: 'Stash',
    about: 'Where an item sits: a character’s bags, a character’s bank, the warband bank of an account.',
    module: 'enums/stash.ts',
    values: Stash
  },
  {
    name: 'Command',
    about: 'What a key stroke asks for; the shell or a view carries it out.',
    module: 'enums/command.ts',
    values: Command
  },
  {
    name: 'StateWord',
    about: 'The one word beside a name that says where a character stands this week.',
    module: 'enums/stateWord.ts',
    values: StateWord
  },
  {
    name: 'SettingsSection',
    about: 'The pages of the settings, in the order of the nav.',
    module: 'enums/settingsSection.ts',
    values: SettingsSection
  },
  {
    name: 'DetailSection',
    about: 'The sections of the character page, in the order of its sub-navigation.',
    module: 'enums/detailSection.ts',
    values: DetailSection
  },
  { name: 'ViewMode', about: 'The roster as tiles, as rows, or as one table.', module: 'enums/viewMode.ts', values: ViewMode },
  {
    name: 'SortKey',
    about: 'What the overview sorts by, in the order the picker lists them.',
    module: 'enums/sortKey.ts',
    values: SortKey
  },
  { name: 'SortDirection', about: 'Up or down.', module: 'enums/sortDirection.ts', values: SortDirection },
  {
    name: 'TaskKind',
    about: 'The kinds of chore the list knows, in the order a character lists them.',
    module: 'enums/taskKind.ts',
    values: TaskKind
  },
  { name: 'TaskState', about: 'What the sources say about a chore.', module: 'enums/taskState.ts', values: TaskState },
  {
    name: 'TaskGrouping',
    about: 'How the list groups its tasks: by character, by chore, or as a grid.',
    module: 'enums/taskGrouping.ts',
    values: TaskGrouping
  },
  {
    name: 'TaskFilter',
    about: 'Which tasks the list shows: only the open ones, only the quick ones, or all.',
    module: 'enums/taskFilter.ts',
    values: TaskFilter
  },
  { name: 'GoldRange', about: 'How far back the gold chart looks.', module: 'enums/goldRange.ts', values: GoldRange },
  { name: 'GoldChart', about: 'What the gold chart draws: the account, or each character.', module: 'enums/goldChart.ts', values: GoldChart },
  {
    name: 'StepTone',
    about: 'How the next step reads on the tile: a reward to claim, a chore open, the week done, nothing to say.',
    module: 'enums/stepTone.ts',
    values: StepTone
  },
  {
    name: 'TrendDirection',
    about: 'Which way a figure moved: up, down, or not at all.',
    module: 'enums/trendDirection.ts',
    values: TrendDirection
  },
  {
    name: 'FactionSide',
    about: 'The side a character is on; the value is the client’s token.',
    module: 'enums/factionSide.ts',
    values: FactionSide
  },
  {
    name: 'FormatKind',
    about: 'The formatters of wt-format; the value is the kind attribute’s word.',
    module: 'enums/formatKind.ts',
    values: FormatKind
  },
  { name: 'GearIssueKind', about: 'The two kinds of errand a bare slot is.', module: 'enums/gearIssueKind.ts', values: GearIssueKind }
]

/** The member of `values` with `value`, written as it is in code: `Severity.Warn`. */
export function memberOf(name: string, values: StringEnum, value: string): string {
  const found = Object.entries(values).find(([, v]) => v === value)
  return found ? `${name}.${found[0]}` : `'${value}'`
}
