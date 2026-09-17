import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { rewardText, type Reward } from '../model/plan'
import { FormatKind } from '../enums/formatKind'
import './ui/Format'

/**
 * What a vault slot pays: the reward's item level with its unit small
 * beside it, then the gain over the character in the accent where there
 * is one. The evening's plan, a task line and a grid cell all name the
 * pay-out, so it is one figure. The host is the `.reward` span; the
 * sentence behind the figure is its tooltip, and with no reward the host
 * takes no room.
 */
@customElement('wt-reward')
export class WtReward extends WtElement {
  @property({ attribute: false }) accessor reward: Reward | null = null
  /** The level alone, for a cell with no room for the unit and the gain; the tooltip says the rest. */
  @property({ type: Boolean, reflect: true }) accessor compact = false

  protected override willUpdate(): void {
    const { reward } = this
    this.hostClasses({ reward: true, num: true, compact: this.compact })
    this.hostPresent(reward !== null)
    this.hostTip(reward ? rewardText(reward, this.tr) : null)
  }

  protected override render(): TemplateResult | typeof nothing {
    const { reward } = this
    if (!reward) return nothing
    if (this.compact) return html`<wt-format kind=${FormatKind.Whole} .value=${reward.level}></wt-format>`
    return html`<span
        ><wt-format kind=${FormatKind.Whole} .value=${reward.level}></wt-format
        ><span class="reward-unit">${this.tr.t('card.itemLevel')}</span></span
      >${
        reward.gain !== null && reward.gain > 0
          ? html`<wt-format kind=${FormatKind.Signed} .value=${reward.gain} class="reward-gain"></wt-format>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-reward': WtReward
  }
}
