import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'
import { ratingColor, ratingStyle, type RosterRow } from '../../model/dashboard'
import { nextStep, type NextStep } from '../../model/plan'
import { WtButton } from '../ui/Button'
import { rosterClasses, vaultRing } from './model'
import { classColor } from '../../enums/classToken'
import { FormatKind } from '../../enums/formatKind'
import './VaultCount'
import '../ClassMedallion'
import '../ui/Format'
import '../ui/Ring'
import '../Icon'
import '../StepNote'
import '../Keystone'

/**
 * One character on the board - a button of the whole thing.
 *
 * The vault is the ring and the class is what the ring is drawn around, so the
 * two questions the roster is scanned for - who is this, and how far along are
 * they - are answered by the shape alone, before a single figure is read. The
 * numbers are the ones a player compares between characters; the step is the
 * one thing left to do, at the foot.
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
    this.hostTip(tr.t('dash.openCharacter'))
    // The host is `contents`, so the variable reaches the button inside. The
    // edge of the card lights up in the class colour on hover.
    this.hostVar('--class-color', classColor(row.character.classToken))
    this.label = this.asTile(step)
  }

  private asTile(step: NextStep): TemplateResult {
    const tr = this.tr
    const { character } = this.row
    const color = classColor(character.classToken)
    return html`<wt-ring .groups=${vaultRing(tr, this.row.vault)} size="96">
        <wt-class-medallion .character=${character} size="54"></wt-class-medallion>
      </wt-ring>

      <span class="tile-name" style=${color ? styleMap({ color }) : nothing}>${character.name}</span>

      ${this.showRealm ? html`<span class="tile-realm faint">${character.realm}</span>` : nothing}

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
