import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { VaultSlot } from '../../../../shared/types'
import { VAULT_REQ_KEYS } from '../../model/labels'
import { WtElement } from '../../element'
import { slotHint, slotLevelText } from './model'
import { VaultCategory } from '../../../../shared/enums/vaultCategory'
import { BarKind } from '../../enums/barKind'
import '../ui/Bar'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * A slot tile, laid out like the Great Vault itself: what the slot asks for at
 * the top, the reward at the foot, and a bar underneath that fills as the row
 * progresses. Every tile is the same size whatever it has to say, so the nine
 * of them stay a grid and the block is identical on every card. What the
 * slot asks for, where the row stands against that, and the reward by name
 * where the companion addon knows it are the tooltip.
 */
@customElement('wt-vault-slot')
export class WtVaultSlot extends WtElement {
  @property({ attribute: false }) accessor vaultSlot!: VaultSlot
  @property() accessor category: VaultCategory = VaultCategory.Raid

  protected override willUpdate(): void {
    this.hostClasses({ slot: true, unlocked: this.vaultSlot.unlocked })
    this.hostTip(slotHint(this.tr, this.vaultSlot, this.category))
  }

  /** The reward track of an unlocked slot - "+12", "Heroic", "Tier 3". */
  private get levelText(): string {
    return slotLevelText(this.tr, this.vaultSlot, this.category)
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { vaultSlot: slot, category, levelText } = this
    const requirement = tr.plural(VAULT_REQ_KEYS[category], slot.threshold)
    const fill = slot.unlocked ? 1 : Math.min(slot.progress / slot.threshold, 1)
    return html`
      <div class="slot-req"><wt-icon name=${slot.unlocked ? 'check' : 'lock'} size=${IconSize.Xs}></wt-icon>${requirement}</div>
      ${
        slot.unlocked
          ? html`<div class="slot-main">
              ${slot.rewardItemLevel ? slot.rewardItemLevel : levelText}${
                slot.rewardItemLevel ? html`<span class="slot-track">(${levelText})</span>` : nothing
              }
            </div>`
          : html`<div class="slot-main faint">${slot.progress}/${slot.threshold}</div>`
      }
      <wt-bar kind=${BarKind.Slot} percent=${fill * 100}></wt-bar>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-vault-slot': WtVaultSlot
  }
}
