import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { HostDisplay } from '../enums/hostDisplay'

/** The guild in the angle brackets the game itself shows it in. */
@customElement('wt-guild-tag')
export class WtGuildTag extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property() accessor guild: string | null = null

  protected override willUpdate(): void {
    this.hostClasses({ 'guild-tag': Boolean(this.guild) })
    this.hostPresent(Boolean(this.guild))
    this.hostTip(this.guild ? this.tr.t('card.guildHint', { guild: this.guild }) : null)
  }

  protected override render(): TemplateResult | typeof nothing {
    return this.guild ? html`${`<${this.guild}>`}` : nothing
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-guild-tag': WtGuildTag
  }
}
