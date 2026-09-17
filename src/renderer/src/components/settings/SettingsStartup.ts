import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig } from '../../../../shared/types'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { CloseAction } from '../../../../shared/enums/closeAction'
import '../ui/Select'
import '../ui/Checkbox'
import '../ui/FieldGroup'
import '../ui/Hint'

/**
 * How the app starts and how it ends: with the login or only by hand, and
 * whether the close button quits or hides the window behind a tray icon. The
 * main process holds both (`autostart.ts`, `tray.ts`).
 *
 * @fires wt-config - The login item switch, or the close action.
 */
@customElement('wt-settings-startup')
export class WtSettingsStartup extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig

  protected override willUpdate(): void {
    const tr = this.tr
    this.icon = 'plug'
    this.heading = tr.t('settings.startup.title')
    this.content = html`
      <wt-field-group icon="monitor" label=${tr.t('settings.startup.login')}>
        <!-- The host is display: contents, so the quiet look on it reaches the label. -->
        <wt-checkbox
          class="muted tiny"
          control-id="auto-start"
          ?checked=${this.config.autoStart}
          label=${tr.t('settings.startup.loginHint')}
          @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { autoStart: event.detail })}
        ></wt-checkbox>
      </wt-field-group>
      <wt-field-group icon="close" label=${tr.t('settings.startup.close')}>
        <wt-select
          control-id="on-close"
          .value=${this.config.onClose}
          .options=${[
            { value: CloseAction.Quit, label: tr.t('settings.startup.closeQuit') },
            { value: CloseAction.Background, label: tr.t('settings.startup.closeBackground') }
          ]}
          @wt-change=${(event: WtEvent<'wt-change'>) => this.emit('wt-config', { onClose: event.detail as CloseAction })}
        ></wt-select>
      </wt-field-group>
      <wt-hint text=${tr.t('settings.startup.closeHint')}></wt-hint>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-startup': WtSettingsStartup
  }
}
