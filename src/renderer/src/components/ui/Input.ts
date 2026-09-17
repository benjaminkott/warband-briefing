import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import { classes, WtElement } from '../../element'
import { HostDisplay } from '../../enums/hostDisplay'
import { ControlSize } from '../../enums/controlSize'
import { InputType } from '../../enums/inputType'
import type { InputWidth } from '../../enums/inputWidth'

/**
 * The one text field. A path, a search, a quest id, a level: every typed
 * value in the app goes through this, so the frame, the focus ring and the
 * placeholder read the same everywhere.
 *
 * The host is `display: contents`: a custom element cannot be an `<input>`,
 * so the real one sits inside and takes the stylesheet's input rules. What
 * is typed comes up as `wt-input` on every keystroke, and Enter as
 * `wt-submit` - the form beside it decides what that means.
 *
 * @fires wt-input - The field's value after a keystroke.
 * @fires wt-submit - Enter in the field.
 */

@customElement('wt-input')
export class WtInput extends WtElement {
  static override hostDisplay: HostDisplay = HostDisplay.Contents
  @property() accessor value = ''
  @property() accessor placeholder: string | undefined = undefined
  @property() accessor type: InputType = InputType.Text
  @property({ type: Number }) accessor min: number | undefined = undefined
  @property({ type: Number }) accessor max: number | undefined = undefined
  @property() accessor width: InputWidth | undefined = undefined
  /** The height, on the scale the buttons use, so a field and a button in one row stand level. */
  @property() accessor size: ControlSize = ControlSize.Md
  /** Digits only: a stray letter is taken out again before it shows. */
  @property({ type: Boolean }) accessor digits = false
  /** A path, an id, a URL, a search: not prose, so no spell check on it. */
  @property({ type: Boolean }) accessor code = false
  @property({ type: Boolean }) accessor disabled = false
  /** The input's id, for a label elsewhere that points at it. */
  @property({ attribute: 'control-id' }) accessor controlId: string | undefined = undefined
  @property({ attribute: 'control-tip' }) accessor controlTip: string | undefined = undefined

  private inputRef = createRef<HTMLInputElement>()

  /** The real field, for a place that has to know whether a key went into it. */
  get control(): HTMLInputElement | undefined {
    return this.inputRef.value
  }

  override focus(): void {
    this.control?.focus()
  }

  override blur(): void {
    this.control?.blur()
  }

  select(): void {
    this.control?.select()
  }

  private onInput(event: Event): void {
    const target = event.target as HTMLInputElement
    if (this.digits) {
      // The field is put back to what survived, so the letter never shows.
      const kept = target.value.replace(/\D/g, '')
      if (kept !== target.value) target.value = kept
    }
    this.value = target.value
    this.emit('wt-input', target.value)
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.emit('wt-submit')
  }

  protected override render(): TemplateResult {
    return html`<input
      ${ref(this.inputRef)}
      id=${this.controlId ?? nothing}
      class=${classes(this.width && `input-${this.width}`, this.size !== ControlSize.Md && this.size) || nothing}
      type=${this.type}
      .value=${this.value}
      placeholder=${this.placeholder ?? nothing}
      min=${this.min ?? nothing}
      max=${this.max ?? nothing}
      spellcheck=${this.code ? 'false' : nothing}
      ?disabled=${this.disabled}
      data-tip=${this.controlTip ?? nothing}
      @input=${this.onInput}
      @keydown=${this.onKeydown}
    />`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-input': WtInput
  }
}
