import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot } from '../../../../shared/types'
import { seasonCatalog } from '../../../../shared/seasonCatalog'
import { seasonSupplies, supplyIconId, supplyNames, withMinimum } from '../../../../shared/supplies'
import { supplyLabel } from '../../model/labels'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { InputWidth } from '../../enums/inputWidth'
import { IconKind } from '../../../../shared/enums/iconKind'
import { WowheadKind, wowheadUrl } from '../../enums/wowheadKind'
import '../GameIcon'
import '../ui/ExtLink'
import '../ui/Input'
import '../ui/Table'
import '../ui/FieldGroup'
import '../ui/Hint'
import '../ui/PanelEmpty'
import '../ui/Row'
import '../ui/Cell'

/**
 * The season's consumables and how many of each a character wants: one
 * field a group, the catalog's figure as its placeholder and the player's
 * own over it. An own figure of zero takes the group off the list; an
 * empty field gives it back to the catalog. The items that count are
 * named, not numbered: the bag's name where a character carries one,
 * else Wowhead's.
 *
 * @fires wt-config - The player's minimums, by group id.
 */
@customElement('wt-settings-supplies')
export class WtSettingsSupplies extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  /** The roster: a bag that holds an item names it in the client's language. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []

  private set(id: string, text: string): void {
    const value = text.trim() === '' ? null : Number(text)
    this.emit('wt-config', { supplyMinimums: withMinimum(this.config.supplyMinimums, id, value) })
  }

  protected override willUpdate(): void {
    const tr = this.tr
    const groups = seasonSupplies()
    const minimums = this.config.supplyMinimums ?? {}
    this.icon = 'bag'
    this.heading = tr.t('settings.supplies.title')
    this.description = tr.t('settings.supplies.body', { season: seasonCatalog().label })
    this.content =
      groups.length === 0
        ? html`<wt-panel-empty text=${tr.t('settings.supplies.none')}></wt-panel-empty>`
        : html`<wt-table
              .columns=${[{ label: tr.t('settings.supplies.group') }, { label: tr.t('settings.supplies.figure'), className: 'col-id' }]}
            >
              ${groups.map(
                (group) =>
                  html`<wt-row>
                    <!-- The items that count, each the way to its page with the game's tooltip on it; one a bag holds carries the group's icon. -->
                    <wt-cell>
                      <wt-game-icon
                        class="detail-row-icon"
                        kind=${IconKind.Item}
                        ref=${supplyIconId(group, this.characters)}
                        size="16"
                      ></wt-game-icon
                      >${supplyLabel(tr, group)}
                      <div class="faint tiny supply-items">
                        ${supplyNames(group, this.characters).map(
                          (line) =>
                            html`<wt-ext-link
                              class="ext-link"
                              href=${wowheadUrl(WowheadKind.Item, line.ids[0]!, tr.locale)}
                              site="Wowhead"
                              label=${line.name}
                              wowhead=${`item=${line.ids[0]}`}
                            ></wt-ext-link>`
                        )}
                      </div>
                    </wt-cell>
                    <wt-cell>
                      <wt-input
                        width=${InputWidth.Tiny}
                        digits
                        placeholder=${tr.formatNumber(group.need)}
                        control-tip=${tr.t('settings.supplies.ownHint')}
                        .value=${minimums[group.id] !== undefined ? String(minimums[group.id]) : ''}
                        @wt-input=${(event: WtEvent<'wt-input'>) => this.set(group.id, event.detail)}
                      ></wt-input>
                    </wt-cell>
                  </wt-row>`
              )}
            </wt-table>
            <wt-hint text=${tr.t('settings.supplies.hint')}></wt-hint>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-supplies': WtSettingsSupplies
  }
}
