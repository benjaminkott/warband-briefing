import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { RosterRow } from '../../model/dashboard'
import { WtElement } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import '../ui/Format'

/**
 * The vault count as "7 / 9", the total in quieter type, or a dash for a
 * character without a vault. The tile's figure row and its to-do line both
 * carry it, so the two read alike.
 */
@customElement('wt-vault-count')
export class WtVaultCount extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property({ attribute: false }) accessor row!: RosterRow

  protected override render(): TemplateResult {
    const row = this.row
    // No rows in the focus: no count to give, the way a levelling character has none.
    if (row.levelling || row.vaultTotal === 0) return html`<wt-format class="faint"></wt-format>`
    return html`<wt-format .value=${row.vaultUnlocked}></wt-format
      ><span class="stat-of">/ <wt-format .value=${row.vaultTotal}></wt-format></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-vault-count': WtVaultCount
  }
}
