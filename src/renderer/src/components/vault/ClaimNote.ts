import { html, type TemplateResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { WtElement } from '../../element'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * A reward is in there, but nothing on disk says what: after the reset
 * SavedInstances keeps only the fact that a row is filled, and the rows
 * themselves are gone. Saying so beats drawing nine empty slots and letting
 * them read as an empty vault.
 */
@customElement('wt-claim-note')
export class WtClaimNote extends WtElement {
  protected override willUpdate(): void {
    this.hostClasses({ 'vault-note': true, 'claim-note': true, 'warn-text': true })
    this.hostTip(this.tr.t('card.claimUnknownHint'))
  }

  protected override render(): TemplateResult {
    return html`<wt-icon name="vault" size=${IconSize.Xs}></wt-icon>${this.tr.t('card.claimUnknown')}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-claim-note': WtClaimNote
  }
}
