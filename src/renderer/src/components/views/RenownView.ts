import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot } from '../../../../shared/types'
import { seasonCatalog } from '../../../../shared/seasonCatalog'
import { renownGroups, type RenownGroup } from '../../model/dashboard'
import { WtElement } from '../../element'
import { memoLast } from '../../memo'
import { ButtonRole } from '../../enums/buttonRole'
import { ControlSize } from '../../enums/controlSize'
import { SettingsSection } from '../../enums/settingsSection'
import { FactionGroup } from '../../../../shared/enums/factionGroup'
import '../EmptyState'
import '../Icon'
import '../renown/RenownFigure'
import '../ui/Button'
import '../ui/DashPanel'
import { IconSize } from '../../enums/iconSize'

/**
 * The renown tab: the renown of the warband, in groups - the factions of
 * the season and the factions of the expansion, a panel each. Each faction
 * is a ring on a plate, filled to the next level or, after the maximum
 * level, to the next paragon reward. Renown is shared by all characters,
 * so it is a view of its own beside the roster rather than a panel under
 * it or a section of a character's page.
 *
 * @fires wt-open-settings - The factions the tab shows are picked under Views; the empty state's button leads to the setup, where the companion is installed.
 */
@customElement('wt-renown-view')
export class WtRenownView extends WtElement {
  /** The roster minus what the user hid; every character reports the same factions. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  /** The selected faction ids; empty shows the default set of the season. */
  @property({ attribute: false }) accessor trackedFactions: number[] = []

  private groupsOf = memoLast(renownGroups)

  private groupTitle(group: RenownGroup['group']): string {
    return group === FactionGroup.Season ? seasonCatalog().label : seasonCatalog().expansion
  }

  protected override willUpdate(): void {
    // An empty view is the empty state alone, without the view's own layout.
    this.hostClasses({ 'renown-view': this.groupsOf(this.tr, this.characters, this.trackedFactions).length > 0 })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const groups = this.groupsOf(tr, this.characters, this.trackedFactions)

    if (groups.length === 0) {
      return html`<wt-empty-state icon="medal" heading=${tr.t('renown.empty.title')}>
        <p>${tr.t('renown.empty.body')}</p>
        <div class="row">
          <wt-button
            icon="settings"
            tone=${ButtonRole.Primary}
            label=${tr.t('settings.sources.open')}
            @click=${() => this.emit('wt-open-settings', SettingsSection.Setup)}
          ></wt-button>
        </div>
      </wt-empty-state>`
    }

    return html`
      <div class="view-bar">
        <div class="view-title">
          <wt-icon name="medal" size=${IconSize.Md}></wt-icon>
          <h2>${tr.t('tab.renown')}</h2>
        </div>
        <wt-button
          class="view-bar-action"
          ghost
          size=${ControlSize.Sm}
          icon="settings"
          label=${tr.t('renown.pickFactions')}
          @click=${() => this.emit('wt-open-settings', SettingsSection.Appearance)}
        ></wt-button>
      </div>

      <div class="dash-row">
        ${groups.map(
          (group) =>
            html`<wt-dash-panel class="renown-panel" icon="medal" heading=${this.groupTitle(group.group)}>
              <div class="renown-grid">
                ${group.figures.map((faction) => html`<wt-renown-figure .figure=${faction}></wt-renown-figure>`)}
              </div>
            </wt-dash-panel>`
        )}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-renown-view': WtRenownView
  }
}
