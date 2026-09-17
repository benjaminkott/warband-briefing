import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { CloseAction } from '../../../../shared/enums/closeAction'
import { CustomTaskScope } from '../../../../shared/enums/customTaskScope'
import {
  ACCOUNT_CHARACTERS,
  ACCOUNTS,
  CONFIG,
  DATA_BUNDLE,
  ROSTER,
  SOURCES,
  UPDATE_AVAILABLE,
  UPDATE_READY,
  UPDATE_STATE
} from '../../stories/fixtures'
import './SettingsAccounts'
import './SettingsCharacters'
import './SettingsCurrencies'
import './SettingsFactions'
import './SettingsDisplay'
import './SettingsCustomTasks'
import './SettingsGoals'
import './SettingsSupplies'
import './SettingsInstall'
import './SettingsQuests'
import './QuestRow'
import '../ui/Table'
import { questChoices } from './model'
import './SettingsSources'
import './SettingsUpdates'
import './SettingsStartup'
import './SettingsShortcuts'
import './SettingsKeyboardGuide'
import './SettingsViews'

interface Args {
  busy: boolean
}

const meta: Meta<Args> = {
  title: 'Settings/Parts',
  args: { busy: false }
}

export default meta

/** The install folder and the region. */
export const Install: StoryObj<Args> = {
  render: (args) => html`<wt-settings-install .config=${CONFIG} ?busy=${args.busy}></wt-settings-install>`
}

/** Where the numbers come from and what each source contributes; a source that could not be read says so; none known at all. */
export const Sources: StoryObj<Args> = {
  render: (args) =>
    html`<wt-settings-sources .sources=${SOURCES} ?busy=${args.busy}></wt-settings-sources>
      <wt-settings-sources
        .sources=${[SOURCES[0]!, { ...SOURCES[1]!, error: 'SavedInstances.lua: unexpected end of file' }]}
        ?busy=${args.busy}
      ></wt-settings-sources>
      <wt-settings-sources .sources=${[]}></wt-settings-sources>`
}

/**
 * The install button for the addon that the app includes. An older version in
 * the game shows the update. No addon shows the install. The same version
 * shows nothing. Without a WoW folder, a hint replaces the button.
 */
export const AddonInstall: StoryObj<Args> = {
  render: (args) => {
    const shipped = SOURCES[0]!
    return html`<wt-settings-sources .sources=${[shipped]} ?busy=${args.busy}></wt-settings-sources>
      <wt-settings-sources
        .sources=${[{ ...shipped, addonInstalled: false, addonVersion: null, hasData: false, files: [] }]}
        ?busy=${args.busy}
      ></wt-settings-sources>
      <wt-settings-sources .sources=${[{ ...shipped, addonVersion: '4.0.0' }]} ?busy=${args.busy}></wt-settings-sources>
      <wt-settings-sources
        .sources=${[{ ...shipped, addonInstalled: false, addonVersion: null, canInstall: false }]}
        ?busy=${args.busy}
      ></wt-settings-sources>`
  }
}

/** Every quest the app knows as a row with a box: the season's, the others, and a form for an id; with one character, no hint about the pick. */
export const Quests: StoryObj<Args> = {
  render: (args) =>
    html`<wt-settings-quests
        .config=${CONFIG}
        .detectedQuests=${DATA_BUNDLE.detectedQuests}
        .learnedQuests=${DATA_BUNDLE.learnedQuests}
        .characters=${ROSTER}
        ?busy=${args.busy}
      ></wt-settings-quests>
      <wt-settings-quests
        .config=${CONFIG}
        .detectedQuests=${DATA_BUNDLE.detectedQuests}
        .learnedQuests=${DATA_BUNDLE.learnedQuests}
        .characters=${ROSTER.slice(0, 1)}
        ?busy=${args.busy}
      ></wt-settings-quests>`
}

/** One row of the quest table: ticked with its settings, and unticked as its name alone. */
export const QuestRow: StoryObj<Args> = {
  render: (args) => {
    const columns = [
      { label: 'Quest', className: 'col-quest' },
      { label: 'Quest-ID', className: 'col-id' }
    ]
    const rows = questChoices(CONFIG.weeklyQuests, DATA_BUNDLE.detectedQuests, DATA_BUNDLE.learnedQuests, (a, b) => a.localeCompare(b))
    return html`<wt-table .columns=${columns}>
      ${rows.season.slice(0, 4).map((choice) => html`<wt-quest-row .choice=${choice} .config=${CONFIG} ?busy=${args.busy}></wt-quest-row>`)}
    </wt-table>`
  }
}

/** Which currencies the cards show. */
export const Currencies: StoryObj<Args> = {
  render: () => html`<wt-settings-currencies .config=${CONFIG}></wt-settings-currencies>`
}

/** The factions of the season, from the catalog and from what the roster has seen; none known at all. */
export const Factions: StoryObj<Args> = {
  render: () =>
    html`<wt-settings-factions .config=${CONFIG} .characters=${ROSTER}></wt-settings-factions>
      <wt-settings-factions .config=${CONFIG} .characters=${[]}></wt-settings-factions>`
}

/** The season's supplies, named as Wowhead lists them: the catalog's figure for each, and a field for the player's own. */
export const Supplies: StoryObj<Args> = {
  render: () => html`<wt-settings-supplies .config=${CONFIG}></wt-settings-supplies>`
}

/** The weekly targets: two for everyone, one for one character. */
export const Goals: StoryObj<Args> = {
  render: () => html`<wt-settings-goals .config=${CONFIG} .characters=${ROSTER}></wt-settings-goals>`
}

/** The user's own chores, two of them set up. */
export const CustomTasks: StoryObj<Args> = {
  render: () =>
    html`<wt-settings-custom-tasks
      .config=${{
        ...CONFIG,
        customTasks: [
          { id: 'mail', label: 'Post leeren', scope: CustomTaskScope.Character },
          { id: 'ah', label: 'Auktionen erneuern', scope: CustomTaskScope.Warband }
        ]
      }}
    ></wt-settings-custom-tasks>`
}

/** Which WTF account folders count; the last one standing cannot be switched off. */
export const Accounts: StoryObj<Args> = {
  render: (args) =>
    html`<wt-settings-accounts
      .accounts=${ACCOUNTS}
      .accountCharacters=${ACCOUNT_CHARACTERS}
      .hiddenAccounts=${new Set<string>(['WOW2'])}
      ?busy=${args.busy}
    ></wt-settings-accounts>`
}

/** Who is on the overview, who is on the board; the column heads switch everyone. */
export const Characters: StoryObj<Args> = {
  render: () =>
    html`<wt-settings-characters .config=${CONFIG} .characters=${ROSTER} .hiddenKeys=${new Set([ROSTER[4]!.key])}></wt-settings-characters>`
}

/** The update source and the auto-update switch, in every state. */
/** The login item and the close action: an app that lives in the tray, and one that starts and ends by hand. */
export const Startup: StoryObj<Args> = {
  render: () =>
    html`<wt-settings-startup .config=${{ ...CONFIG, autoStart: true, onClose: CloseAction.Background }}></wt-settings-startup>
      <wt-settings-startup .config=${CONFIG}></wt-settings-startup>`
}

export const Updates: StoryObj<Args> = {
  render: (args) =>
    html`<wt-settings-updates .config=${CONFIG} .updateState=${UPDATE_STATE} ?busy=${args.busy}></wt-settings-updates>
      <wt-settings-updates .config=${CONFIG} .updateState=${UPDATE_AVAILABLE} ?busy=${args.busy}></wt-settings-updates>
      <wt-settings-updates .config=${CONFIG} .updateState=${UPDATE_READY} ?busy=${args.busy}></wt-settings-updates>`
}

/** The guide: short ways through the app, step by step, each step with its key. */
export const KeyboardGuide: StoryObj<Args> = {
  render: () => html`<wt-settings-keyboard-guide></wt-settings-keyboard-guide>`
}

/** The keyboard's ways through the app: each command with its keys. */
export const Shortcuts: StoryObj<Args> = {
  render: () => html`<wt-settings-shortcuts></wt-settings-shortcuts>`
}

/** Which blocks, columns and panels the views draw; the reset appears once a flag differs. */
export const Views: StoryObj<Args> = {
  render: () =>
    html`<wt-settings-views .config=${CONFIG}></wt-settings-views>
      <wt-settings-views .config=${{ ...CONFIG, display: { trend: false } }}></wt-settings-views>`
}

/** Language, level floor, refresh interval. */
export const Display: StoryObj<Args> = {
  render: () => html`<wt-settings-display .config=${CONFIG} resolved-locale="de"></wt-settings-display>`
}
