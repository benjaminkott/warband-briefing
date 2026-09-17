import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'

/**
 * "Timed" or "over the timer", in the colour of which it was. The runs of
 * the week and the season's bests both say it in a cell of their own.
 */
@customElement('wt-run-result')
export class WtRunResult extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Inline
  @property({ type: Boolean }) accessor timed = false

  protected override willUpdate(): void {
    this.hostClasses({ 'ok-text': this.timed, 'warn-text': !this.timed })
  }

  protected override render(): TemplateResult {
    return html`${this.tr.t(this.timed ? 'run.timed' : 'run.overtime')}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-run-result': WtRunResult
  }
}
