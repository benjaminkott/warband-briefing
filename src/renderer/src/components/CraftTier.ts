import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import tier1 from '../../../../assets/craft-tiers/tier1.svg?url'
import tier2 from '../../../../assets/craft-tiers/tier2.svg?url'
import tier3 from '../../../../assets/craft-tiers/tier3.svg?url'
import tier4 from '../../../../assets/craft-tiers/tier4.svg?url'
import tier5 from '../../../../assets/craft-tiers/tier5.svg?url'

/** The marks, our own drawings after the game's: two gems, three, three in gold, a red star, an orange star. */
const MARKS: Record<number, string> = { 1: tier1, 2: tier2, 3: tier3, 4: tier4, 5: tier5 }

/**
 * The crafting tier of a reagent or a crafted piece, as the mark the game
 * hangs on its name: the host is the `.craft-tier` box, the drawing fills
 * it. A tier the set does not know, or none, draws nothing and takes no
 * room.
 */
@customElement('wt-craft-tier')
export class WtCraftTier extends WtElement {
  /** 1 to 5; none draws nothing. */
  @property({ type: Number }) accessor tier: number | null = null

  protected override willUpdate(): void {
    this.hostClasses({ 'craft-tier': true })
    this.hostPresent(this.tier !== null && this.tier in MARKS)
    this.hostTip(this.tier !== null && this.tier in MARKS ? this.tr.t('item.craftTier', { tier: this.tier }) : null)
  }

  protected override render(): TemplateResult | typeof nothing {
    const mark = this.tier === null ? undefined : MARKS[this.tier]
    if (!mark) return nothing
    return html`<img src=${mark} alt="" aria-hidden="true" />`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-craft-tier': WtCraftTier
  }
}
