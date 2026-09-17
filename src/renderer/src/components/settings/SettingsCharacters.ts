import { html, nothing } from 'lit'
import { multiRealm } from '../../model/overview'
import { customElement, property } from 'lit/decorators.js'
import type { AppConfig, CharacterSnapshot } from '../../../../shared/types'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { CheckboxKind } from '../../enums/checkboxKind'
import '../ClassMedallion'
import '../ui/Checkbox'
import './ToggleRow'
import './ToggleList'

/**
 * Which characters are on the overview at all. A character off the
 * overview is off the board and the list too.
 *
 * @fires wt-toggle-character - One character on or off the roster.
 * @fires wt-config - The whole column at once.
 */
@customElement('wt-settings-characters')
export class WtSettingsCharacters extends WtPanel {
  @property({ attribute: false }) accessor config!: AppConfig
  /** The whole roster, so characters can be taken off it here. */
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  @property({ attribute: false }) accessor hiddenKeys: Set<string> = new Set()

  protected override willUpdate(): void {
    const tr = this.tr
    const { characters, hiddenKeys } = this
    const showRealm = multiRealm(characters)
    // How the column stands, for the column-wide switch above it.
    const shownCount = characters.filter((c) => !hiddenKeys.has(c.key)).length
    const everyKey = characters.map((c) => c.key)

    this.icon = 'users'
    this.heading = tr.t('settings.characters.title')
    this.description = tr.t('settings.characters.body')
    this.content =
      characters.length === 0
        ? html`<p class="faint">${tr.t('settings.characters.none')}</p>`
        : html`
            <!-- The column head is a switch for the whole column: one tick
                 puts everyone on the roster, one untick takes everyone off. A
                 half-set column shows the indeterminate mark. -->
            <wt-toggle-row
              head
              .label=${html`<span class="faint tiny">${tr.t('settings.characters.all')}</span>`}
              .content=${html`<wt-checkbox
                  kind=${CheckboxKind.CharSwitch}
                  label=${tr.t('settings.characters.overview')}
                  ?checked=${shownCount === characters.length}
                  ?indeterminate=${shownCount > 0 && shownCount < characters.length}
                  @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { hiddenKeys: event.detail ? [] : everyKey })}
                ></wt-checkbox>`}
            ></wt-toggle-row>
            <wt-toggle-list
              .content=${[...characters]
                .sort((a, b) => tr.compare(a.name, b.name))
                .map((character) => {
                  const hidden = hiddenKeys.has(character.key)
                  return html`<wt-toggle-row
                    ?off=${hidden}
                    .mark=${html`<wt-class-medallion .character=${character} size="24"></wt-class-medallion>`}
                    .label=${html`${character.name}${
                      showRealm
                        ? // On a single-realm roster the realm is the same
                          // word on every row - noise.
                          html`<span class="faint tiny"> · ${character.realm}</span>`
                        : nothing
                    }`}
                    .content=${html`<wt-checkbox
                        kind=${CheckboxKind.CharSwitch}
                        label=${tr.t('settings.characters.overview')}
                        ?checked=${!hidden}
                        @wt-check=${() => this.emit('wt-toggle-character', { key: character.key, hidden: !hidden })}
                      ></wt-checkbox>`}
                  ></wt-toggle-row>`
                })}
            ></wt-toggle-list>
          `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-characters': WtSettingsCharacters
  }
}
