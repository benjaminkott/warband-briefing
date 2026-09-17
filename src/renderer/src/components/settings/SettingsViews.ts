import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig } from '../../../../shared/types'
import { BLOCK_FLAGS, KPI_FLAGS, displayFlags, type DisplayFlag } from '../../../../shared/display'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { withFlag } from './model'
import { ControlSize } from '../../enums/controlSize'
import '../ui/Button'
import '../ui/Checkbox'
import '../ui/CheckGrid'
import '../ui/Group'

/**
 * Which blocks the views draw, one switch for each, and which figures the
 * roster's head row carries.
 *
 * @fires wt-config - A flag, or the reset of every flag.
 */
@customElement('wt-settings-views')
export class WtSettingsViews extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig

  protected override willUpdate(): void {
    const tr = this.tr
    const config = this.config
    this.icon = 'eye'
    this.heading = tr.t('settings.views.title')
    this.description = tr.t('settings.views.body')
    this.content = html`
      ${this.grid(BLOCK_FLAGS)}
      <wt-group heading=${tr.t('settings.views.kpi')}>${this.grid(KPI_FLAGS)}</wt-group>
      ${
        Object.keys(config.display ?? {}).length > 0
          ? html`<wt-button
              icon="refresh"
              label=${tr.t('settings.views.reset')}
              ghost
              size=${ControlSize.Sm}
              @click=${() => this.emit('wt-config', { display: {} })}
            ></wt-button>`
          : nothing
      }
    `
    super.willUpdate()
  }

  /** The switches, one box each; a change goes up as the config's display. */
  private grid(list: readonly DisplayFlag[]): TemplateResult {
    const tr = this.tr
    const flags = displayFlags(this.config)
    return html`<wt-check-grid>
      ${list.map(
        (flag) =>
          html`<wt-checkbox
            ?checked=${flags[flag]}
            .label=${html`<span class="input-grow">${tr.t(`display.flag.${flag}`)}</span>`}
            @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { display: withFlag(this.config.display, flag, event.detail) })}
          ></wt-checkbox>`
      )}
    </wt-check-grid>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-views': WtSettingsViews
  }
}
