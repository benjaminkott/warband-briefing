import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot } from '../../../../shared/types'
import { seasonCatalog, defaultTrackedFactions } from '../../../../shared/seasonCatalog'
import { knownFactions } from '../../model/dashboard'
import { WtPanel } from '../ui/Panel'
import '../ui/DashPanel'
import { factionLists, toggledCurrency } from './model'
import { FactionGroup } from '../../../../shared/enums/factionGroup'
import { ControlSize } from '../../enums/controlSize'
import { WowheadKind, wowheadUrl } from '../../enums/wowheadKind'
import '../ui/Checkbox'
import '../ui/FieldGroup'
import '../ui/Group'
import '../ui/Button'
import '../ui/ExtLink'
import '../ui/CheckGrid'
import '../ui/Hint'
import '../ui/PanelEmpty'

/**
 * Which factions the board shows, in groups: the season's and the
 * expansion's. The catalog names them; the roster adds the names from the
 * game.
 *
 * @fires wt-config - The tracked factions.
 */
@customElement('wt-settings-factions')
export class WtSettingsFactions extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []

  protected override willUpdate(): void {
    const tr = this.tr
    const tracked = this.config.trackedFactions ?? []
    const lists = factionLists(knownFactions(this.characters))
    const reset = html`<wt-button
      slot="action"
      ghost
      size=${ControlSize.Sm}
      icon="refresh"
      label=${tr.t('settings.reset')}
      data-tip=${tr.t('settings.resetHint', { season: seasonCatalog().label })}
      @click=${() => this.emit('wt-config', { trackedFactions: defaultTrackedFactions() })}
    ></wt-button>`
    this.icon = 'medal'
    this.heading = tr.t('settings.factions.title')
    this.description = tr.t('settings.factions.body', { season: seasonCatalog().label })
    this.content = html`
      ${
        lists.length === 0
          ? html`<wt-group>
              ${reset}
              <wt-panel-empty text=${tr.t('settings.factions.none')}></wt-panel-empty>
            </wt-group>`
          : lists.map(
              (list, index) =>
                html`<wt-group
                  heading=${list.group === FactionGroup.Season ? tr.t('settings.factions.season') : seasonCatalog().expansion}
                  note=${list.group === FactionGroup.Season ? seasonCatalog().label : tr.t('settings.factions.expansionHint')}
                >
                  ${index === 0 ? reset : nothing}
                  <wt-check-grid>
                    ${list.factions.map(
                      ({ id, name }) =>
                        html`<wt-checkbox
                          ?checked=${tracked.includes(id)}
                          .label=${html`<span class="input-grow">${name}</span>
                            <wt-ext-link
                              class="faint tiny ext-link"
                              href=${wowheadUrl(WowheadKind.Faction, id)}
                              site="Wowhead"
                              label=${String(id)}
                              mark
                            ></wt-ext-link>`}
                          @wt-check=${() => this.emit('wt-config', { trackedFactions: toggledCurrency(tracked, id) })}
                        ></wt-checkbox>`
                    )}
                  </wt-check-grid>
                </wt-group>`
            )
      }
      ${tracked.length === 0 ? html`<wt-hint text=${tr.t('settings.factions.allHint')}></wt-hint>` : nothing}
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-factions': WtSettingsFactions
  }
}
