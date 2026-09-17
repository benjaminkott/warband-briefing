import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { SourceInfo } from '../../../../preload/index'
import type { TranslationKey } from '../../../../shared/i18n'
import { areaOf } from '../../model/labels'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { Severity } from '../../enums/severity'
import { ButtonRole } from '../../enums/buttonRole'
import { CheckboxKind } from '../../enums/checkboxKind'
import '../Notice'
import '../ui/Button'
import '../ui/Checkbox'
import '../ui/Chip'
import '../ui/DashPanel'
import '../ui/Entry'
import '../ui/FieldGroup'
import '../ui/Hint'
import '../ui/PanelEmpty'

/**
 * Lists every known data source with what it currently contributes, so it is
 * obvious where the numbers on the overview come from. Each source is a
 * `wt-entry`: the switch, the name, whether its addon is in the game, then
 * what it read last, what it supplies, and the install button for the
 * addon the app includes.
 *
 * @fires wt-toggle-source - A switch, with the source id and whether it is on.
 * @fires wt-install-addon - The install button of the source the app ships.
 */
@customElement('wt-settings-sources')
export class WtSettingsSources extends WtPanel {
  @property({ attribute: false }) accessor sources: SourceInfo[] = []
  @property({ type: Boolean }) accessor busy = false

  private entry(source: SourceInfo): TemplateResult {
    const tr = this.tr
    const name = tr.t(source.labelKey as TranslationKey)
    return html`<wt-entry
      ?off=${!source.enabled}
      .control=${html`<wt-checkbox
        kind=${CheckboxKind.Plain}
        ?checked=${source.enabled}
        ?disabled=${this.busy}
        control-tip=${name}
        @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-toggle-source', { id: source.id, enabled: event.detail })}
      ></wt-checkbox>`}
      label=${name}
      .badge=${html`<wt-chip
        icon=${source.addonInstalled ? 'check' : 'close'}
        label=${source.addonInstalled ? tr.t('settings.sources.addonFound') : tr.t('settings.sources.addonMissing')}
      ></wt-chip>`}
      .content=${html`${
          source.hasData
            ? html`<span class="muted tiny">
                ${source.addonVersion ? `${tr.t('settings.sources.addonVersion', { version: source.addonVersion })} · ` : nothing}${tr.plural(
                  'settings.sources.stats',
                  source.files.length,
                  {
                    characters: source.characterCount ?? '?',
                    count: source.files.length,
                    time: this.relativeTime(source.lastWriteAt)
                  }
                )}
              </span>`
            : html`<span class="faint tiny">${tr.t('settings.sources.noData')}</span>`
        }
        <p class="muted">${tr.t(source.descriptionKey as TranslationKey)}</p>
        <div class="chips">
          ${source.areas.map((area) => html`<wt-chip small icon=${areaOf(area).icon} label=${tr.t(areaOf(area).key)}></wt-chip>`)}
        </div>
        ${this.installer(source)} ${source.error ? html`<wt-notice tone=${Severity.Danger}>${source.error}</wt-notice>` : nothing}`}
    ></wt-entry>`
  }

  /**
   * The install button for the source whose addon the app includes. It
   * installs the addon when it is missing, updates it when the game has an
   * older version, and shows nothing when the versions are equal. Without a
   * WoW folder, there is no target, and a hint replaces the button.
   */
  private installer(source: SourceInfo): TemplateResult | typeof nothing {
    const tr = this.tr
    if (!source.bundledVersion) return nothing
    if (!source.canInstall) return html`<wt-hint text=${tr.t('settings.sources.installHint')}></wt-hint>`
    if (source.addonInstalled && source.addonVersion === source.bundledVersion) return nothing
    return html`<div class="row entry-action">
      <wt-button
        icon="download"
        tone=${ButtonRole.Primary}
        label=${
          source.addonInstalled
            ? tr.t('settings.sources.updateAddon', { version: source.bundledVersion })
            : tr.t('settings.sources.installAddon')
        }
        ?disabled=${this.busy}
        @click=${() => this.emit('wt-install-addon')}
      ></wt-button>
    </div>`
  }

  protected override willUpdate(): void {
    const tr = this.tr
    this.icon = 'plug'
    this.heading = tr.t('settings.sources.title')
    this.description = tr.t('settings.sources.body')
    this.content = html`
      ${this.sources.length === 0 ? html`<wt-panel-empty text=${tr.t('settings.sources.none')}></wt-panel-empty>` : nothing}
      ${this.sources.map((source) => this.entry(source))}
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-sources': WtSettingsSources
  }
}
