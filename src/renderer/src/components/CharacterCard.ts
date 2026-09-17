import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import type { CharacterPoint, CharacterSnapshot, Goal, SeasonDungeon } from '../../../shared/types'
import { DISPLAY_DEFAULTS, TREND_DAYS, type DisplayFlags } from '../../../shared/display'
import { WtCard } from './ui/Card'
import { cardModel, type CardModel } from './card/model'
import { accountsOf, stateChip } from '../model/overview'
import { ratingColor, ratingStyle } from '../model/dashboard'
import { isClassToken, classColor } from '../enums/classToken'
import { ControlSize } from '../enums/controlSize'
import { Tint } from '../enums/tint'
import { FormatKind } from '../enums/formatKind'
import './ui/Button'
import './ClassMedallion'
import './IdentityLine'
import './ui/Chip'
import './ui/Format'
import './card/CardFigure'
import './GameIcon'
import './StepNote'
import './Keystone'
import { IconSize } from '../enums/iconSize'
import { IconKind } from '../../../shared/enums/iconKind'

/**
 * One character as a row of the roster: who, the figures a player
 * compares, and the one thing left to do. The whole band opens the
 * character's page, which has the week in full; the card has no body of
 * its own. What the card says is worked out in `card/model.ts`.
 *
 * @fires wt-open-character - The band, the name or the chevron, with the character's key.
 */
@customElement('wt-character-card')
export class WtCharacterCard extends WtCard {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  /** Taken off the roster in the settings; drawn dimmed where it still shows. */
  @property({ type: Boolean, attribute: 'hidden-char' }) accessor hiddenChar = false
  /** Item level and rating readings of this character, oldest first. */
  @property({ attribute: false }) accessor history: CharacterPoint[] | undefined = undefined
  /** Whether the trends under the figures are drawn. */
  @property({ attribute: false }) accessor flags: DisplayFlags = DISPLAY_DEFAULTS
  /** How many days the trend under the figures covers. */
  /** Level cap of the roster; below it there are no weekly tasks. */
  @property({ type: Number, attribute: 'max-level' }) accessor maxLevel = 0
  /** Start of the current week, which is what "not played yet" is measured from. */
  @property({ type: Number, attribute: 'reset-at' }) accessor resetAt = 0
  /** The user's weekly targets, measured against this character. */
  @property({ attribute: false }) accessor goals: Goal[] = []
  /** The season's dungeons, so the step can name the one never run. */
  @property({ attribute: false }) accessor dungeons: SeasonDungeon[] = []
  /** Only worth the space once a second WTF account is in play. */
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false

  /** Worked out once per update, in `willUpdate`, for the host's classes and the template alike. */
  private model!: CardModel

  constructor() {
    super()
    // The band itself is the way in; the name inside stops its own click.
    this.addEventListener('click', () => this.emit('wt-open-character', this.character.key))
  }

  protected override willUpdate(): void {
    this.model = cardModel(this.tr, {
      character: this.character,
      flags: this.flags,
      goals: this.goals,
      maxLevel: this.maxLevel,
      resetAt: this.resetAt,
      history: this.history,
      dungeons: this.dungeons,
      now: this.clock
    })
    const { progress, state } = this.model
    this.link = true
    this.color = isClassToken(this.character.classToken) ? this.character.classToken : undefined
    super.willUpdate()
    this.hostTip(this.tr.t('detail.open'))
    this.hostClasses({
      'char-card': true,
      'hidden-char': this.hiddenChar,
      stale: state.inactive,
      claim: state.unclaimed,
      levelling: state.levelling,
      'week-done': progress.done
    })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { character, model } = this
    const { progress, state, step, token } = model
    const { levelling, inactive } = state
    const word = stateChip(tr, state, progress.done, character.level)

    return html`
      <wt-class-medallion .character=${character} size="48"></wt-class-medallion>

      <div class="card-titles">
        <div class="card-name-row">
          <wt-button
            class="char-open card-name"
            label=${character.name}
            style=${styleMap({ color: classColor(character.classToken) ?? '' })}
            @click=${(event: Event) => {
              event.stopPropagation()
              this.emit('wt-open-character', character.key)
            }}
          ></wt-button>
          ${word ? html`<wt-chip tone=${word.tone ?? nothing} icon=${word.icon ?? nothing} label=${word.label} data-tip=${word.tip ?? nothing}></wt-chip>` : nothing}
        </div>
        <wt-identity-line
          class="card-sub"
          .character=${character}
          .parts=${[character.spec, character.className, character.realm]}
          .extra=${[
            html`<span data-tip=${inactive ? tr.t('card.staleHint') : tr.t('card.freshHint', { account: character.accountName })}
              ><wt-format kind=${FormatKind.Relative} .value=${character.weeklyUpdatedAt}></wt-format
            ></span>`,
            ...(this.showAccount
              ? accountsOf(character).map((account) => html`<wt-chip label=${account} data-tip=${tr.t('card.accountHint')}></wt-chip>`)
              : [])
          ]}
        ></wt-identity-line>
      </div>

      <div class="card-figures">
        <wt-card-figure
          .value=${character.itemLevel}
          unit=${tr.t('card.itemLevel')}
          .series=${model.ilvlTrend}
          tone=${Tint.Accent}
          days=${TREND_DAYS}
        ></wt-card-figure>
        <wt-card-figure
          .value=${html`<wt-format
            kind=${FormatKind.Whole}
            class="rated"
            .value=${character.mythicRating}
            style=${styleMap(ratingStyle(ratingColor(character.mythicRating)) ?? {})}
          ></wt-format>`}
          unit=${tr.t('card.score')}
          .series=${model.ratingTrend}
          tone=${Tint.Key}
          days=${TREND_DAYS}
        ></wt-card-figure>
        <wt-card-figure
          .value=${html`<wt-keystone class="card-key" .keystone=${character.keystone}></wt-keystone>`}
          unit=${tr.t('table.key')}
        ></wt-card-figure>
        <wt-card-figure
          kind=${FormatKind.Number}
          .value=${levelling || progress.vaultTotal === 0 ? null : progress.vaultUnlocked}
          .of=${levelling || progress.vaultTotal === 0 ? undefined : progress.vaultTotal}
          unit=${tr.t('table.vault')}
        ></wt-card-figure>
      </div>

      <!-- The season's token in the corner: a count, not a figure - none in
           the bag is a 0, not a dash - so it stands apart from the four the
           player compares. -->
      ${
        token
          ? html`<span class="card-token" data-tip=${`${token.tip} · ${token.label}`}>
              <wt-game-icon kind=${IconKind.Currency} ref=${token.id} size="var(--icon-md)"></wt-game-icon>
              <wt-format kind=${FormatKind.Number} .value=${token.amount}></wt-format>
            </span>`
          : nothing
      }

      <!-- The errand, in the same words the board and the plan use. -->
      ${!levelling ? html`<wt-step-note class="card-step" .step=${step} size=${IconSize.Sm}></wt-step-note>` : nothing}

      <wt-button icon="chevronRight" icon-only size=${ControlSize.Sm}></wt-button>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-character-card': WtCharacterCard
  }
}
