import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { CharacterSnapshot, SyncStatus, UpdateState, WarbandBank } from '../../../shared/types'
import type { TranslationKey } from '../../../shared/i18n'
import { WtElement, type WtEvent } from '../element'
import type { IconName } from './Icon'
import { ButtonRole } from '../enums/buttonRole'
import { ControlSize } from '../enums/controlSize'
import { Tab } from '../enums/tab'
import { Command } from '../enums/command'
import { keysOf } from '../model/shortcuts'
import { relativeTime } from '../i18n'
import './Icon'
import './topbar/Brand'
import './topbar/ResetPill'
import './topbar/Search'
import './topbar/WindowControls'
import './ui/Button'
import './ui/Segmented'
import { IconSize } from '../enums/iconSize'

/** Each tab's name and the mark that stands for it when the bar is narrow; the order is the enum's. */
const TABS: Record<Tab, { key: TranslationKey; icon: IconName }> = {
  [Tab.Roster]: { key: 'tab.roster', icon: 'users' },
  [Tab.Tasks]: { key: 'tab.tasks', icon: 'tasks' },
  [Tab.Gold]: { key: 'tab.gold', icon: 'coins' },
  [Tab.Bank]: { key: 'tab.bank', icon: 'bank' },
  [Tab.Renown]: { key: 'tab.renown', icon: 'medal' },
  [Tab.Settings]: { key: 'tab.settings', icon: 'settings' }
}

/**
 * The bar across the top of the window: the mark and the name, the two
 * steps along the trail, the tabs, the search, when the sources were last
 * read, the time to the reset, the re-read button and - the window being
 * frameless - the three window controls.
 *
 * @fires wt-back - One place back along the trail.
 * @fires wt-forward - One place forward again.
 * @fires wt-tab - A tab picked.
 * @fires wt-query - The search's text; bubbles up from `wt-search`.
 * @fires wt-open-hit - A search hit picked; bubbles up from `wt-search`.
 * @fires wt-sync - Re-read the SavedVariables now.
 * @fires wt-install-update - Restart into the downloaded version.
 */
@customElement('wt-top-bar')
export class WtTopBar extends WtElement {
  @property() accessor tab: Tab = Tab.Roster
  /** Whether there is a place to step to; the button is disabled at either end. */
  @property({ type: Boolean, attribute: 'can-back' }) accessor canBack = false
  @property({ type: Boolean, attribute: 'can-forward' }) accessor canForward = false
  @property({ type: Number, attribute: 'last-sync-at' }) accessor lastSyncAt: number | null = null
  @property({ attribute: 'until-reset' }) accessor untilReset = ''
  /** The evenings left before the reset, the figure the player counts in. */
  @property({ type: Number }) accessor evenings = 0
  @property({ attribute: false }) accessor status: SyncStatus | null = null
  @property({ attribute: false }) accessor updateState: UpdateState | null = null
  @property({ type: Boolean }) accessor maximized = false
  @property({ type: Boolean }) accessor busy = false
  /** The place's search text, and what the search goes over. */
  @property() accessor query = ''
  @property({ attribute: false }) accessor characters: CharacterSnapshot[] = []
  @property({ attribute: false }) accessor banks: WarbandBank[] = []
  @property({ type: Boolean, attribute: 'show-account' }) accessor showAccount = false

  protected override willUpdate(): void {
    this.hostClasses({ topbar: true })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { status, updateState: update } = this
    const running = Boolean(status?.running)

    return html`
      <wt-brand></wt-brand>
      <div class="trail-nav">
        <wt-button
          icon="arrowLeft"
          icon-only
          size=${ControlSize.Sm}
          ?disabled=${!this.canBack}
          data-tip=${tr.t('topbar.back', { keys: keysOf(Command.Back, tr) })}
          @click=${() => this.emit('wt-back')}
        ></wt-button>
        <wt-button
          icon="arrowRight"
          icon-only
          size=${ControlSize.Sm}
          ?disabled=${!this.canForward}
          data-tip=${tr.t('topbar.forward', { keys: keysOf(Command.Forward, tr) })}
          @click=${() => this.emit('wt-forward')}
        ></wt-button>
      </div>
      <wt-segmented
        class="tabs"
        .value=${this.tab}
        .options=${Object.values(Tab).map((tab) => ({
          value: tab,
          icon: TABS[tab].icon,
          label: html`<span class="tab-label">${tr.t(TABS[tab].key)}</span>`,
          tip: tr.t('topbar.withKeys', { label: tr.t(TABS[tab].key), keys: keysOf(Command.OpenTab, tr, tab) })
        }))}
        @wt-change=${(event: WtEvent<'wt-change'>) => {
          event.stopPropagation()
          this.emit('wt-tab', event.detail as Tab)
        }}
      ></wt-segmented>
      <wt-search query=${this.query} .characters=${this.characters} .banks=${this.banks} ?show-account=${this.showAccount}></wt-search>
      <div class="spacer"></div>
      <span class="muted tiny last-read"
        ><wt-icon name="clock" size=${IconSize.Xs}></wt-icon>${tr.t('overview.lastRead', {
          time: this.lastSyncAt ? relativeTime(tr, this.lastSyncAt, this.clock) : tr.t('overview.never')
        })}</span
      >
      <wt-reset-pill until=${this.untilReset} evenings=${this.evenings}></wt-reset-pill>
      ${
        update?.downloaded
          ? html`<wt-button
              icon="download"
              tone=${ButtonRole.Primary}
              .label=${html`<span class="action-label">${tr.t('topbar.installUpdate')}</span>`}
              data-tip=${tr.t('topbar.updateReady', { version: update.latestVersion ?? '?' })}
              @click=${() => this.emit('wt-install-update')}
            ></wt-button>`
          : nothing
      }
      <wt-button
        icon="refresh"
        ?spinning=${running}
        .label=${html`<span class="action-label">${running ? tr.t('topbar.rereading') : tr.t('topbar.reread')}</span>`}
        data-tip=${tr.t('topbar.withKeys', { label: tr.t('topbar.reread'), keys: keysOf(Command.Reread, tr) })}
        ?disabled=${this.busy || running}
        @click=${() => this.emit('wt-sync')}
      ></wt-button>
      <wt-window-controls ?maximized=${this.maximized}></wt-window-controls>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-top-bar': WtTopBar
  }
}
