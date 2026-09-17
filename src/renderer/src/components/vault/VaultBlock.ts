import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import type { CharacterSnapshot } from '../../../../shared/types'
import type { WeeklyProgress } from '../../model/overview'
import { WtElement } from '../../element'
import '../ui/Bar'
import '../Icon'
import './ClaimNote'
import './GapNote'
import './VaultRowLabel'
import './VaultSlot'

/**
 * The Great Vault, as the character page draws it: the heading with the count
 * and the bar, then the three rows of three tiles, each row saying what it is
 * still short of.
 */
@customElement('wt-vault-block')
export class WtVaultBlock extends WtElement {
  @property({ attribute: false }) accessor character!: CharacterSnapshot
  @property({ attribute: false }) accessor progress!: WeeklyProgress
  /** A reward from a finished week is still sitting in there. */
  @property({ type: Boolean }) accessor unclaimed = false

  protected override willUpdate(): void {
    this.hostClasses({ vault: true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { character, progress, unclaimed } = this
    return html`
      <div class="week-label">
        <!-- Rows left from last week are what is in the vault to be picked
             up, not progress towards the week ahead. -->
        <wt-icon name="vault"></wt-icon> ${tr.t(unclaimed && character.stale ? 'card.vaultLastWeek' : 'card.vault')}
        <span class="count">${progress.vaultUnlocked}/${progress.vaultTotal}</span>
        <wt-bar class="vault-bar" percent=${progress.ratio * 100}></wt-bar>
      </div>
      ${unclaimed && progress.vaultUnlocked === 0 ? html`<wt-claim-note></wt-claim-note>` : nothing}
      ${progress.vault.map((row) => {
        const counted = progress.vaultRows.some((entry) => entry.category === row.category)
        const gap = progress.gaps.find((entry) => entry.category === row.category)
        return html`<div class=${classMap({ 'vault-row': true, off: !counted })}>
          <div class="vault-row-head">
            <wt-vault-row-label class="vault-row-label" .row=${row} with-icon></wt-vault-row-label>
            <!-- Every row that is not finished says what it is still short
                 of - an untouched row most of all, because that is where the
                 whole week is still sitting. -->
            ${
              gap && !character.stale
                ? html`<wt-gap-note class="vault-note" category=${row.category} missing=${gap.missing}></wt-gap-note>`
                : nothing
            }
          </div>
          <div class="vault-slots">
            ${row.slots.map((slot) => html`<wt-vault-slot .vaultSlot=${slot} category=${row.category}></wt-vault-slot>`)}
          </div>
        </div>`
      })}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-vault-block': WtVaultBlock
  }
}
