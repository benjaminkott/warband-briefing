import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig } from '../../../../shared/types'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { Region } from '../../../../shared/enums/region'
import '../ui/Select'
import '../ui/Button'
import '../ui/FieldGroup'
import '../ui/Input'
import '../ui/Hint'

const REGIONS: Region[] = [Region.Eu, Region.Us, Region.Kr, Region.Tw]

/**
 * Where World of Warcraft is installed, and the region the reset
 * countdown follows before any addon data says otherwise.
 *
 * @fires wt-config - The folder as typed, or the region picked.
 * @fires wt-choose-wow-path - The folder picker.
 */
@customElement('wt-settings-install')
export class WtSettingsInstall extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  @property({ type: Boolean }) accessor busy = false

  protected override willUpdate(): void {
    const tr = this.tr
    const config = this.config
    this.icon = 'folder'
    this.heading = tr.t('settings.install.title')
    this.description = tr.t('settings.install.body')
    this.content = html`
      <wt-field-group icon="folder" label=${tr.t('settings.install.folder')}>
        <wt-input
          control-id="wow-path"
          code
          .value=${config.wowPath ?? ''}
          placeholder=${tr.t('settings.install.folderPlaceholder')}
          @wt-input=${(event: WtEvent<'wt-input'>) => this.emit('wt-config', { wowPath: event.detail || null })}
        ></wt-input>
      </wt-field-group>
      <div class="row">
        <wt-button
          icon="folder"
          label=${tr.t('settings.install.choose')}
          ?disabled=${this.busy}
          @click=${() => this.emit('wt-choose-wow-path')}
        ></wt-button>
        <div class="spacer"></div>
        <wt-field-group icon="globe" label=${tr.t('settings.install.region')} narrow>
          <wt-select
            control-id="region"
            .value=${config.region}
            .options=${REGIONS.map((r) => ({ value: r, label: r.toUpperCase() }))}
            @wt-change=${(event: WtEvent<'wt-change'>) => this.emit('wt-config', { region: event.detail as Region })}
          ></wt-select>
        </wt-field-group>
      </div>
      <wt-hint text=${tr.t('settings.install.regionHint')}></wt-hint>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-install': WtSettingsInstall
  }
}
