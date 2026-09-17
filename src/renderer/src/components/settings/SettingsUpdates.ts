import { html, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { ResolvedConfig, UpdateSource, UpdateState } from '../../../../shared/types'
import type { WtEvent } from '../../element'
import { WtPanel } from '../ui/Panel'
import { updateSourceFields, updateSourceFor } from './model'
import { UpdateSourceKind } from '../../../../shared/enums/updateSourceKind'
import { Severity } from '../../enums/severity'
import { ButtonRole } from '../../enums/buttonRole'
import '../Notice'
import '../ui/Select'
import '../ui/Button'
import '../ui/Checkbox'
import '../ui/FieldGroup'
import '../ui/Input'
import '../ui/Hint'

/**
 * Where new versions of the app come from, and whether they are
 * fetched on their own. The source is edited in place and saved by a button.
 *
 * @fires wt-config - The update source, or the auto-update switch.
 * @fires wt-check-update - Check for a new version now.
 * @fires wt-install-update - Restart into the downloaded version.
 */
@customElement('wt-settings-updates')
export class WtSettingsUpdates extends WtPanel {
  @property({ attribute: false }) accessor config!: ResolvedConfig
  @property({ attribute: false }) accessor updateState: UpdateState | null = null
  @property({ type: Boolean }) accessor busy = false

  /** The source the form holds; none is the select's empty value. */
  @state() accessor sourceKind: UpdateSourceKind | null = null
  @state() accessor sourceValue = ''
  /** The stored source the fields were last filled from. */
  private followed: UpdateSource | null | undefined = undefined

  /**
   * The fields follow the stored value only when that value itself changes,
   * not on every other setting saved while the form is being edited.
   */
  private follow(): void {
    const source = this.config.updateSource
    if (this.followed !== undefined && this.followed === source) return
    this.followed = source
    const fields = updateSourceFields(source)
    this.sourceKind = fields.kind
    this.sourceValue = fields.value
  }

  private save(): void {
    this.emit('wt-config', { updateSource: updateSourceFor(this.sourceKind, this.sourceValue) })
  }

  protected override willUpdate(): void {
    this.follow()
    const tr = this.tr
    const { config, busy, sourceKind } = this
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

      <wt-field-group icon="plug" label=${tr.t('settings.updates.source')}>
        <wt-select
          control-id="update-source"
          .value=${sourceKind ?? ''}
          .options=${[
            { value: '', label: tr.t('settings.updates.sourceNone') },
            { value: UpdateSourceKind.Github, label: tr.t('settings.updates.sourceGithub') },
            { value: UpdateSourceKind.Generic, label: tr.t('settings.updates.sourceGeneric') }
          ]}
          @wt-change=${(event: WtEvent<'wt-change'>) => (this.sourceKind = event.detail ? (event.detail as UpdateSourceKind) : null)}
        ></wt-select>
      </wt-field-group>

      ${
        sourceKind !== null
          ? html`<wt-field-group
              icon="link"
              label=${sourceKind === UpdateSourceKind.Github ? tr.t('settings.updates.repo') : tr.t('settings.updates.baseUrl')}
            >
              <wt-input
                control-id="update-target"
                code
                .value=${this.sourceValue}
                placeholder=${
                  sourceKind === UpdateSourceKind.Github
                    ? tr.t('settings.updates.repoPlaceholder')
                    : tr.t('settings.updates.urlPlaceholder')
                }
                @wt-input=${(event: WtEvent<'wt-input'>) => (this.sourceValue = event.detail)}
                @wt-submit=${() => this.save()}
              ></wt-input>
            </wt-field-group>`
          : nothing
      }

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

      <!-- The season catalog from the repository, not only from the app: a new
           weekly then needs no release. Off by default, the app works without a net. -->
      <wt-field-group icon="calendar" label=${tr.t('settings.updates.catalog')}>
        <wt-checkbox
          control-id="catalog-updates"
          ?checked=${config.catalogUpdates}
          .label=${html`<span class="muted tiny">
            ${tr.t('settings.updates.catalogHint')}
            ${tr.t('settings.updates.catalogState', { season: config.season.label, patch: config.season.patch })}${
              config.seasonFetchedAt
                ? tr.t('settings.updates.catalogFetched', { time: this.relativeTime(config.seasonFetchedAt) })
                : tr.t('settings.updates.catalogBundled')
            }
          </span>`}
          @wt-check=${(event: WtEvent<'wt-check'>) => this.emit('wt-config', { catalogUpdates: event.detail })}
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
        <wt-button icon="check" label=${tr.t('settings.updates.saveSource')} ?disabled=${busy} @click=${() => this.save()}></wt-button>
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
          ? html`<wt-hint icon="check" text=${tr.t('settings.updates.upToDate', { source: update.sourceLabel })}></wt-hint>`
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
