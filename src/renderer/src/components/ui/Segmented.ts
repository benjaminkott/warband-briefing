import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement, type Content } from '../../element'
import type { IconName } from '../Icon'
import { ControlSize } from '../../enums/controlSize'
import './Button'

export interface SegmentedOption {
  value: string
  label: Content
  icon?: IconName
  tip?: string
}

/**
 * A row of switches of which one is down: the filters and the view switch of
 * the toolbar, the range strip of the gold view, the tabs of the top bar.
 * The host is the `.segmented` row.
 *
 * @fires wt-change - A switch pressed, with its value.
 */
@customElement('wt-segmented')
export class WtSegmented extends WtElement {
  @property({ attribute: false }) accessor options: SegmentedOption[] = []
  @property() accessor value = ''
  /**
   * Stood on end: the same switches as a column for a page that is divided
   * into sections, one entry for each section down the side. The host is
   * the `.nav` column in place of the `.segmented` row; where it sits and
   * whether it sticks is the page's business.
   */
  @property({ type: Boolean }) accessor vertical = false
  /** Every switch set aside for the moment: the choice stands, but is not taken. */
  @property({ type: Boolean }) accessor disabled = false

  protected override willUpdate(): void {
    this.hostClasses({ segmented: !this.vertical, nav: this.vertical })
  }

  protected override render(): TemplateResult {
    return html`${this.options.map(
      (option) =>
        html`<wt-button
          size=${ControlSize.Sm}
          .label=${option.label}
          icon=${option.icon ?? nothing}
          ?active=${option.value === this.value}
          ?disabled=${this.disabled}
          data-tip=${option.tip ?? nothing}
          @click=${() => this.emit('wt-change', option.value)}
        ></wt-button>`
    )}`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-segmented': WtSegmented
  }
}
