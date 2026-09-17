import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { ref } from 'lit/directives/ref.js'
import { classes, WtElement, type Content } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import { CheckboxKind } from '../../enums/checkboxKind'

/**
 * A checkbox with its label in one clickable row.
 *
 * The host is `display: contents`: only a real `<label>` toggles its input
 * on click, so the pair sits inside and takes the row's class. The state is
 * raised as `wt-check` with the new value, not as the input's own event.
 *
 * @fires wt-check - The box was ticked or unticked, with the new state.
 */
@customElement('wt-checkbox')
export class WtCheckbox extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Contents
  @property({ type: Boolean }) accessor checked = false
  @property({ type: Boolean }) accessor disabled = false
  /** The half-set mark of a switch for a whole column. */
  @property({ type: Boolean }) accessor indeterminate = false
  @property() accessor kind: CheckboxKind = CheckboxKind.CheckRow
  /** Plain text as an attribute, or a template as a property. */
  @property() accessor label: Content = nothing
  /** The row drawn as switched off, whatever the box says. */
  @property({ type: Boolean }) accessor off = false
  /** The input's id, for a label elsewhere that points at it. */
  @property({ attribute: 'control-id' }) accessor controlId: string | undefined = undefined
  @property({ attribute: 'control-tip' }) accessor controlTip: string | undefined = undefined

  private onChange(event: Event): void {
    this.emit('wt-check', (event.target as HTMLInputElement).checked)
  }

  protected override render(): TemplateResult {
    const input = html`<input
      ${ref((element) => {
        // Not an attribute: the half-set mark can only be set on the element.
        if (element) (element as HTMLInputElement).indeterminate = this.indeterminate
      })}
      id=${this.controlId ?? nothing}
      type="checkbox"
      .checked=${this.checked}
      ?disabled=${this.disabled}
      data-tip=${this.controlTip ?? nothing}
      @change=${this.onChange}
    />`
    if (this.kind === CheckboxKind.Plain) return input
    return html`<label class=${classes(this.kind, this.off && 'off')} for=${this.controlId ?? nothing}>${input}${this.label}</label>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-checkbox': WtCheckbox
  }
}
