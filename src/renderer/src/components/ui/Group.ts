import { css, html, nothing, type TemplateResult } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { hasContent, WtElement, type Content } from '../../element'

/**
 * A section of a panel: a small title, a note beside it, and the content
 * under it. A panel with several parts (the watched quests, the season set,
 * the suggestions, the form) puts each part in a group, so the parts keep
 * one distance and one kind of title.
 *
 * The content is the group's children, as a card's is: they fall into the
 * slot and stay in the light DOM, so `styles.css` keeps applying to them.
 * An action - a reset button - is a child with `slot="action"`; it sits
 * at the right of the title line. The title line is drawn when there is
 * a title, a note or an action, and left out otherwise: a group without
 * one is only the spacing.
 */
@customElement('wt-group')
export class WtGroup extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--s2);
    }

    /* Centred, not on the baseline: the head is as tall as the action it
       can hold, and a title on the baseline would sit at its top, far from
       its content and close to the group before. */
    .head {
      display: flex;
      align-items: center;
      gap: var(--s2);
      min-height: var(--control-h-sm);
    }

    .head[hidden] {
      display: none;
    }

    /* The caption of the app, as the panel heads and the table heads set
       it. One step brighter than the caption rule: the note beside the
       title is faint too, and two faint texts on one line make the title
       vanish. */
    h3 {
      margin: 0;
      font-size: var(--fs-tiny);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: var(--track-caps);
      color: var(--text-dim);
    }

    .note {
      flex: 1 1 auto;
      min-width: 0;
      font-size: var(--fs-tiny);
      color: var(--text-faint);
    }

    .action {
      margin-left: auto;
    }
  `

  @property() accessor heading: Content = nothing
  /** A quiet remark beside the title. */
  @property() accessor note: Content = nothing

  /** Whether a child was given for the action slot; the head shows for it alone. */
  @state() accessor hasAction = false

  private onActionSlot(event: Event): void {
    this.hasAction = (event.target as HTMLSlotElement).assignedElements().length > 0
  }

  protected override render(): TemplateResult {
    // The head stays in the tree when it is empty, so its slot keeps
    // listening for an action that comes later.
    const shown = hasContent(this.heading) || hasContent(this.note) || this.hasAction
    return html`<div class="head" ?hidden=${!shown}>
        ${hasContent(this.heading) ? html`<h3>${this.heading}</h3>` : nothing}
        ${hasContent(this.note) ? html`<span class="note">${this.note}</span>` : nothing}
        <span class="action"><slot name="action" @slotchange=${this.onActionSlot}></slot></span>
      </div>
      <slot></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-group': WtGroup
  }
}
