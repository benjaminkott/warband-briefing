import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import type { SummaryLine } from './model'
import { WtDetailPanel } from './DetailPanel'
import { DetailSection } from '../../enums/detailSection'
import { Severity } from '../../enums/severity'
import { ControlSize } from '../../enums/controlSize'
import { IconSize } from '../../enums/iconSize'
import type { TranslationKey } from '../../../../shared/i18n'
import './DetailList'
import './DetailEntry'
import '../ui/Button'
import '../ui/DashPanel'
import '../ui/PanelEmpty'
import '../Icon'

/**
 * A panel of the overview: a few lines of one section, each a label and a
 * value in its tone, and under them the way to the section in full. The
 * page sets the icon and the heading.
 *
 * @fires wt-detail-section - The way to the section in full.
 */
@customElement('wt-detail-summary')
export class WtDetailSummary extends WtDetailPanel {
  @property() accessor section: DetailSection = DetailSection.Week
  @property({ attribute: false }) accessor lines: SummaryLine[] = []
  /** What the panel says when it has no line. */
  @property() accessor empty = ''

  protected override willUpdate(): void {
    const tr = this.tr
    const sectionLabel = tr.t(`detail.section.${this.section}` as TranslationKey)
    this.content = html`${
        this.lines.length === 0
          ? html`<wt-panel-empty text=${this.empty}></wt-panel-empty>`
          : html`<wt-detail-list>
              ${this.lines.map(
                (line) =>
                  html`<wt-detail-entry data-tip=${line.tip ?? nothing}>
                    <wt-icon name=${line.icon} size=${IconSize.Xs} class="detail-row-icon"></wt-icon>
                    <span class="detail-summary-label">${line.label}</span>
                    <span
                      class=${classMap({
                        'detail-summary-value': true,
                        [`${line.tone}-text`]: line.tone !== Severity.Info
                      })}
                      >${line.value}</span
                    >
                  </wt-detail-entry>`
              )}
            </wt-detail-list>`
      }
      <div class="dash-foot detail-summary-foot">
        <wt-button
          ghost
          size=${ControlSize.Sm}
          icon="arrowRight"
          label=${tr.t('detail.overview.more', { section: sectionLabel })}
          @click=${() => this.emit('wt-detail-section', this.section)}
        ></wt-button>
      </div>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-summary': WtDetailSummary
  }
}
