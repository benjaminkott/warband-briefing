import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtElement } from '../../element'
import { ControlSize } from '../../enums/controlSize'
import { SettingsSection } from '../../enums/settingsSection'
import './Button'

/**
 * A panel that has nothing to show says so, in the place the table would be.
 * Where the reason is a source that is not installed, `to-sources` puts the
 * way there next to the sentence, so the reader is not left to find it.
 *
 * @fires wt-open-settings - The settings on the setup section, where the sources are.
 */
@customElement('wt-panel-empty')
export class WtPanelEmpty extends WtElement {
  @property() accessor text = ''
  @property({ type: Boolean, attribute: 'to-sources' }) accessor toSources = false

  protected override willUpdate(): void {
    this.hostClasses({ faint: true, tiny: true, 'panel-empty': true })
  }

  protected override render(): TemplateResult {
    return html`${this.text}
    ${
      this.toSources
        ? html`<wt-button
            ghost
            size=${ControlSize.Sm}
            label=${this.tr.t('settings.sources.open')}
            @click=${() => this.emit('wt-open-settings', SettingsSection.Setup)}
          ></wt-button>`
        : nothing
    }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-panel-empty': WtPanelEmpty
  }
}
