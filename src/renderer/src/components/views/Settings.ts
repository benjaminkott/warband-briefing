import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot, UpdateState, WeeklyQuestDef } from '../../../../shared/types'
import type { SourceInfo } from '../../../../preload/index'
import type { Locale } from '../../../../shared/i18n'
import type { TranslationKey } from '../../../../shared/i18n'
import { WtElement, type WtEvent } from '../../element'
import { SETTINGS_SECTIONS } from '../settings/model'
import { SettingsSection } from '../../enums/settingsSection'
import '../ui/Button'
import '../settings/SettingsAccounts'
import '../settings/SettingsCharacters'
import '../settings/SettingsCurrencies'
import '../settings/SettingsSupplies'
import '../settings/SettingsFactions'
import '../settings/SettingsDisplay'
import '../settings/SettingsCustomTasks'
import '../settings/SettingsGoals'
import '../settings/SettingsInstall'
import '../settings/SettingsQuests'
import '../settings/SettingsSources'
import '../settings/SettingsStartup'
import '../settings/SettingsUpdates'
import '../settings/SettingsShortcuts'
import '../settings/SettingsKeyboardGuide'
import '../settings/SettingsViews'
import '../ui/Segmented'

/**
 * The settings page: the sections in setup order down the left, the panels
 * of the open one beside them, each an element of its own under `settings/`.
 * The host is the two-column grid. Nothing is handled here - every panel's events bubble through to the
 * shell, which talks to the main process; the shell also keeps which section
 * is open, so it is still open after a visit to another tab.
 *
 * @fires wt-section - A section picked.
 * @fires wt-config - A patch of the configuration to store.
 * @fires wt-choose-wow-path - The folder picker.
 * @fires wt-toggle-source - A source switch.
 * @fires wt-check-update - Check for a new version now.
 * @fires wt-install-update - Restart into the downloaded version.
 * @fires wt-toggle-character - Take a character off the roster, or put it back.
 * @fires wt-toggle-account - The same for a WTF account folder.
 */
@customElement('wt-settings')
export class WtSettings extends WtElement {
  @property({ attribute: false }) accessor config!: AppConfig
  @property() accessor section: SettingsSection = SettingsSection.Setup
  /** The whole roster, so characters can be taken out of the overview here. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  @property({ attribute: false }) accessor hiddenKeys: Set<string> = new Set()
  /** Every WTF account the last read found, switched-off ones included. */
  @property({ attribute: false }) accessor accounts: string[] = []
  /** Characters per WTF account, the switched-off ones counted too. */
  @property({ attribute: false }) accessor accountCharacters: Record<string, number> = {}
  /** Weekly quests the sources saw completed - offered as suggestions. */
  @property({ attribute: false }) accessor detectedQuests: WeeklyQuestDef[] = []
  /** The season's weeklies the companion learned from the game. */
  @property({ attribute: false }) accessor learnedQuests: WeeklyQuestDef[] = []
  @property({ attribute: false }) accessor hiddenAccounts: Set<string> = new Set()
  @property({ attribute: 'resolved-locale' }) accessor resolvedLocale: Locale = 'en'
  @property({ attribute: false }) accessor sources: SourceInfo[] = []
  @property({ attribute: false }) accessor updateState: UpdateState | null = null
  @property({ type: Boolean }) accessor busy = false

  protected override willUpdate(): void {
    this.hostClasses({ settings: true })
  }

  private panels(): TemplateResult {
    const { config, characters, busy } = this
    switch (this.section) {
      case SettingsSection.Setup:
        return html`
          <wt-settings-install .config=${config} ?busy=${busy}></wt-settings-install>
          <wt-settings-sources .sources=${this.sources} ?busy=${busy}></wt-settings-sources>
        `
      case SettingsSection.Roster:
        return html`
          <wt-settings-accounts
            .accounts=${this.accounts}
            .accountCharacters=${this.accountCharacters}
            .hiddenAccounts=${this.hiddenAccounts}
            ?busy=${busy}
          ></wt-settings-accounts>
          <wt-settings-characters .config=${config} .characters=${characters} .hiddenKeys=${this.hiddenKeys}></wt-settings-characters>
        `
      case SettingsSection.Tasks:
        return html`
          <wt-settings-quests
            .config=${config}
            .detectedQuests=${this.detectedQuests}
            .learnedQuests=${this.learnedQuests}
            .characters=${characters}
            ?busy=${busy}
          ></wt-settings-quests>
          <wt-settings-goals .config=${config} .characters=${characters}></wt-settings-goals>
          <wt-settings-supplies .config=${config} .characters=${characters}></wt-settings-supplies>
          <wt-settings-custom-tasks .config=${config}></wt-settings-custom-tasks>
        `
      // The currencies and the factions say what the cards and the dashboard
      // show, not what is to do: they sit with the other view switches.
      case SettingsSection.Appearance:
        return html`
          <wt-settings-views .config=${config}></wt-settings-views>
          <wt-settings-currencies .config=${config}></wt-settings-currencies>
          <wt-settings-factions .config=${config} .characters=${characters}></wt-settings-factions>
          <wt-settings-display .config=${config} resolved-locale=${this.resolvedLocale}></wt-settings-display>
        `
      case SettingsSection.Keyboard:
        return html`
          <wt-settings-keyboard-guide></wt-settings-keyboard-guide>
          <wt-settings-shortcuts></wt-settings-shortcuts>
        `
      case SettingsSection.App:
        return html`
          <wt-settings-startup .config=${config}></wt-settings-startup>
          <wt-settings-updates .config=${config} .updateState=${this.updateState} ?busy=${busy}></wt-settings-updates>
        `
    }
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    return html`
      <wt-segmented
        vertical
        .value=${this.section}
        .options=${SETTINGS_SECTIONS.map((entry) => ({
          value: entry.id,
          icon: entry.icon,
          label: tr.t(`settings.section.${entry.id}` as TranslationKey)
        }))}
        @wt-change=${(event: WtEvent<'wt-change'>) => {
          event.stopPropagation()
          this.emit('wt-section', event.detail as SettingsSection)
        }}
      ></wt-segmented>
      <div class="settings-body">${this.panels()}</div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings': WtSettings
  }
}
