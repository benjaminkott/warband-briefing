import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig } from '../../../../shared/types'
import { seasonCatalog, defaultTrackedCurrencies } from '../../../../shared/seasonCatalog'
import { WtPanel } from '../ui/Panel'
import { toggledCurrency } from './model'
import { ControlSize } from '../../enums/controlSize'
import { WowheadKind, wowheadUrl } from '../../enums/wowheadKind'
import { IconKind } from '../../../../shared/enums/iconKind'
import '../GameIcon'
import '../ui/Button'
import '../ui/Checkbox'
import '../ui/FieldGroup'
import '../ui/Group'
import '../ui/ExtLink'
import '../ui/CheckGrid'
import '../ui/Hint'

/**
 * Which of the season's currencies the cards show, whether or not
 * they carry a weekly cap.
 *
 * @fires wt-config - The tracked currencies.
 */
@customElement('wt-settings-currencies')
export class WtSettingsCurrencies extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig

  protected override willUpdate(): void {
    const tr = this.tr
    const tracked = this.config.trackedCurrencies
    this.icon = 'coins'
    this.heading = tr.t('settings.currencies.title')
    this.description = tr.t('settings.currencies.body', { season: seasonCatalog().label })
    this.content = html`
      <wt-group>
        <wt-button
          slot="action"
          ghost
          size=${ControlSize.Sm}
          icon="refresh"
          label=${tr.t('settings.reset')}
          data-tip=${tr.t('settings.resetHint', { season: seasonCatalog().label })}
          @click=${() => this.emit('wt-config', { trackedCurrencies: defaultTrackedCurrencies() })}
        ></wt-button>
        <wt-check-grid>
          ${seasonCatalog().currencies.map(
            (currency) =>
              html`<wt-checkbox
                ?checked=${tracked.includes(currency.id)}
                .label=${html`<wt-game-icon kind=${IconKind.Currency} ref=${currency.id} size="16"></wt-game-icon
                  ><span class="input-grow">${currency.name}</span>
                  <!-- The id doubles as the way to look the currency up; the
                     click stays on the link and does not toggle the row. -->
                  <wt-ext-link
                    class="faint tiny ext-link"
                    href=${wowheadUrl(WowheadKind.Currency, currency.id)}
                    site="Wowhead"
                    label=${String(currency.id)}
                    mark
                  ></wt-ext-link>`}
                @wt-check=${() => this.emit('wt-config', { trackedCurrencies: toggledCurrency(tracked, currency.id) })}
              ></wt-checkbox>`
          )}
        </wt-check-grid>
      </wt-group>
      <wt-hint text=${tr.t('settings.currencies.hint')}></wt-hint>
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-currencies': WtSettingsCurrencies
  }
}
