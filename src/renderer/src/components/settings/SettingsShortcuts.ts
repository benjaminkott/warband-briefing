import { html } from 'lit'
import { customElement } from 'lit/decorators.js'
import type { TranslationKey } from '../../../../shared/i18n'
import { WtPanel } from '../ui/Panel'
import { Command } from '../../enums/command'
import { shortcutRows, type ShortcutRow } from '../../model/shortcuts'
import '../ui/Keys'
import '../ui/Table'
import '../ui/Row'
import '../ui/Cell'

/** What each command does, in the player's words. */
const COMMAND_KEYS: Record<Command, TranslationKey> = {
  [Command.Back]: 'shortcut.back',
  [Command.Forward]: 'shortcut.forward',
  [Command.OpenTab]: 'shortcut.openTab',
  [Command.LastTab]: 'shortcut.lastTab',
  [Command.NextTab]: 'shortcut.nextTab',
  [Command.PrevTab]: 'shortcut.prevTab',
  [Command.Reread]: 'shortcut.reread',
  [Command.Search]: 'shortcut.search',
  [Command.ClosePage]: 'shortcut.closePage',
  [Command.PrevCharacter]: 'shortcut.prevCharacter',
  [Command.NextCharacter]: 'shortcut.nextCharacter'
}

/**
 * The keyboard's ways through the app, as a list: each command with its
 * keys. Read-only - the keys are the table in shortcuts.ts, and a tooltip
 * on the bar names the same ones - so a player who looks for them finds
 * them once, here.
 */
@customElement('wt-settings-shortcuts')
export class WtSettingsShortcuts extends WtPanel {
  private actionOf(row: ShortcutRow): string {
    const tr = this.tr
    if (row.command === Command.OpenTab) return tr.t('shortcut.openTab', { tab: tr.t(`tab.${row.tab}` as TranslationKey) })
    return tr.t(COMMAND_KEYS[row.command])
  }

  protected override willUpdate(): void {
    const tr = this.tr
    this.icon = 'keyboard'
    this.heading = tr.t('settings.shortcuts.title')
    this.description = tr.t('settings.shortcuts.body')
    this.content = html`<wt-table
      .columns=${[{ label: tr.t('settings.shortcuts.keys'), className: 'col-keys' }, { label: tr.t('settings.shortcuts.action') }]}
    >
      ${shortcutRows().map(
        (row) =>
          html`<wt-row>
            <wt-cell class="col-keys"
              >${row.strokes.map((stroke, index) => html`${index > 0 ? html`<span class="keys-or">${tr.t('settings.shortcuts.or')}</span>` : ''}<wt-keys .stroke=${stroke}></wt-keys>`)}</wt-cell
            >
            <wt-cell>${this.actionOf(row)}</wt-cell>
          </wt-row>`
      )}
    </wt-table>`
    super.willUpdate()
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'wt-settings-shortcuts': WtSettingsShortcuts
  }
}
