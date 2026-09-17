import { customElement, property } from 'lit/decorators.js'
import { WtDashPanel } from '../ui/DashPanel'
import '../ui/Table'

/**
 * A panel of the character page: the compact box, placed on the twelve-column
 * grid. Every row sizes to what it holds, so every panel opts out of
 * stretching. The page's panels extend this and fill icon, heading, aside
 * and content in from what they are given.
 */
@customElement('wt-detail-panel')
export class WtDetailPanel extends WtDashPanel {
  @property({ type: Number }) accessor span: 4 | 6 | 12 = 6

  protected override willUpdate(): void {
    super.willUpdate()
    this.hostClasses({ 'dash-c4': this.span === 4, 'dash-c6': this.span === 6, 'dash-c12': this.span === 12, 'dash-fit': true })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-detail-panel': WtDetailPanel
  }
}
