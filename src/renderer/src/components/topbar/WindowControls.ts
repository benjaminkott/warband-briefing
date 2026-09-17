import { html, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { Severity } from '../../enums/severity'
import '../ui/Button'

/**
 * The three window controls of the frameless window, flush at the right
 * edge of the bar where the OS would have drawn them: minimise, maximise
 * or restore, close. They talk to the window through the bridge; nothing
 * above them needs to know.
 */
@customElement('wt-window-controls')
export class WtWindowControls extends WtElement {
  /** Whether the window fills the screen, for the middle button's mark and word. */
  @property({ type: Boolean }) accessor maximized = false

  protected override willUpdate(): void {
    this.hostClasses({ 'window-controls': true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const maximized = this.maximized
    return html`<wt-button
        icon="minimize"
        data-tip=${tr.t('window.minimize')}
        @click=${() => void window.briefing.window.minimize()}
      ></wt-button>
      <wt-button
        icon=${maximized ? 'restore' : 'maximize'}
        data-tip=${maximized ? tr.t('window.restore') : tr.t('window.maximize')}
        @click=${() => void window.briefing.window.toggleMaximize()}
      ></wt-button>
      <wt-button
        icon="close"
        tone=${Severity.Danger}
        data-tip=${tr.t('window.close')}
        @click=${() => void window.briefing.window.close()}
      ></wt-button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-window-controls': WtWindowControls
  }
}
