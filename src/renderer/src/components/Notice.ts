import { css, html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../element'
import { Severity, SEVERITY_ICON } from '../enums/severity'
import type { Tab } from '../enums/tab'
import './Icon'
import { IconSize } from '../enums/iconSize'

/** A message for the reader, as the shell keeps it: what happened and how to read it. */
export interface NoticeMessage {
  severity: Severity
  text: string
  /** A way on from the message: the tab a button opens, and the word on it. */
  action?: { label: string; tab: Tab }
}

/**
 * One line of feedback, with the mark that says how to read it.
 *
 * Every message in the app goes through here, so a fault looks like a fault
 * wherever it is raised - the colour alone was doing that job before. The
 * tone is the message's severity; the mark comes with it. The message is
 * the notice's children: a text, or a text with what goes with it - the
 * button that takes the reader on, the progress of a download. A `banner`
 * sets those side by side on one line that wraps; a `muted` notice is an
 * aside, in the dim ink.
 *
 * The box, the mark and the tones are the notice's own stylesheet; where a
 * notice sits in its parent - first in a panel, last under the roster - is
 * the parent's rule in `styles.css`, keyed on the tag.
 */
@customElement('wt-notice')
export class WtNotice extends WtElement {
  static override shadow = true

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--s2);
      border-radius: var(--radius);
      padding: var(--s2) var(--s4);
      margin-bottom: var(--s3);
      font-size: var(--fs-base);
      border: 1px solid var(--info-line);
      background: var(--info-soft);
      color: var(--info-text);
    }

    wt-icon {
      color: var(--info);
    }

    .text {
      flex: 1;
      min-width: 0;
    }

    /* The other three severities: the same three slots, the family's tokens. */
    :host([tone='ok']) {
      border-color: var(--ok-line);
      background: var(--ok-soft);
      color: var(--ok-text);
    }

    :host([tone='ok']) wt-icon {
      color: var(--ok);
    }

    :host([tone='warn']) {
      border-color: var(--warn-line);
      background: var(--warn-soft);
      color: var(--warn-text);
    }

    :host([tone='warn']) wt-icon {
      color: var(--warn);
    }

    :host([tone='danger']) {
      border-color: var(--danger-line);
      background: var(--danger-soft);
      color: var(--danger-text);
    }

    :host([tone='danger']) wt-icon {
      color: var(--danger);
    }

    :host([muted]) {
      color: var(--text-dim);
    }

    :host([banner]) .text {
      display: flex;
      align-items: center;
      gap: var(--s4);
      flex-wrap: wrap;
    }
  `

  @property({ reflect: true }) accessor tone: Severity = Severity.Info
  /** The text and what goes with it side by side, on one line that wraps. */
  @property({ type: Boolean, reflect: true }) accessor banner = false
  /** An aside in the dim ink: what is not on screen, and why. */
  @property({ type: Boolean, reflect: true }) accessor muted = false

  protected override willUpdate(): void {
    // A screen reader hears a notice without a focus on it: an error at
    // once, the rest when it is free.
    this.setAttribute('role', this.tone === Severity.Danger ? 'alert' : 'status')
  }

  protected override render(): TemplateResult {
    return html`<wt-icon name=${SEVERITY_ICON[this.tone]} size=${IconSize.Md}></wt-icon>
      <div class="text"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-notice': WtNotice
  }
}
