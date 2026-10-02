import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { classMap } from 'lit/directives/class-map.js'
import { ratingColor, ratingStyle, type RosterRow } from '../../model/dashboard'
import { nextStep, type NextStep } from '../../model/plan'
import { tokenFigures } from '../../model/overview'
import { IconKind } from '../../../../shared/enums/iconKind'
import { WtButton } from '../ui/Button'
import { goalRing, rosterClasses, vaultRing } from './model'
import { classColor } from '../../enums/classToken'
import { FormatKind } from '../../enums/formatKind'
import './VaultCount'
import '../ClassMedallion'
import '../ui/Format'
import '../ui/Ring'
import '../Icon'
import '../StepNote'
import '../Keystone'
import '../GameIcon'

/**
 * One character on the board - a button of the whole thing.
 *
 * The vault is the ring and the class is what the ring is drawn around, so the
 * two questions the roster is scanned for - who is this, and how far along are
 * they - are answered by the shape alone, before a single figure is read. The
 * numbers are the ones a player compares between characters; the step is the
 * one thing left to do, at the foot. The season's tokens sit in the corner,
 * as on the card: counts, not figures.
 *
 * @fires wt-open-character - A click, with the character's key.
 */
@customElement('wt-character-tile')
export class WtCharacterTile extends WtButton {
  @property({ attribute: false }) accessor row!: RosterRow
  /** Whether the realm is worth a word; on a single-realm roster it is noise. */
  @property({ type: Boolean, attribute: 'show-realm' }) accessor showRealm = false

  constructor() {
    super()
    this.addEventListener('click', () => this.emit('wt-open-character', this.row.character.key))
  }

  protected override buttonClasses(): Array<string | false | undefined> {
    return ['card', 'card-link', rosterClasses('tile', this.row)]
  }

  protected override willUpdate(): void {
    const tr = this.tr
    const row = this.row
    const step = nextStep(row.character, row.progress, row.levelling, tr, row.flags, row.dungeons)
    // No tooltip of its own: the whole tile is the way in, which the pointer
    // already says, and a bubble over it only covers the arcs it sits on.
    // The host is `contents`, so the variable reaches the button inside. The
    // edge of the card lights up in the class colour on hover.
    this.hostVar('--class-color', classColor(row.character.classToken))
    this.label = this.asTile(step)
  }

  private asTile(step: NextStep): TemplateResult {
    const tr = this.tr
    const { character } = this.row
    const color = classColor(character.classToken)
    // A character still levelling holds none worth a count: its corners stay empty.
    const tokens = this.row.levelling ? [] : tokenFigures(tr, character, false)
    return html`${
        tokens.length > 0
          ? html`<span class="tile-tokens">
              ${tokens.map(
                (token) => html`<span class=${classMap({ 'tile-token': true, empty: !token.amount })} data-tip=${token.tip}>
                  <wt-game-icon kind=${IconKind.Currency} ref=${token.id} size="var(--icon-sm)"></wt-game-icon>
                  <wt-format kind=${FormatKind.Number} .value=${token.amount}></wt-format>
                </span>`
              )}
            </span>`
          : nothing
      }
      <!-- The three rows inside, the line the player drew around them: a
           closed outer ring is the one shape that says "what I asked for is
           done" before a figure is read. The medallion is sized to leave the
           arcs the same air they leave the outer ring, so the three spaces
           of the drawing are one. -->
      <wt-ring .groups=${vaultRing(tr, this.row.vault, this.row.rewards)} .outer=${goalRing(tr, this.row)} size="120">
        <wt-class-medallion .character=${character} size="54"></wt-class-medallion>
      </wt-ring>

      <span class="tile-name" style=${color ? styleMap({ color }) : nothing}>${character.name}</span>

      ${this.showRealm ? html`<span class="tile-realm">${character.realm}</span>` : nothing}

      <span class="tile-vault num"><wt-vault-count .row=${this.row}></wt-vault-count></span>

      <span class="tile-figures num"
        ><wt-format kind=${FormatKind.Whole} .value=${character.itemLevel} data-tip=${tr.t('card.itemLevel')}></wt-format
        ><span class="tile-sep">·</span
        ><wt-format
          kind=${FormatKind.Whole}
          class="rated"
          .value=${character.mythicRating}
          style=${styleMap(ratingStyle(ratingColor(character.mythicRating)) ?? {})}
          data-tip=${tr.t('card.score')}
        ></wt-format
        >${
          character.keystone
            ? // The dungeon rides along with the level: a tile that only says
              // "+12" answers how high, not what - and what is what decides
              // whether the key gets run tonight.
              html`<span class="tile-sep">·</span><wt-keystone class="tile-key" .keystone=${character.keystone}></wt-keystone>`
            : nothing
        }</span
      >

      <wt-step-note class="tile-step" .step=${step}></wt-step-note>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-character-tile': WtCharacterTile
  }
}
