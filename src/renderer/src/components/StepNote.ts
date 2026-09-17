import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import type { NextStep } from '../model/plan'
import { HostDisplay } from '../enums/hostDisplay'
import { StepTone } from '../enums/stepTone'
import './Icon'
import { IconSize } from '../enums/iconSize'

/**
 * The next step in words, in the colour of how urgent it is: the mark of
 * its kind, then the text. The card band, the table cell, the tile, the
 * roster row and the evening's plan all say the same step, so it is one
 * element; the place gives the host its class (`card-step`, `tile-step`,
 * `todo-step`), the element toggles the tone (`step-open`). The reason is
 * the tooltip, and on a row with room it follows the words in quiet type.
 */
@customElement('wt-step-note')
export class WtStepNote extends WtElement {
  static override hostDisplay = HostDisplay.Inline

  @property({ attribute: false }) accessor step!: NextStep
  /** The mark's step of the icon scale; a band sets it a step larger than a cell. */
  @property() accessor size: IconSize = IconSize.Xs
  /** Whether the reason follows the words on the line, where the row has room. */
  @property({ type: Boolean }) accessor detail = false
  /** A shorter tooltip than the reason, where a view sets the reason's parts beside the step. */
  @property() accessor tip: string | undefined = undefined

  protected override willUpdate(): void {
    const { step } = this
    this.hostClasses(Object.fromEntries(Object.values(StepTone).map((tone) => [`step-${tone}`, tone === step.tone])))
    this.hostTip(this.tip ?? step.detail)
  }

  protected override render(): TemplateResult {
    const { step } = this
    return html`<wt-icon name=${step.icon} size=${this.size}></wt-icon><span class="step-text">${step.text}</span>${
        this.detail && step.detail ? html`<span class="step-detail">${step.detail}</span>` : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-step-note': WtStepNote
  }
}
