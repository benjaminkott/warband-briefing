import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { VaultCategory } from '../../../../shared/enums/vaultCategory'
import { HostDisplay } from '../../enums/hostDisplay'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/** What a row is still short of for its next slot - "2 more dungeons". The host wears `gap-note` unless given the vault's own class. */
@customElement('wt-gap-note')
export class WtGapNote extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property() accessor category: VaultCategory = VaultCategory.Raid
  @property({ type: Number }) accessor missing = 0

  protected override willUpdate(): void {
    this.hostClasses({ 'gap-note': true, 'warn-text': true })
  }

  protected override render(): TemplateResult {
    return html`<wt-icon name="chevronUp" size=${IconSize.Xs}></wt-icon>${this.tr.plural(`vault.gap.${this.category}`, this.missing)}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-gap-note': WtGapNote
  }
}
