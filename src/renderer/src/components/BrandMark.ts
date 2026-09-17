import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import armory from '../../../../assets/brand-icons/armory.png?url'
import raiderio from '../../../../assets/brand-icons/raiderio.png?url'
import warcraftlogs from '../../../../assets/brand-icons/warcraftlogs.png?url'
import raidbots from '../../../../assets/brand-icons/raidbots.png?url'
import { BrandId } from '../enums/brandId'

/**
 * Marks for the sites a character can be looked up on.
 *
 * These are each site's own icon, taken from the site itself, because a link
 * row is read by recognition: a player spots the Raidbots skull faster than any
 * mark we could draw for it. The logos stay their owners' - we only use them to
 * point at the site they belong to.
 *
 * Sources:
 *   armory       assets-bwa.worldofwarcraft.blizzard.com/static/wow-icon-32x32
 *   raiderio     cdn.raiderio.net/images/brand/icon-180.png
 *   warcraftlogs assets.rpglogs.com/img/warcraft/favicon.png
 *   raidbots     www.raidbots.com/apple-touch-icon.png
 */

interface Brand {
  /** The site's own colour, used for the tile's hover edge. */
  color: string
  src: string
}

const BRANDS: Record<BrandId, Brand> = {
  armory: { color: '#4c9fdc', src: armory },
  raiderio: { color: '#f5842a', src: raiderio },
  warcraftlogs: { color: '#a970e8', src: warcraftlogs },
  raidbots: { color: '#f2b632', src: raidbots }
}

/**
 * The mark alone; the caller supplies the label and the tile around it. The
 * site is `brand`, not `id`, because `id` is the host's own.
 */
@customElement('wt-brand-mark')
export class WtBrandMark extends WtElement {
  @property() accessor brand!: BrandId
  /** A length; a bare number is pixels. */
  @property() accessor size: number | string = 14

  protected override willUpdate(): void {
    this.hostClasses({ 'brand-mark': true })
  }

  protected override render(): TemplateResult {
    return html`<img src=${BRANDS[this.brand].src} width=${this.size} height=${this.size} alt="" aria-hidden="true" draggable="false" />`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-brand-mark': WtBrandMark
  }
}

export function brandColor(id: BrandId): string {
  return BRANDS[id].color
}
