import { css, html, nothing, type LitElement, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js'
import { WtElement, type Content } from '../../element'
import type { IconName } from '../Icon'
import { ControlSize } from '../../enums/controlSize'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * A field group: the label with its mark, and the control it names. The
 * control is the field (`wt-input`, `wt-select`); the group puts a label
 * to it. The control is the group's child, as a card's content is: it stays
 * in the light DOM and falls into the slot, so `styles.css` keeps applying
 * to it. The grid, the frame and the label are the group's own stylesheet,
 * keyed on the attributes it reflects.
 *
 * Two shapes, one element. The settings' group puts the label beside the
 * control in a grid, one under the other in a narrow window (`narrow` is
 * the short one beside a button). The `inline` group puts both on one line
 * inside a frame - the sort of the toolbar, the account of the gold view -
 * where the label is a caption and the control is a button of its own.
 * The inline group is on the control scale: `size` sets its height, the
 * way it sets a button's, so it stands level with a panel's head.
 *
 * A `<label for>` cannot reach across the shadow root, so the group names
 * the control itself: its text becomes the `aria-label` of the first
 * focusable inside when that has no name of its own, and a click on the
 * label moves the focus there.
 */
@customElement('wt-field-group')
export class WtFieldGroup extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: var(--s4);
      align-items: center;
      margin-bottom: var(--s3);
    }

    :host([narrow]) {
      grid-template-columns: auto minmax(96px, auto);
      gap: var(--s2);
      margin: 0;
    }

    @media (max-width: 1000px) {
      :host(:not([narrow])) {
        grid-template-columns: 1fr;
        gap: var(--s2);
      }
    }

    .label {
      display: inline-flex;
      align-items: center;
      gap: var(--s2);
      font-size: var(--fs-base);
      color: var(--text-dim);
    }

    .label wt-icon {
      color: var(--text-faint);
    }

    /* The caption sits inside the frame, so the label and the control read
       as one control rather than two things that happen to touch. The frame
       is spaced as a button is - the same padding, the same gap between
       every part - so it stands level with the buttons beside it. */
    :host([inline]) {
      display: inline-flex;
      align-items: center;
      gap: var(--control-gap);
      height: var(--control-h);
      margin: 0;
      padding: 0 var(--control-px);
      background: var(--bg-input);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      white-space: nowrap;
      transition: border-color 0.12s;
    }

    :host([inline][size='sm']) {
      height: var(--control-h-sm);
      padding: 0 var(--s2);
      font-size: var(--fs-base);
    }

    :host([inline]:hover) {
      border-color: var(--border-hover);
    }

    :host([inline]:focus-within) {
      border-color: var(--accent);
    }

    :host([inline]) .label {
      gap: var(--control-gap);
      font-size: inherit;
      color: inherit;
    }

    :host([inline]) .label wt-icon {
      color: inherit;
    }
  `

  @property() accessor icon: IconName = 'info'
  @property() accessor label: Content = nothing
  @property({ type: Boolean, reflect: true }) accessor narrow = false
  @property({ type: Boolean, reflect: true }) accessor inline = false
  /** The height of an inline group, on the control scale. */
  @property({ reflect: true }) accessor size: ControlSize = ControlSize.Md

  private labelRef = createRef<HTMLElement>()

  /** The first thing inside that takes the focus: the control the label names. */
  private control(): HTMLElement | null {
    return this.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')
  }

  private focusControl(): void {
    this.control()?.focus()
  }

  /**
   * The children render after the group does, so the name goes on once
   * they are done. A control with a name - an `aria-label`, or a `<label>`
   * of its own as the checkbox has - keeps it.
   */
  protected override async updated(): Promise<void> {
    await Promise.all(Array.from(this.children, (child) => (child as Partial<LitElement>).updateComplete))
    const control = this.control()
    const text = this.labelRef.value?.textContent?.trim()
    if (!control || !text || this.inline) return
    if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return
    if ('labels' in control && (control as HTMLInputElement).labels?.length) return
    control.setAttribute('aria-label', text)
  }

  protected override render(): TemplateResult {
    const label = html`<wt-icon name=${this.icon} size=${this.inline ? IconSize.Xs : IconSize.Sm}></wt-icon>${this.label}`
    if (this.inline) return html`<span class="label" ${ref(this.labelRef)}>${label}</span><slot></slot>`
    return html`<label class="label" ${ref(this.labelRef)} @click=${this.focusControl}>${label}</label><slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-field-group': WtFieldGroup
  }
}
