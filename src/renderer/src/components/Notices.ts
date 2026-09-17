import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { UpdateState } from '../../../shared/types'
import { WtElement } from '../element'
import type { NoticeMessage } from './Notice'
import { Severity } from '../enums/severity'
import { ButtonRole } from '../enums/buttonRole'
import './Notice'
import './ui/Bar'
import './ui/Button'

/** What the shell's notices draw; when nothing of it is set, the shell draws no element at all. */
export interface NoticesModel {
  notice: NoticeMessage | null
  update: UpdateState | null
  /** No install folder set: worth a warning above every view. */
  noWowPath: boolean
}

/** Whether there is anything to say - the shell leaves the element out otherwise, so the view under it keeps its place as the first block. */
export function hasNotices({ notice, update, noWowPath }: NoticesModel): boolean {
  return notice !== null || !!update?.downloaded || !!update?.downloading || !!update?.available || noWowPath
}

/**
 * The shell's messages, above whichever view is open: what a read or a
 * sync said, an update on its way or ready, and the missing install
 * folder. They belong to the app, not to a tab - a sync error that only
 * the roster tab showed was one the list, where the app opens, never
 * said.
 *
 * @fires wt-tab - The tab a message leads on to.
 * @fires wt-install-update - Restart into the downloaded version.
 */
@customElement('wt-notices')
export class WtNotices extends WtElement {
  @property({ attribute: false }) accessor notice: NoticeMessage | null = null
  @property({ attribute: false }) accessor updateState: UpdateState | null = null
  @property({ type: Boolean }) accessor busy = false
  @property({ type: Boolean, attribute: 'no-wow-path' }) accessor noWowPath = false

  protected override willUpdate(): void {
    this.hostClasses({ notices: true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { notice, updateState: update, busy } = this
    const version = update?.latestVersion ?? '?'
    return html`
      ${
        notice
          ? html`<wt-notice banner tone=${notice.severity}>
              <span>${notice.text}</span>${
                notice.action
                  ? html`<wt-button
                      tone=${ButtonRole.Primary}
                      label=${notice.action.label}
                      @click=${() => this.emit('wt-tab', notice.action!.tab)}
                    ></wt-button>`
                  : nothing
              }
            </wt-notice>`
          : nothing
      }

      <!-- An update on its way or ready: downloaded, the one button that
           restarts into it; on the way, its progress; found, a word. -->
      ${
        update?.downloaded
          ? html`<wt-notice banner tone=${Severity.Ok}>
              <span>${tr.t('update.readyBanner', { version })}</span>
              <wt-button
                icon="download"
                tone=${ButtonRole.Primary}
                label=${tr.t('settings.updates.restartInstall')}
                ?disabled=${busy}
                @click=${() => this.emit('wt-install-update')}
              ></wt-button>
            </wt-notice>`
          : update?.downloading
            ? html`<wt-notice banner>
                <span>${tr.t('update.downloadingBanner', { version, percent: update.percent })}</span>
                <wt-bar class="update-progress" percent=${update.percent}></wt-bar>
              </wt-notice>`
            : update?.available
              ? html`<wt-notice banner><span>${tr.t('update.availableBanner', { version })}</span></wt-notice>`
              : nothing
      }
      ${this.noWowPath ? html`<wt-notice tone=${Severity.Warn}>${tr.t('notice.noWowPath')}</wt-notice>` : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-notices': WtNotices
  }
}
