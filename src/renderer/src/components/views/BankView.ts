import { html, nothing, type TemplateResult } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { Container, WarbandBank } from '../../../../shared/types'
import { relativeTime } from '../../i18n'
import { WtElement, type WtEvent } from '../../element'
import { memoLast } from '../../memo'
import { mergeContainers } from '../../model/inventory'
import { ButtonRole } from '../../enums/buttonRole'
import { SettingsSection } from '../../enums/settingsSection'
import { AnyAccount } from '../../../../shared/enums/anyAccount'
import '../EmptyState'
import '../Inventory'
import '../ui/Select'
import '../ui/Button'
import '../ui/FieldGroup'
import '../Icon'
import { IconSize } from '../../enums/iconSize'

/**
 * The bank tab: the warband bank, tab by tab, as the companion read it at
 * the last visit to the bank. The bank belongs to the account, not to a
 * character, so it is a view of its own beside the gold rather than a
 * section of a character's page; the switcher scopes it to one WTF
 * account the way the gold view's does.
 *
 * @fires wt-account - The account switch, with the folder name or `all`.
 * @fires wt-open-settings - The empty state's button: the setup section, where the companion is installed.
 */
@customElement('wt-bank-view')
export class WtBankView extends WtElement {
  /** The warband bank per WTF account. */
  @property({ attribute: false }) accessor banks: WarbandBank[] = []
  @property({ attribute: false }) accessor accounts: string[] = []
  @property() accessor account: string = AnyAccount.All
  /** The place's search text, from the top bar. */
  @property() accessor query = ''

  // The banks of the account picked, or every one.
  private shownOf = memoLast((banks: WarbandBank[], account: string): WarbandBank[] =>
    account === AnyAccount.All ? banks : banks.filter((bank) => bank.account === account)
  )

  // Each bank as one bag, its tabs folded away, the way a bag addon shows
  // it; named by its account, since two banks on the page are two warbands.
  private tabsOf = memoLast((shown: WarbandBank[]): Container[] =>
    shown.filter((bank) => bank.tabs.length > 0).map((bank) => mergeContainers(bank.tabs, bank.account))
  )

  protected override willUpdate(): void {
    // An empty view is the empty state alone, without the view's own layout.
    this.hostClasses({ 'bank-view': this.tabsOf(this.shownOf(this.banks, this.account)).length > 0 })
  }

  protected override render(): TemplateResult {
    const tr = this.tr
    const { accounts, account } = this
    const shown = this.shownOf(this.banks, account)
    const tabs = this.tabsOf(shown)
    // The oldest read on the page: the picture is only as fresh as that.
    const readAt = shown.reduce<number | null>(
      (oldest, bank) => (bank.updatedAt === null ? oldest : oldest === null ? bank.updatedAt : Math.min(oldest, bank.updatedAt)),
      null
    )

    if (tabs.length === 0) {
      return html`<wt-empty-state icon="bank" heading=${tr.t('bank.empty.title')}>
        <p>${tr.t('bank.empty.body')}</p>
        <div class="row">
          <wt-button
            icon="settings"
            tone=${ButtonRole.Primary}
            label=${tr.t('settings.sources.open')}
            @click=${() => this.emit('wt-open-settings', SettingsSection.Setup)}
          ></wt-button>
        </div>
      </wt-empty-state>`
    }

    return html`
      <div class="view-bar">
        <div class="view-title">
          <wt-icon name="bank" size=${IconSize.Md}></wt-icon>
          <h2>${tr.t('bank.title')}</h2>
        </div>

        ${
          accounts.length > 1
            ? html`<wt-field-group inline icon="users" label=${tr.t('overview.account')}>
                <wt-select
                  .value=${account}
                  .options=${[
                    { value: AnyAccount.All, label: tr.t('overview.account.all') },
                    ...accounts.map((name) => ({ value: name, label: name }))
                  ]}
                  @wt-change=${(event: WtEvent<'wt-change'>) => {
                    event.stopPropagation()
                    this.emit('wt-account', event.detail)
                  }}
                ></wt-select>
              </wt-field-group>`
            : nothing
        }
        ${
          readAt !== null
            ? html`<span class="muted tiny last-read"
                ><wt-icon name="clock" size=${IconSize.Xs}></wt-icon
                >${tr.t('bank.asOf', { time: relativeTime(tr, readAt, this.clock) })}</span
              >`
            : nothing
        }
      </div>

      <wt-inventory .containers=${tabs} query=${this.query}></wt-inventory>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-bank-view': WtBankView
  }
}
