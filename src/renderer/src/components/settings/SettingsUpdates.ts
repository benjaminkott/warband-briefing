import { html, nothing } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { ResolvedConfig, UpdateState } from '../../../../shared/types'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { Severity } from '../../enums/severity'
import { ButtonRole } from '../../enums/buttonRole'
import '../Notice'
import '../ui/Button'
import '../ui/Checkbox'
import '../ui/FieldGroup'
import '../ui/Hint'

/**
 * New versions of the app from the releases of the repository: whether
 * they are fetched on their own, and a check by hand.
 *
 * @fires wt-config - The auto-update switch.
 * @fires wt-check-update - Check for a new version now.
 * @fires wt-install-update - Restart into the downloaded version.
 */
@customElement('wt-settings-updates')
export class WtSettingsUpdates extends WtPanel {
  @property({ attribute: false }) accessor config!: ResolvedConfig
  @property({ attribute: false }) accessor updateState: UpdateState | null = null
  @property({ type: Boolean }) accessor busy = false

  protected override willUpdate(): void {
    const tr = this.tr
    const { config, busy } = this
    const update = this.updateState

    this.icon = 'download'
    this.heading = tr.t('settings.updates.title')
    this.description = tr.t('settings.updates.body')
    this.content = html`
      <wt-field-group icon="info" label=${tr.t('settings.updates.version')}>
        <div class="row">
          <strong>${update?.currentVersion ?? '—'}</strong>
          ${update && !update.supported ? html`<span class="faint tiny">${tr.t('settings.updates.devHint')}</span>` : nothing}
        </div>
      </wt-field-group>

      <wt-field-group icon="refresh" label=${tr.t('settings.updates.auto')}>
        <wt-checkbox
          control-id="auto-update"
          ?checked=${config.autoUpdate}
          .label=${html`<span class="muted tiny">
            ${tr.t('settings.updates.autoHint')}${
              update?.lastCheckedAt ? tr.t('settings.updates.lastChecked', { time: this.relativeTime(update.lastCheckedAt) }) : ''
            }
          </span>`}
          @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { autoUpdate: event.detail })}
        ></wt-checkbox>
      </wt-field-group>

      <!-- The game's icons come from Blizzard's image host, once each. On by
           default: the game itself needs the net, and what is fetched stays. -->
      <wt-field-group icon="gem" label=${tr.t('settings.updates.icons')}>
        <!-- The host is display: contents, so the quiet look on it reaches the label. -->
        <wt-checkbox
          class="muted tiny"
          control-id="game-icons"
          ?checked=${config.gameIcons}
          label=${tr.t('settings.updates.iconsHint')}
          @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { gameIcons: event.detail })}
        ></wt-checkbox>
      </wt-field-group>

      <!-- Wowhead's own script, the one foreign script in the app; see wowheadTooltips.ts. -->
      <wt-field-group icon="link" label=${tr.t('settings.updates.wowhead')}>
        <wt-checkbox
          class="muted tiny"
          control-id="wowhead-tooltips"
          ?checked=${config.wowheadTooltips}
          label=${tr.t('settings.updates.wowheadHint')}
          @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { wowheadTooltips: event.detail })}
        ></wt-checkbox>
      </wt-field-group>

      <div class="row">
        <wt-button
          icon="refresh"
          ?spinning=${Boolean(update?.checking)}
          label=${update?.checking ? tr.t('settings.updates.checking') : tr.t('settings.updates.checkNow')}
          ?disabled=${busy || Boolean(update?.checking)}
          @click=${() => this.emit('wt-check-update')}
        ></wt-button>
        ${
          update?.downloaded
            ? html`<wt-button
                icon="download"
                label=${tr.t('settings.updates.restartInstall')}
                tone=${ButtonRole.Primary}
                ?disabled=${busy}
                @click=${() => this.emit('wt-install-update')}
              ></wt-button>`
            : nothing
        }
      </div>

      ${update?.error ? html`<wt-notice tone=${Severity.Danger}>${update.error}</wt-notice>` : nothing}
      ${
        update && !update.error && update.available && !update.downloaded
          ? html`<wt-notice>
              ${
                update.downloading
                  ? tr.t('settings.updates.downloading', {
                      version: update.latestVersion ?? '?',
                      percent: update.percent
                    })
                  : tr.t('settings.updates.found', { version: update.latestVersion ?? '?' })
              }
            </wt-notice>`
          : nothing
      }
      ${
        update && !update.error && !update.available && update.lastCheckedAt
          ? html`<wt-hint icon="check" text=${tr.t('settings.updates.upToDate')}></wt-hint>`
          : nothing
      }
    `
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-updates': WtSettingsUpdates
  }
}
