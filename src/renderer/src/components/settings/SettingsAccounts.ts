import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { WtPanel } from '../ui/Panel'
import { CheckboxKind } from '../../enums/checkboxKind'
import '../ui/Checkbox'
import './ToggleRow'
import '../ui/FieldGroup'
import '../Icon'
import '../ui/Hint'
import './ToggleList'
import { IconSize } from '../../enums/iconSize'

/**
 * Which WTF account folders count. A folder switched off takes its
 * characters, its gold and its guild banks out of everything the overview
 * reports.
 *
 * @fires wt-toggle-account - A switch, with the folder name and whether it is now hidden.
 */
@customElement('wt-settings-accounts')
export class WtSettingsAccounts extends WtPanel {
  /** Every WTF account the last read found, switched-off ones included. */
  @property({ attribute: false }) accessor accounts: string[] = []
  @property({ attribute: false }) accessor hiddenAccounts: Set<string> = new Set()
  /** The whole roster, for the count behind each folder. */
  /** Characters per account, the switched-off ones counted too - what a switch takes away. */
  @property({ attribute: false }) accessor accountCharacters: Record<string, number> = {}
  @property({ type: Boolean }) accessor busy = false

  protected override willUpdate(): void {
    const tr = this.tr
    const { accounts, hiddenAccounts, accountCharacters, busy } = this
    /** Accounts still switched on; the hidden set may name folders long gone. */
    const visible = accounts.filter((account) => !hiddenAccounts.has(account)).length

    this.icon = 'folder'
    this.heading = tr.t('settings.accounts.title')
    this.description = tr.t('settings.accounts.body')
    this.content =
      accounts.length === 0
        ? html`<p class="faint">${tr.t('settings.accounts.none')}</p>`
        : html`<wt-toggle-list
              .content=${accounts.map((account) => {
                const off = hiddenAccounts.has(account)
                // The last account standing stays on: an overview with no
                // account at all is empty for a reason nobody would guess.
                return html`<wt-toggle-row
                  ?off=${off}
                  .mark=${html`<wt-icon name="folder" size=${IconSize.Sm}></wt-icon>`}
                  label=${account}
                  .content=${html`<span class="faint tiny"
                      >${tr.plural('settings.accounts.characters', accountCharacters[account] ?? 0)}</span
                    >
                    <wt-checkbox
                      kind=${CheckboxKind.CharSwitch}
                      label=${tr.t('settings.characters.overview')}
                      ?checked=${!off}
                      ?disabled=${busy || (!off && visible <= 1)}
                      @wt-check=${() => this.emit('wt-toggle-account', { account, hidden: !off })}
                    ></wt-checkbox>`}
                ></wt-toggle-row>`
              })}
            ></wt-toggle-list>
            <wt-hint text=${tr.t('settings.accounts.hint')}></wt-hint>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-accounts': WtSettingsAccounts
  }
}
