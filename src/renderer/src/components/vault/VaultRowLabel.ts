import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { VaultRow } from '../../../../shared/types'
import { VAULT_LABEL_KEYS, VAULT_ROW_ICONS } from '../../model/labels'
import { WtElement } from '../../element'
import { VaultCategory } from '../../../../shared/enums/vaultCategory'
import { HostDisplay } from '../../enums/hostDisplay'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/** The row's name, with the mark that says the row was derived rather than read. */
@customElement('wt-vault-row-label')
export class WtVaultRowLabel extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property({ attribute: false }) accessor row!: VaultRow
  @property({ type: Boolean, attribute: 'with-icon' }) accessor withIcon = false

  protected override willUpdate(): void {
    const row = this.row
    this.hostTip(row.derived ? this.tr.t(row.category === VaultCategory.Dungeon ? 'vault.derivedHint.dungeon' : 'vault.derivedHint') : null)
  }

  protected override render(): TemplateResult {
    const row = this.row
    return html`${this.withIcon ? html`<wt-icon name=${VAULT_ROW_ICONS[row.category]} size=${IconSize.Xs}></wt-icon>` : nothing}${this.tr.t(VAULT_LABEL_KEYS[row.category])}${
      row.derived ? html`<span class="derived-mark">*</span>` : nothing
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-vault-row-label': WtVaultRowLabel
  }
}
