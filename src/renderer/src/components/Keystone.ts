import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Keystone } from '../../../shared/types'
import { WtElement } from '../element'
import { keystoneShort } from '../model/overview'
import { HostDisplay } from '../enums/hostDisplay'
import './ui/Format'

/**
 * A character's keystone as a figure: the level in the key colour, the
 * dungeon's initials small beside it, the full name in the tooltip - and a
 * dash where the character carries none. The card band, the tile and the
 * roster row all set it; the place gives the host its class (`card-key`,
 * `tile-key`, `todo-key`) for the size of the initials.
 */
@customElement('wt-keystone')
export class WtKeystone extends WtElement {
  static override hostDisplay = HostDisplay.Inline

  @property({ attribute: false }) accessor keystone: Keystone | null = null

  protected override willUpdate(): void {
    const tr = this.tr
    const { keystone } = this
    this.hostClasses({ keystone: true, num: true })
    this.hostTip(
      keystone ? tr.t('card.keystone', { name: keystone.name || tr.t('keystone.generic'), level: keystone.level }) : tr.t('card.noKeystone')
    )
  }

  protected override render(): TemplateResult {
    const { keystone } = this
    if (!keystone) return html`<wt-format class="faint"></wt-format>`
    return html`+${keystone.level}${keystone.name ? html`<span class="keystone-dungeon">${keystoneShort(keystone.name)}</span>` : nothing}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-keystone': WtKeystone
  }
}
