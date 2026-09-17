import { css, html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import type { IconName } from './Icon'
import './Icon'
import { IconSize } from '../enums/iconSize'

/**
 * A view with nothing to show says so in the middle of the page: a mark, a
 * title and, where there is one, the sentence or the button that gets the
 * reader out of it. One shape for every tab, so an empty gold view and an
 * empty roster look like the same kind of nothing. The sentence, the steps
 * and the button are the element's children under the title; the box, the
 * mark and the title are its own stylesheet. Where the box sits on the
 * page is the page's rule in `styles.css`, keyed on the tag.
 */
@customElement('wt-empty-state')
export class WtEmptyState extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: block;
      max-width: 620px;
      margin: var(--s9) auto;
      text-align: center;
      color: var(--text-dim);
      line-height: var(--lh-text);
    }

    h2 {
      margin: var(--s4) 0 var(--s2);
      font-size: var(--fs-title);
      color: var(--text);
    }

    .mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--s9);
      height: var(--s9);
      border-radius: 50%;
      border: 1px solid var(--border-strong);
      background: var(--bg-raised);
      color: var(--text-faint);
    }
  `

  @property() accessor icon: IconName = 'info'
  @property() accessor heading = ''

  protected override render(): TemplateResult {
    return html`
      <span class="mark"><wt-icon name=${this.icon} size=${IconSize.Lg}></wt-icon></span>
      <h2>${this.heading}</h2>
      <slot></slot>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-empty-state': WtEmptyState
  }
}
