import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { CharacterSnapshot } from '../../../../shared/types'
import { goldOf, whole } from '../../model/format'
import { accountsOf, NO_STATE, stateChip, type CharacterState } from '../../model/overview'
import { IconKind } from '../../../../shared/enums/iconKind'
import '../GameIcon'
import { WtCard } from '../ui/Card'
import { Region } from '../../../../shared/enums/region'
import { classColor, isClassToken } from '../../enums/classToken'
import { StatKind } from '../../enums/statKind'
import '../CharacterLinks'
import '../ClassMedallion'
import '../IdentityLine'
import '../MetaLine'
import '../ui/Chip'
import '../StatTile'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * The band at the top of the character page: who this is, where they were
 * last seen, the three figures a player compares, the key in the bag and the
 * places to look the character up. The host is the `.card.panel.detail-hero`.
 */
@customElement('wt-detail-hero')
export class WtDetailHero extends WtCard {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  @property({ attribute: false }) accessor state: CharacterState = NO_STATE
  /** Every weekly task cleared - the week's own tick, for the pill. */
  @property({ type: Boolean }) accessor done = false
  @property() accessor region: Region = Region.Eu
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false

  protected override willUpdate(): void {
    this.color = isClassToken(this.character.classToken) ? this.character.classToken : undefined
    super.willUpdate()
    this.hostClasses({ panel: true, 'detail-hero': true, stale: this.state.inactive })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { character, state } = this
    const color = classColor(character.classToken)
    const { levelling, inactive } = state
    const word = stateChip(tr, state, this.done, character.level)
    return html`
      <!-- The bust with its backdrop, as the host renders it, once it is there; the medallion until then. -->
      <div class="detail-portrait">
        <wt-class-medallion .character=${character} size="72"></wt-class-medallion>
        <wt-game-icon kind=${IconKind.Inset} ref=${character.key}></wt-game-icon>
      </div>
      <div class="detail-titles">
        <div class="detail-name-row">
          <h2 class="detail-name" style=${color ? styleMap({ color }) : nothing}>${character.name}</h2>
          ${word ? html`<wt-chip tone=${word.tone ?? nothing} icon=${word.icon ?? nothing} label=${word.label} data-tip=${word.tip ?? nothing}></wt-chip>` : nothing}
          ${
            this.showAccount
              ? accountsOf(character).map((account) => html`<wt-chip label=${account} data-tip=${tr.t('card.accountHint')}></wt-chip>`)
              : nothing
          }
        </div>
        <wt-identity-line
          class="detail-sub"
          .character=${character}
          .parts=${[character.realm, character.spec, character.className, tr.t('card.level', { level: character.level })]}
        ></wt-identity-line>
        <wt-meta-line
          class="detail-meta"
          .character=${character}
          detailed
          .lead=${html`<span data-tip=${tr.t('card.freshHint', { account: character.accountName })}>
            <wt-icon name=${inactive ? 'alert' : 'clock'} size=${IconSize.Sm}></wt-icon>${tr.t('detail.lastSeen', {
              time: this.relativeTime(character.weeklyUpdatedAt)
            })}
          </span>`}
        ></wt-meta-line>
      </div>
      <div class="detail-hero-side">
        <div class="detail-stats">
          <wt-stat-tile
            kind=${StatKind.Cell}
            icon="target"
            .label=${tr.t('card.itemLevel')}
            .value=${whole(tr, character.itemLevel)}
          ></wt-stat-tile>
          <wt-stat-tile
            kind=${StatKind.Cell}
            icon="keystone"
            .label=${tr.t('card.score')}
            .value=${whole(tr, character.mythicRating)}
          ></wt-stat-tile>
          <wt-stat-tile kind=${StatKind.Cell} icon="coins" .label=${tr.t('card.gold')} .value=${goldOf(tr, character.money)}></wt-stat-tile>
        </div>
        <div class="detail-hero-foot">
          ${
            !levelling
              ? html`<span
                  class=${`char-key${character.keystone ? '' : ' empty'}`}
                  data-tip=${
                    character.keystone
                      ? tr.t('card.keystone', {
                          name: character.keystone.name || tr.t('keystone.generic'),
                          level: character.keystone.level
                        })
                      : nothing
                  }
                >
                  <wt-icon name="keystone" size=${IconSize.Sm}></wt-icon>
                  ${
                    character.keystone
                      ? html`<span class="char-key-level">+${character.keystone.level}</span>
                          <span class="char-key-name">${character.keystone.name || tr.t('keystone.generic')}</span>`
                      : html`<span class="char-key-name">${tr.t('card.noKeystone')}</span>`
                  }
                </span>`
              : nothing
          }
          <wt-character-links .character=${character} region=${this.region} size="22"></wt-character-links>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-hero': WtDetailHero
  }
}
