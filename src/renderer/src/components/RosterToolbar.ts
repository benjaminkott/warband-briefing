import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { TranslationKey } from '../../../shared/i18n'
import { WtElement, type WtEvent } from '../element'
import type { IconName } from './Icon'
import './ui/Button'
import { ViewMode } from '../enums/viewMode'
import './ui/Segmented'
import './Icon'

const VIEWS: Array<{ id: ViewMode; key: TranslationKey; icon: IconName }> = [
  { id: ViewMode.Tiles, key: 'overview.view.tiles', icon: 'gauge' },
  { id: ViewMode.Rows, key: 'overview.view.rows', icon: 'cards' },
  { id: ViewMode.Table, key: 'overview.view.table', icon: 'table' }
]

/**
 * The view switch for the roster, with the count. The search is the top
 * bar's; the roster narrows itself by the place's text. The order is the
 * plan's; the table sorts by its own columns.
 *
 * Every control raises its own event.
 *
 * @fires wt-view - Tiles, rows or table.
 */
@customElement('wt-roster-toolbar')
export class WtRosterToolbar extends WtElement {
  @property() accessor view: ViewMode = ViewMode.Tiles
  @property({ type: Number }) accessor shown = 0
  @property({ type: Number }) accessor total = 0

  protected override willUpdate(): void {
    this.hostClasses({ toolbar: true })
  }

  /** A segmented control's pick, re-raised under the toolbar's own name; the control was given the enum's words, so the pick is one of them. */
  private relay(raise: (word: string) => void) {
    return (event: WtEvent<'wt-change'>): void => {
      event.stopPropagation()
      raise(event.detail)
    }
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    return html`
      <!-- One group with an auto margin rather than a spacer element: when the
           toolbar wraps, the count and the view switch stay together, on the
           right of whichever line they end up on. -->
      <div class="toolbar-end">
        <span class="muted count-label">
          ${
            this.shown === this.total
              ? tr.plural('overview.count', this.total)
              : tr.t('overview.countOf', { shown: this.shown, total: this.total })
          }
        </span>

        <wt-segmented
          .value=${this.view}
          .options=${VIEWS.map((entry) => ({
            value: entry.id,
            icon: entry.icon,
            label: tr.t(entry.key),
            tip: tr.t(entry.key)
          }))}
          @wt-change=${this.relay((word) => this.emit('wt-view', word as ViewMode))}
        ></wt-segmented>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-roster-toolbar': WtRosterToolbar
  }
}
