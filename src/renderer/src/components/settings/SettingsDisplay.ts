import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig } from '../../../../shared/types'
import { LOCALES, type LanguageSetting, type Locale } from '../../../../shared/i18n'
import { SystemLanguage } from '../../../../shared/enums/systemLanguage'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { ThemeSetting } from '../../../../shared/enums/themeSetting'
import { InputType } from '../../enums/inputType'
import '../ui/Select'
import '../ui/FieldGroup'
import '../ui/Input'
import '../ui/Hint'

/** Endonyms, deliberately not translated - a language picker shows its own name. */
const LANGUAGE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English'
}

/**
 * The language, light or dark, the level below which characters
 * stay out of the app, and how often the SavedVariables are re-read.
 *
 * @fires wt-config - The language, the theme, the level or the refresh interval.
 */
@customElement('wt-settings-display')
export class WtSettingsDisplay extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  /** The concrete locale `system` resolves to right now, for the picker's first entry. */
  @property({ attribute: 'resolved-locale' }) accessor resolvedLocale: Locale = 'en'

  protected override willUpdate(): void {
    const tr = this.tr
    const config = this.config
    this.icon = 'monitor'
    this.heading = tr.t('settings.display.title')
    this.content = html`
      <wt-field-group icon="globe" label=${tr.t('settings.display.language')}>
        <wt-select
          control-id="language"
          .value=${config.language}
          .options=${[
            {
              value: SystemLanguage.System,
              label: tr.t('settings.display.languageSystem', { resolved: LANGUAGE_NAMES[this.resolvedLocale] })
            },
            ...LOCALES.map((locale) => ({ value: locale, label: LANGUAGE_NAMES[locale] }))
          ]}
          @wt-change=${(event: WtEvent<'wt-change'>) => this.emit('wt-config', { language: event.detail as LanguageSetting })}
        ></wt-select>
      </wt-field-group>
      <wt-field-group icon="monitor" label=${tr.t('settings.display.theme')}>
        <wt-select
          control-id="theme"
          .value=${config.theme ?? ThemeSetting.System}
          .options=${[
            { value: ThemeSetting.System, label: tr.t('settings.display.themeSystem') },
            { value: ThemeSetting.Light, label: tr.t('settings.display.themeLight') },
            { value: ThemeSetting.Dark, label: tr.t('settings.display.themeDark') }
          ]}
          @wt-change=${(event: WtEvent<'wt-change'>) => this.emit('wt-config', { theme: event.detail as ThemeSetting })}
        ></wt-select>
      </wt-field-group>
      <wt-field-group icon="users" label=${tr.t('settings.display.minLevel')}>
        <wt-input
          control-id="min-level"
          type=${InputType.Number}
          .value=${String(config.minLevel)}
          min="1"
          max="90"
          @wt-input=${(event: WtEvent<'wt-input'>) => this.emit('wt-config', { minLevel: Number(event.detail) })}
        ></wt-input>
      </wt-field-group>
      <wt-field-group icon="refresh" label=${tr.t('settings.display.refresh')}>
        <wt-select
          control-id="refresh"
          .value=${String(config.autoRefreshMinutes)}
          .options=${[
            { value: '0', label: tr.t('settings.display.refreshOnChange') },
            { value: '5', label: tr.t('settings.display.refresh5') },
            { value: '15', label: tr.t('settings.display.refresh15') },
            { value: '60', label: tr.t('settings.display.refresh60') }
          ]}
          @wt-change=${(event: WtEvent<'wt-change'>) => this.emit('wt-config', { autoRefreshMinutes: Number(event.detail) })}
        ></wt-select>
      </wt-field-group>
      <wt-hint text=${tr.t('settings.display.refreshHint')}></wt-hint>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-display': WtSettingsDisplay
  }
}
